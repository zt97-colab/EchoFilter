function scanAndInjectWarnings() {
  // Prevent double injection
  if (document.getElementById('ef-warning') || document.getElementById('ef-checking')) {
    console.log("[EchoFilter] Warning or check already shown — skipping");
    return;
  }

  const main = document.querySelector('div[role="main"]');
  if (!main) {
    console.warn("[EchoFilter] Gmail main view not found.");
    return;
  }

  // Show "Checking email..." banner
  const checking = document.createElement('div');
  checking.id = 'ef-checking';
  checking.style.cssText = `
    background: #e0e0e0; color: #333; font-size: 18px; font-weight: 500;
    padding: 18px; border-radius: 8px; margin: 20px auto; text-align: center;
    max-width: 400px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  `;
  checking.innerText = "🔎 EchoFilter: Checking this email for threats...";
  main.prepend(checking);

  chrome.storage.local.get(
    ['linkCheckEnabled', 'langDetectEnabled', 'trustSendersEnabled'],
    ({ linkCheckEnabled = true, langDetectEnabled = true }) => {
      const bodyText = main.innerText || "";
      let sender = document.querySelector('[email], .gD, .go')?.innerText || document.title || "Unknown";
      const subject = document.querySelector('h2')?.innerText || "(No Subject)";
      const flagged = [];

      if (langDetectEnabled) {
        [
          { p: /account locked|urgent action required|verify your identity/i, r: "🔴 Urgent language detected" },
          { p: /free bitcoin|claim your prize|click here now/i, r: "🔴 Scam phrases detected" },
          { p: /investment opportunity|get rich quick|double your money/i, r: "⚠️ Suspicious investment content" },
          { p: /special offer|exclusive deal|limited time only|48 hours left|save 50%/i, r: "🟡 Promotional / pressure tactics" }
        ].forEach(({ p, r }) => {
          if (p.test(bodyText)) flagged.push(r);
        });
      }

      // Remove checking banner
      const checkingBanner = document.getElementById('ef-checking');
      if (checkingBanner) checkingBanner.remove();

      if (flagged.length && !document.getElementById('ef-warning')) {
        // Clone original content so we can restore on "See It Anyway"
        const original = main.cloneNode(true);

        // Create overlay container that blocks the email
        const warning = document.createElement('div');
        warning.id = 'ef-warning';
        warning.style.cssText = `
          background: white;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          overflow: auto;
          padding: 40px 20px;
          z-index: 999999;
          font-family: Roboto, sans-serif;
          color: #856404;
          border: 3px solid #ffcc00;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          box-sizing: border-box;
        `;

        warning.innerHTML = `
          <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 20px; color: #b94a48;">
            ⚠️ This email is blocked due to suspicious content
          </h2>
          <p style="font-size: 18px; margin-bottom: 24px;">
            Reasons detected:
          </p>
          <ul style="list-style: none; padding: 0; font-size: 16px; color: #c00; margin-bottom: 36px;">
            ${flagged.map(reason => `<li>• ${reason}</li>`).join('')}
          </ul>
          <button id="ef-show-btn" style="
            background-color: #2b7a78;
            border: none;
            color: white;
            font-size: 18px;
            padding: 14px 30px;
            border-radius: 8px;
            cursor: pointer;
            user-select: none;
          ">See It Anyway</button>
        `;

        // Clear email content and add the warning overlay
        main.innerHTML = '';
        main.appendChild(warning);

        // On button click, restore original email content
        document.getElementById('ef-show-btn').onclick = () => {
          main.innerHTML = '';
          main.appendChild(original);
        };

        // Log the threat for storage
        chrome.runtime.sendMessage({
          action: 'logThreat',
          data: { subject, sender, reason: flagged.join(', '), threatLevel: 'red' }
        });
      } else if (!flagged.length) {
        // Optionally show safe banner for a moment
        const safe = document.createElement('div');
        safe.id = 'ef-safe';
        safe.style.cssText = `
          background: #e6ffe6;
          color: #256029;
          font-size: 18px;
          font-weight: 500;
          padding: 18px;
          border-radius: 8px;
          margin: 20px auto;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000000;
        `;
        safe.innerText = "✅ EchoFilter: No threats detected in this email.";
        document.body.appendChild(safe);
        setTimeout(() => safe.remove(), 2500);
      }

      // Link check (optional)
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
