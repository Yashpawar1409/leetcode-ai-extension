// content.js - Fixed Version
console.log("LeetCode Assistant content script loaded");

function getProblemData() {
  try {
    // Check URL first

    // if (!/leetcode\.com\/problems\/[^/]+\/?$/.test(window.location.href)) {
    //   return { success: false, error: "Not a problem page" };
    // }

    if (!window.location.href.match(/leetcode\.com\/problems\/[^/]+\/?/i)) {
        sendResponse({ success: false, error: "Not a problem page" });
        return;
      }

    // Try multiple selector patterns for title
    const titleSelectors = [
      'div.text-title-large', // New UI
      'div[data-cy="question-title"]', // Old UI
      'a[href*="/problems/"]' // Fallback
    ];
    
    const descriptionSelectors = [
      '[data-track-load="description_content"]', // New UI
      'div._1l1MA', // Alternate UI
      'div[data-cy="question-description"]' // Old UI
    ];
    
    const difficultySelectors = [
      'div.text-difficulty-easy, div.text-difficulty-medium, div.text-difficulty-hard',
      'div[diff]'
    ];

    const problemTitle = findFirstExistingElement(titleSelectors)?.textContent?.trim();
    const problemDescription = findFirstExistingElement(descriptionSelectors)?.innerHTML;
    const difficulty = findFirstExistingElement(difficultySelectors)?.textContent?.trim();

    if (!problemTitle) {
      return { success: false, error: "Could not find problem title" };
    }

    return {
      success: true,
      data: {
        title: problemTitle,
        description: problemDescription || "No description found",
        difficulty: difficulty || "Unknown",
        url: window.location.href
      }
    };
  } catch (error) {
    console.error("Error getting problem data:", error);
    return { success: false, error: error.message };
  }
}

function findFirstExistingElement(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getProblemData") {
    sendResponse(getProblemData());
  }
  return true;
});