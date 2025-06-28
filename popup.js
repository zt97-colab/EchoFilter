chrome.storage.local.get(['alerts'], function(data) {
  const alerts = data.alerts || [];
  const container = document.getElementById('alerts');
  alerts.slice(0, 5).forEach(email => {
    const div = document.createElement('div');
    div.className = 'email';
    div.innerHTML = `
      <h4>${email.subject}</h4>
      <div class='${email.threatLevel}'>${email.reason}</div>
      <small>From: ${email.sender}</small>
    `;
    container.appendChild(div);
  });
});

document.querySelectorAll('input').forEach((el) => {
  el.addEventListener('change', () => {
    chrome.storage.local.set({
      settings: {
        linkCheck: document.getElementById('toggleLinks').checked,
        langCheck: document.getElementById('toggleLang').checked,
        whitelist: document.getElementById('toggleWhitelist').checked
      }
    });
  });
});