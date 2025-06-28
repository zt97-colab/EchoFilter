function scanAndInjectWarnings() {
  // Prevent double injection
  if (document.getElementById('ef-warning') || document.getElementById('ef-checking')) return;

  const main = document.querySelector('div[role="main"]');
  if (!main) return;

  // Only scan if an email is open (subject and sender exist)
  const subjectEl = main.querySelector('h2');
  const senderEl = main.querySelector('[email], .gD, .go');
  if (!subjectEl || !senderEl) {
    // Not an email view, do not scan or inject banners
    return;
  }

  // Show "Checking..." banner
  const checking = document.createElement('div');
  checking.id = 'ef-checking';
  checking.style.cssText = `
    background: #e0e0e0; color: #333; font-size: 18px; font-weight: 500;
    padding: 18px; border-radius: 8px; margin: 20px auto; text-align: center;
    max-width: 400px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    position: relative; z-index: 999999;
  `;
  checking.innerText = "🔎 EchoFilter: Checking this email for threats...";
  main.prepend(checking);

  

  setTimeout(() => {
    chrome.storage.local.get(
      ['linkCheckEnabled', 'langDetectEnabled', 'trustSendersEnabled', 'trustedSenders'],
      ({ linkCheckEnabled = true, langDetectEnabled = true, trustSendersEnabled = false, trustedSenders = [] }) => {
        const bodyText = main.innerText;
        let sender = senderEl.innerText || document.title || "Unknown";
        const subject = subjectEl.innerText || "(No Subject)";
        const flagged = [];

        // Trust known senders logic
        if (trustSendersEnabled && trustedSenders.includes(sender)) {
          // Remove checking banner and skip scan
          const checkingBanner = document.getElementById('ef-checking');
          if (checkingBanner) checkingBanner.remove();
          return;
        }

        if (langDetectEnabled) {
          [
            { p: /account locked|urgent/i, r: "Urgent language" },
            { p: /http.*@|fake|bonus/i, r: "Suspicious keywords" },
            { p: /free bitcoin|payment issue/i, r: "Scam phrases" },
          ].forEach(({ p, r }) => p.test(bodyText) && flagged.push(r));
        }

        if (linkCheckEnabled) {
          main.querySelectorAll('a').forEach(link => {
            const text = link.innerText;
            const href = link.getAttribute('href');
            if (href && !href.includes(text) && text.length > 2) {
              if (!flagged.includes("Suspicious link detected")) {
                flagged.push("Suspicious link detected");
              }
              link.title = `⚠️ Link text doesn't match: ${href}`;
              link.style.borderBottom = "1px dashed red";
            }
          });
        }

        // Remove "Checking..." banner
        const checkingBanner = document.getElementById('ef-checking');
        if (checkingBanner) checkingBanner.remove();

        if (flagged.length) {
          // Overlay warning (do NOT clear main.innerHTML)
          const warning = document.createElement('div');
          warning.id = 'ef-warning';
          warning.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.98); z-index: 999999;
            font-family: Roboto, sans-serif; color: #856404; border: 3px solid #ffcc00;
            display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
          `;

          // Explanations for each flag
          const reasons = {
            "Urgent language": "This email uses urgent or alarming language, which is common in scams.",
            "Suspicious keywords": "This email contains keywords often used in phishing or scam attempts.",
            "Scam phrases": "This email contains phrases frequently found in scams.",
            "Suspicious link detected": "This email contains links where the text does not match the actual URL, which is a common phishing tactic."
          };

          warning.innerHTML = `
            <div style="font-size: 18px; font-weight: 700; margin-bottom: 12px;">
              ⚠️ This message was hidden due to:
            </div>
            <div style="font-size: 16px; margin-bottom: 20px;">
              <b>${flagged.join(", ")}</b>
            </div>
            <div style="font-size: 14px; color: #555; margin-bottom: 20px; text-align: left; max-width: 400px;">
              ${flagged.map(f => `<div>• <b>${f}:</b> ${reasons[f] || ""}</div>`).join("")}
            </div>
            <button id="ef-show-btn" style="
              background: #2b7a78; border: none; padding: 12px 25px;
              color: white; font-size: 16px; border-radius: 8px;
              cursor: pointer; user-select: none;
            ">See It Anyway</button>
          `;
          document.body.appendChild(warning);

          document.getElementById('ef-show-btn').onclick = () => {
            warning.remove();
          };

          // Log to storage for popup
          chrome.storage.local.get({ alerts: [] }, data => {
            const alerts = data.alerts;
            alerts.unshift({ sender, subject, reason: flagged.join(', ') });
            chrome.storage.local.set({ alerts: [] }); // Keep last 20
          });
        } else {
          // Show "Safe" banner
          const safe = document.createElement('div');
          safe.id = 'ef-safe';
          safe.style.cssText = `
            background: #e6ffe6; color: #256029; font-size: 18px; font-weight: 500;
            padding: 18px; border-radius: 8px; margin: 20px auto; text-align: center;
            max-width: 400px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            position: relative; z-index: 999999;
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
    if (emailBody.length > 20) {
      removeEchoFilterBanners();
      scanAndInjectWarnings();
    }
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

function removeEchoFilterBanners() {
  ['ef-warning', 'ef-safe', 'ef-checking'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}
