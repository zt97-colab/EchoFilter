document.addEventListener('DOMContentLoaded', () => {
  const btnLinkCheck = document.getElementById('btnLinkCheck');
  const btnLangDetect = document.getElementById('btnLangDetect');
  const btnTrustSenders = document.getElementById('btnTrustSenders');
  const alertsDiv = document.getElementById('alerts');

  // Function to update button states
  function updateButtonStates() {
    chrome.storage.local.get(['linkCheckEnabled', 'langDetectEnabled'], (data) => {
      btnLinkCheck.classList.toggle('active', data.linkCheckEnabled !== false); // Default to true
      btnLangDetect.classList.toggle('active', data.langDetectEnabled !== false); // Default to true
    });
  }

  // Initial setup
  updateButtonStates();

  // Event listeners for toggle buttons
  btnLinkCheck.addEventListener('click', () => {
    const newState = !btnLinkCheck.classList.contains('active');
    chrome.storage.local.set({ linkCheckEnabled: newState }, () => {
      updateButtonStates();
    });
  });

  btnLangDetect.addEventListener('click', () => {
    const newState = !btnLangDetect.classList.contains('active');
    chrome.storage.local.set({ langDetectEnabled: newState }, () => {
      updateButtonStates();
    });
  });

    // Function to display alerts
    function displayAlerts() {
        chrome.storage.local.get(['alerts'], (data) => {
            const alerts = data.alerts || [];
            alertsDiv.innerHTML = ''; // Clear existing alerts

            if (alerts.length === 0) {
                alertsDiv.textContent = 'No alerts yet.';
                return;
            }

            alerts.forEach(alert => {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'email';
                alertDiv.innerHTML = `
                    <div class="subject">${alert.subject}</div>
                    <div class="sender">From: ${alert.sender}</div>
                    <div class="reason">${alert.reason}</div>
                `;
                alertsDiv.appendChild(alertDiv);
            });
        });
    }
    // Initial display of alerts
    displayAlerts();

    // Listen for changes in storage and update the alerts display
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.alerts) {
            displayAlerts();
        }
    });
});