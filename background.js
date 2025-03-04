// Initialize default settings
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.get(['whitelistedDomains', 'serverUrl'], function(data) {
      // Initialize whitelist if not set
      if (!data.whitelistedDomains) {
        chrome.storage.sync.set({
          'whitelistedDomains': []
        });
      }
      
      // Initialize server URL if not set
      if (!data.serverUrl) {
        chrome.storage.sync.set({
          'serverUrl': 'http://localhost:5000'
        });
      }
    });
  });
  
  // Listen for tab updates to reprocess content when a page is loaded
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      // Execute content script
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      })
      .catch(error => console.error("Error executing content script:", error));
    }
  });