// Function to scan for and inject warnings
function scanAndInjectWarnings() {
  chrome.storage.local.get(
    ['linkCheckEnabled', 'langDetectEnabled', 'trustSendersEnabled'],
    ({ linkCheckEnabled = true, langDetectEnabled = true }) => {
      const bodyText = document.body.innerText;
      const sender = document.querySelector('[email], .gD, .go')?.innerText || "Unknown";
      const subject = document.querySelector('h2')?.innerText || "(No Subject)";
      const flaggedReasons = [];
      let threatLevel = 'green'; // Default to green (safe)

      // Language Detection (Rule-based)
      if (langDetectEnabled) {
        const scamPatterns = [
          { p: /account locked|urgent/i, r: "Urgent language" },
          { p: /http.*@|fake|bonus/i, r: "Suspicious keywords" },
          { p: /free bitcoin|payment issue/i, r: "Scam phrases" },
        ];

        scamPatterns.forEach(({ p, r }) => {
          if (p.test(bodyText)) {
            flaggedReasons.push(r);
            threatLevel = 'yellow'; // Change to yellow if any suspicious language is found
          }
        });
      }

      // Check for suspicious links and sender (More advanced checks can be added)
      if (linkCheckEnabled) {
        document.querySelectorAll('a').forEach(link => {
          const text = link.innerText;
          const href = link.getAttribute('href');
          if (href && !href.includes(text) && text.length > 2) {
            link.title = `⚠️ Link text doesn't match: ${href}`;
            link.style.borderBottom = "1px dashed red";
            flaggedReasons.push("Suspicious link");
            threatLevel = 'red'; // If a suspicious link is found, mark as red
          }
        });
      }

      if (flaggedReasons.length > 0 && !document.getElementById('ef-warning-container')) {
        // Email Content Handling
        const originalContent = document.body.innerHTML; // Store the original content
        const container = document.body;
        // Create the warning banner container
        const warningContainer = document.createElement('div');
        warningContainer.id = 'ef-warning-container';
        warningContainer.style.cssText = `
          font-family: 'Roboto', sans-serif;
          margin-bottom: 10px;
        `;

        // Create the warning banner
        const warningBanner = document.createElement('div');
        warningBanner.className = `echofilter-warning-banner ${threatLevel}`;
        warningBanner.innerHTML = `
          <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">
            ⚠️ This message was hidden due to:
          </div>
          <div style="font-size: 14px; margin-bottom: 8px;">
            ${flaggedReasons.join(", ")}
          </div>
          <button id="ef-show-btn">See Anyway</button>
        `;
        warningContainer.appendChild(warningBanner);
        container.insertBefore(warningContainer, container.firstChild); // Insert the banner at the beginning
        // Create the placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'echofilter-placeholder';
        placeholder.innerText = "This email has been hidden by EchoFilter to protect you from potential threats. Click 'See Anyway' to view the content.";
        placeholder.style.cursor = "pointer";
        container.innerHTML = ''; // Clear the original content
        container.appendChild(warningContainer);
        container.appendChild(placeholder); // Add the placeholder

        document.getElementById('ef-show-btn').onclick = () => {
          container.innerHTML = '';
          container.appendChild(warningContainer); // Re-add the banner
          container.insertAdjacentHTML('beforeend', originalContent); // Restore the original content

        };

        chrome.runtime.sendMessage({
          action: 'logThreat',
          data: {
            subject,
            sender,
            reason: flaggedReasons.join(', '),
            threatLevel
          }
        });
      }
    }
  );
}

// Call the function to scan and inject warnings when the content script is loaded
scanAndInjectWarnings();