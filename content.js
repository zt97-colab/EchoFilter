function scanAndInjectWarnings() {
  // 🧠 BONUS: Prevent double injection
  if (document.getElementById('ef-warning')) {
    console.log("[EchoFilter] Warning already shown — skipping");
    return;
  }

  chrome.storage.local.get(
    ['linkCheckEnabled', 'langDetectEnabled', 'trustSendersEnabled'],
    ({ linkCheckEnabled = true, langDetectEnabled = true }) => {
      const bodyText = document.body.innerText;
      // 🛠️ FIX #2: Log sender for debugging, fallback to document.title
      let sender = document.querySelector('[email], .gD, .go')?.innerText || document.title || "Unknown";
      console.log("[EchoFilter] Sender:", sender);
      const subject = document.querySelector('h2')?.innerText || "(No Subject)";
      const flagged = [];

      if (langDetectEnabled) {
        [
          { p: /account locked|urgent/i, r: "Urgent language" },
          { p: /http.*@|fake|bonus/i, r: "Suspicious keywords" },
          { p: /free bitcoin|payment issue/i, r: "Scam phrases" },
        ].forEach(({ p, r }) => p.test(bodyText) && flagged.push(r));
      }

      // 🛠️ FIX #1: Only inject into Gmail's main content, not body
      if (flagged.length && !document.getElementById('ef-warning')) {
        const main = document.querySelector('div[role="main"]');
        if (!main) return;

        const original = main.cloneNode(true);
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
          main.innerHTML = '';
          main.appendChild(original);
        };

        chrome.runtime.sendMessage({
          action: 'logThreat',
          data: { subject, sender, reason: flagged.join(', '), threatLevel: 'red' }
        });
      }

      if (linkCheckEnabled) {
        document.querySelectorAll('a').forEach(link => {
          const text = link.innerText;
          const href = link.getAttribute('href');
          if (href && !href.includes(text) && text.length > 2) {
            link.title = `⚠️ Link text doesn't match: ${href}`;
            link.style.borderBottom = "1px dashed red";
          }
        });
      }
    }
  );
}

console.log("[EchoFilter] Content script loaded");

function observeGmailChanges() {
  const target = document.querySelector('div[role="main"]');
  if (!target) {
    console.warn("[EchoFilter] Gmail main view not found.");
    return;
  }

  const observer = new MutationObserver(() => {
    const emailBody = target.innerText || "";
    if (emailBody.length > 20) {
      console.log("[EchoFilter] Email view changed — running scan");
      scanAndInjectWarnings();
    }
  });

  observer.observe(target, {
    childList: true,
    subtree: true,
  });

  console.log("[EchoFilter] Gmail observer started");
}

window.addEventListener("load", () => {
  console.log("[EchoFilter] Waiting to observe Gmail content...");
  setTimeout(observeGmailChanges, 3000); // Give Gmail time to fully load
});
