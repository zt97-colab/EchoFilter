function scanAndInjectWarnings() {
  // Prevent double injection
  if (document.getElementById('ef-warning') || document.getElementById('ef-checking')) return;

  const main = document.querySelector('div[role="main"]');
  if (!main) return;

  // Show "Checking..." banner
  const checking = document.createElement('div');
  checking.id = 'ef-checking';
  checking.style.cssText = `
    background: #e0e0e0; color: #333; font-size: 18px; font-weight: 500;
    padding: 18px; border-radius: 8px; margin: 20px auto; text-align: center;
    max-width: 400px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  `;
  checking.innerText = "🔎 EchoFilter: Checking this email for threats...";
  main.prepend(checking);

  setTimeout(() => {
    chrome.storage.local.get(
      ['linkCheckEnabled', 'langDetectEnabled', 'trustSendersEnabled'],
      ({ linkCheckEnabled = true, langDetectEnabled = true }) => {
        const bodyText = document.body.innerText;
        let sender = document.querySelector('[email], .gD, .go')?.innerText || document.title || "Unknown";
        const subject = document.querySelector('h2')?.innerText || "(No Subject)";
        const flagged = [];

        if (langDetectEnabled) {
          [
            { p: /account locked|urgent/i, r: "Urgent language" },
            { p: /http.*@|fake|bonus/i, r: "Suspicious keywords" },
            { p: /free bitcoin|payment issue/i, r: "Scam phrases" },
          ].forEach(({ p, r }) => p.test(bodyText) && flagged.push(r));
        }

        if (linkCheckEnabled) {
          document.querySelectorAll('a').forEach(link => {
            const text = link.innerText;
            const href = link.getAttribute('href');
            if (href && !href.includes(text) && text.length > 2) {
              flagged.push("Suspicious link: " + href);
              link.title = `⚠️ Link text doesn't match: ${href}`;
              link.style.borderBottom = "1px dashed red";
            }
          });
        }

        // Remove "Checking..." banner
        const checkingBanner = document.getElementById('ef-checking');
        if (checkingBanner) checkingBanner.remove();

        if (flagged.length) {
          // Show warning overlay
          const warning = document.createElement('div');
          warning.id = 'ef-warning';
          warning.style.cssText = `
            background: white; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            overflow: auto; padding: 25px; z-index: 999999;
            font-family: Roboto, sans-serif; color: #856404; border: 3px solid #ffcc00;
            display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
          `;
          warning.innerHTML = `
            <div style="font-size: 18px; font-weight: 700; margin-bottom: 12px;">
              ⚠️ This message was hidden due to:
            </div>
            <div style="font-size: 16px; margin-bottom: 20px;">
              <b>${flagged.join(", ")}</b>
            </div>
            <button id="ef-show-btn" style="
              background: #2b7a78; border: none; padding: 12px 25px;
              color: white; font-size: 16px; border-radius: 8px;
              cursor: pointer; user-select: none;
            ">See It Anyway</button>
          `;
          main.innerHTML = '';
          main.appendChild(warning);

          document.getElementById('ef-show-btn').onclick = () => {
            location.reload(); // Reload to restore original content
          };

          // Log to storage for popup
          chrome.storage.local.get({ alerts: [] }, data => {
            const alerts = data.alerts;
            alerts.unshift({ sender, subject, reason: flagged.join(', ') });
            chrome.storage.local.set({ alerts: alerts.slice(0, 20) }); // Keep last 20
          });
        } else {
          // Show "Safe" banner
          const safe = document.createElement('div');
          safe.id = 'ef-safe';
          safe.style.cssText = `
            background: #e6ffe6; color: #256029; font-size: 18px; font-weight: 500;
            padding: 18px; border-radius: 8px; margin: 20px auto; text-align: center;
            max-width: 400px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          `;
          safe.innerText = "✅ EchoFilter: No threats detected in this email.";
          main.prepend(safe);
          setTimeout(() => { if (safe) safe.remove(); }, 2500);
        }
      }
    );
  }, 500); // Simulate scan delay
}

function observeGmailChanges() {
  const target = document.querySelector('div[role="main"]');
  if (!target) return;
  const observer = new MutationObserver(() => {
    const emailBody = target.innerText || "";
    if (emailBody.length > 20) scanAndInjectWarnings();
  });
  observer.observe(target, { childList: true, subtree: true });
}

window.addEventListener("load", () => {
  setTimeout(observeGmailChanges, 3000);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'settingsUpdated') {
    console.log("[EchoFilter] Settings updated. Re-scanning email with new settings...");
    
    const existingWarning = document.getElementById('ef-warning');
    if (existingWarning) existingWarning.remove();
    const existingChecking = document.getElementById('ef-checking');
    if (existingChecking) existingChecking.remove();
    const existingSafe = document.getElementById('ef-safe');
    if (existingSafe) existingSafe.remove();

    scanAndInjectWarnings();
  }
});
