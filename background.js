chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ alerts: [] });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'logThreat') {
    chrome.storage.local.get(['alerts'], (data) => {
      const alerts = data.alerts || [];
      alerts.unshift({ ...msg.data });
      chrome.storage.local.set({ alerts });
    });
  }
});