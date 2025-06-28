let lastScannedEmailContentSignature = null; 

function scanAndInjectWarnings() {
  
  if (document.getElementById('ef-warning')) return;

  const main = document.querySelector('div[role="main"]');
  if (!main) {
    removeEchoFilterBanners(); 
    return;
  }

  const subjectEl = main.querySelector('h2');
  const senderEl = main.querySelector('[email], .gD, .go');

  if (!subjectEl || !senderEl) {
    removeEchoFilterBanners();
    lastScannedEmailContentSignature = null;
    return;
  }

  
  if (document.getElementById('ef-checking')) {
      return;
  }

  
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

        
        if (trustSendersEnabled && trustedSenders.includes(sender)) {
          removeEchoFilterBanners(); 
          showSafeBanner(main); 
          return; 
        }

        
        if (langDetectEnabled) {
          [
            { p: /urgent: your account has been locked|immediate action required|verify your information now/i, r: "Suspicious Urgent Language" },
            { p: /phishing|fraud|scam|unauthorized access|verify account|unexpected reward|million dollar prize|update your banking info/i, r: "Suspicious Keywords" },
            { p: /payment issue|outstanding invoice|unauthorized fund transfer|bitcoin investment|free digital currency/i, r: "Scam Phrases" },
            { p: /\b(?:https?:\/\/[^\s@]+\@[^\s@]+\.[^\s@]+\b)/i, r: "Email Disguised in Link" }
          ].forEach(({ p, r }) => {
              if (p.test(bodyText) && !flagged.includes(r)) { 
                  flagged.push(r);
              }
          });
        }

        
        if (linkCheckEnabled) {
          main.querySelectorAll('a').forEach(link => {
            const text = link.innerText.trim();
            const href = link.getAttribute('href');

            if (!href || href.startsWith('mailto:')) {
                return;
            }

            
            if (text.length < 5 && !text.includes('.')) {
                return;
            }

            let hrefDomain = '';
            try {
                const urlObj = new URL(href);
                hrefDomain = urlObj.hostname;
            } catch (e) {
                
                if (!flagged.includes("Suspicious Link: Invalid URL")) {
                    flagged.push("Suspicious Link: Invalid URL");
                }
                link.title = `⚠️ Invalid link: ${href}`;
                link.style.borderBottom = "1px dashed red";
                return;
            }

            
            if (!href.includes(text) && !text.includes(hrefDomain) && text.length > 5) {
              if (!flagged.includes("Suspicious Link: Text Mismatch with URL")) {
                flagged.push("Suspicious Link: Text Mismatch with URL");
              }
              link.title = `⚠️ Link text doesn't match URL: ${href}`;
              link.style.borderBottom = "1px dashed red";
            }
          });
        }

        
        removeEchoFilterBanners();

        if (flagged.length) {
          
          const warning = document.createElement('div');
          warning.id = 'ef-warning';
          warning.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.98); z-index: 999999;
            font-family: Roboto, sans-serif; color: #856404; border: 3px solid #ffcc00;
            display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
          `;

          
          const reasons = {
            "Suspicious Urgent Language": "This email uses urgent or alarming language, which is common in scams.",
            "Suspicious Keywords": "This email contains keywords often used in phishing or scam attempts.",
            "Scam Phrases": "This email contains phrases frequently found in scams.",
            "Suspicious Link: Invalid URL": "This email contains a link with an invalid or malformed URL.",
            "Suspicious Link: Text Mismatch with URL": "This email contains links where the visible text does not match the actual URL, which is a common phishing tactic."
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
            chrome.storage.local.set({ alerts: alerts.slice(0, 20) }); // Keep last 20
          });
        } else {
          
          showSafeBanner(main);
        }
      }
    );
  }, 200); 
}


function showSafeBanner(mainElement) {
    const safe = document.createElement('div');
    safe.id = 'ef-safe';
    safe.style.cssText = `
      background: #e6ffe6; color: #256029; font-size: 18px; font-weight: 500;
      padding: 18px; border-radius: 8px; margin: 20px auto; text-align: center;
      max-width: 400px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      position: relative; z-index: 999999;
    `;
    safe.innerText = "✅ EchoFilter: No threats detected in this email.";
    mainElement.prepend(safe);
    setTimeout(() => { if (safe) safe.remove(); }, 2500); 
}


function observeGmailChanges() {
  const target = document.querySelector('div[role="main"]');
  if (!target) return;

  const observer = new MutationObserver(() => {
    
    const currentSubjectEl = target.querySelector('h2');
    const currentSenderEl = target.querySelector('[email], .gD, .go');

    if (currentSubjectEl && currentSenderEl) { 
        
        const currentBodyTextSample = target.innerText.substring(0, 500); 
        const currentContentSignature = currentSubjectEl.innerText + "::" +
                                       currentSenderEl.innerText + "::" +
                                       currentBodyTextSample;

        if (currentContentSignature !== lastScannedEmailContentSignature) {
            lastScannedEmailContentSignature = currentContentSignature;
            removeEchoFilterBanners();
            scanAndInjectWarnings();
        }
    } else {
        
        removeEchoFilterBanners();
        lastScannedEmailContentSignature = null;
    }
  });

  
  observer.observe(target, { childList: true, subtree: true });
}



window.addEventListener("load", () => {
 
  setTimeout(() => {
    observeGmailChanges();
    scanAndInjectWarnings(); 
  }, 2000); 
});


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'settingsUpdated') {
    console.log("[EchoFilter] Settings updated. Re-scanning email with new settings...");
    removeEchoFilterBanners(); // Remueve todos los banners antes de re-escanear
    scanAndInjectWarnings();
  }
});


function removeEchoFilterBanners() {
  ['ef-warning', 'ef-safe', 'ef-checking'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}
