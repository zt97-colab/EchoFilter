document.addEventListener('DOMContentLoaded', () => {
  const alertsDiv = document.getElementById('alerts');
  const btnLinkCheck = document.getElementById('btnLinkCheck');
  const btnLangDetect = document.getElementById('btnLangDetect');
  const btnTrustSenders = document.getElementById('btnTrustSenders');

  // State holders for toggles
  let linkCheckEnabled = true;
  let langDetectEnabled = true;
  let trustSendersEnabled = false;

  // Load alerts from storage and render
  function loadAlerts() {
    chrome.storage.local.get({ alerts: [] }, data => {
      const alerts = data.alerts;
      if (!alerts.length) {
        alertsDiv.textContent = 'No flagged emails detected yet.';
        return;
      }
      alertsDiv.innerHTML = '';
      alerts.forEach(({ sender, subject, reason }) => {
        const emailDiv = document.createElement('div');
        emailDiv.className = 'email';
        emailDiv.innerHTML = `
          <div class="subject">${subject}</div>
          <div class="sender">From: ${sender}</div>
          <div class="reason">Reason: ${reason}</div>
        `;
        alertsDiv.appendChild(emailDiv);
      });
    });
  }

  // Update button styles based on state
  function updateButtons() {
    btnLinkCheck.classList.toggle('active', !linkCheckEnabled);
    btnLangDetect.classList.toggle('active', !langDetectEnabled);
    btnTrustSenders.classList.toggle('active', trustSendersEnabled);
  }

  // Save settings and notify content scripts
  function saveSettings() {
    chrome.storage.local.set({
      linkCheckEnabled,
      langDetectEnabled,
      trustSendersEnabled
    }, () => {
      chrome.tabs.query({ url: '*://mail.google.com/*' }, tabs => {
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'settingsUpdated',
            linkCheckEnabled,
            langDetectEnabled,
            trustSendersEnabled
          });
        }
      });
    });
  }

  // Button click handlers to toggle states
  btnLinkCheck.addEventListener('click', () => {
    linkCheckEnabled = !linkCheckEnabled;
    updateButtons();
    saveSettings();
  });

  btnLangDetect.addEventListener('click', () => {
    langDetectEnabled = !langDetectEnabled;
    updateButtons();
    saveSettings();
  });

  btnTrustSenders.addEventListener('click', () => {
    trustSendersEnabled = !trustSendersEnabled;
    updateButtons();
    saveSettings();
  });

  // Load settings from storage and initialize UI
  chrome.storage.local.get({
    linkCheckEnabled: true,
    langDetectEnabled: true,
    trustSendersEnabled: false
  }, data => {
    linkCheckEnabled = data.linkCheckEnabled;
    langDetectEnabled = data.langDetectEnabled;
    trustSendersEnabled = data.trustSendersEnabled;
    updateButtons();
    loadAlerts();
  });
});
