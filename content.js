function scanAndInjectWarnings() {
  chrome.storage.local.get(['settings'], ({ settings }) => {
    const langCheck = settings?.langCheck ?? true;
    const linkCheck = settings?.linkCheck ?? true;

    const emailBody = document.body.innerText;
    const sender = document.querySelector('[email], .gD, .go')?.innerText || "Unknown";
    const subject = document.querySelector('h2')?.innerText || "(No Subject)";
    const flagged = [];

    if (langCheck) {
      const redFlags = [
        { pattern: /account locked|urgent/i, reason: "Urgent language" },
        { pattern: /http.*@|fake|bonus/i, reason: "Suspicious keywords" },
        { pattern: /free bitcoin|payment issue/i, reason: "Scam phrases" },
      ];

      redFlags.forEach(({ pattern, reason }) => {
        if (pattern.test(emailBody)) flagged.push(reason);
      });
    }

    if (flagged.length) {
      const warning = document.createElement("div");
      warning.innerHTML = `
        <div style="background:#fff3cd; color:#856404; border:1px solid #ffeeba; padding:10px; margin:10px 0; font-family:Roboto">
          ⚠️ This message was hidden due to: <b>${flagged.join(", ")}</b><br>
          <button id="ef-show" style="margin-top:5px">See Anyway</button>
        </div>
      `;
      const container = document.body;
      const original = container.cloneNode(true);
      container.innerHTML = "";
      container.appendChild(warning);

      document.getElementById("ef-show").onclick = () => {
        container.innerHTML = "";
        container.appendChild(original);
      };

      chrome.runtime.sendMessage({
        action: 'logThreat',
        data: {
          subject,
          sender,
          reason: flagged.join(', '),
          threatLevel: 'red'
        }
      });
    }

    if (linkCheck) {
      document.querySelectorAll('a').forEach((link) => {
        const display = link.innerText;
        const href = link.getAttribute('href');
        if (href && !href.includes(display) && display.length > 2) {
          link.setAttribute('title', `⚠️ Link text doesn't match: ${href}`);
          link.style.borderBottom = "1px dashed red";
        }
      });
    }
  });

  
}
