function scanAndInjectWarnings() {
  chrome.storage.local.get(
    ['linkCheckEnabled', 'langDetectEnabled', 'trustSendersEnabled'],
    ({ linkCheckEnabled = true, langDetectEnabled = true }) => {
      const bodyText = document.body.innerText;
      const sender = document.querySelector('[email], .gD, .go')?.innerText || "Unknown";
      const subject = document.querySelector('h2')?.innerText || "(No Subject)";
      const flagged = [];

      if (langDetectEnabled) {
        [
          { p: /account locked|urgent/i, r: "Urgent language" },
          { p: /http.*@|fake|bonus/i, r: "Suspicious keywords" },
          { p: /free bitcoin|payment issue/i, r: "Scam phrases" },
        ].forEach(({ p, r }) => p.test(bodyText) && flagged.push(r));
      }

      if (flagged.length && !document.getElementById('ef-warning')) {
        const container = document.body;
        const original = container.cloneNode(true);
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

        container.innerHTML = '';
        container.appendChild(warning);

        document.getElementById('ef-show-btn').onclick = () => {
          container.innerHTML = '';
          container.appendChild(original);
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
