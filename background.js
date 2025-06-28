// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ alerts: [] });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'logThreat') {
    chrome.storage.local.get(['alerts'], (data) => {
      const alerts = data.alerts || [];
      alerts.unshift({ ...msg.data }); // Add the new alert to the beginning
      // Keep only the 5 most recent alerts
      if (alerts.length > 5) {
          alerts.length = 5;
      }
      chrome.storage.local.set({ alerts }, () => {
        sendResponse({ status: "success" });
      });
    });
    // Return true to keep message channel open for async sendResponse
    return true;
  }
});