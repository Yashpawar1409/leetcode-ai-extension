// background.js - Fixed Version
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchProblemData") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) {
        sendResponse({ success: false, error: "No active tab found" });
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "getProblemData" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Background error:", chrome.runtime.lastError);
            sendResponse({ 
              success: false, 
              error: "Make sure you're on a LeetCode problem page and refresh it"
            });
          } else {
            sendResponse(response || { 
              success: false, 
              error: "No response from content script" 
            });
          }
        }
      );
    });
    return true;
  }
});