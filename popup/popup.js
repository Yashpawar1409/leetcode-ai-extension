// popup/popup.js - Complete Fixed Version
document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const apiKeyInput = document.getElementById('apiKey');
  const saveKeyButton = document.getElementById('saveKey');
  const problemTitle = document.getElementById('problemTitle');
  const problemDifficulty = document.getElementById('problemDifficulty');
  const chatMessages = document.getElementById('chatMessages');
  const userInput = document.getElementById('userInput');
  const sendButton = document.getElementById('sendButton');
  const quickButtons = document.querySelectorAll('.quick-btn');
  const loadingContainer = document.getElementById('loading');
  
  // State
  let problemData = null;
  let geminiApiKey = '';
  
  // Helper Functions =========================================
  
  function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  function addBotMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.innerHTML = markdownToHtml(text);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  function markdownToHtml(text) {
    return text
      .replace(/```(\w*)\n([\s\S]*?)\n```/g, '<pre><code class="$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }
  
  function showLoading(show) {
    loadingContainer.style.display = show ? 'flex' : 'none';
  }
  
  function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  }
  
  // Message Handling =========================================
  
  function fetchProblemDataWithRetry() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "fetchProblemData" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Connection error:", chrome.runtime.lastError);
            // Try once more after delay
            setTimeout(() => {
              chrome.runtime.sendMessage(
                { action: "fetchProblemData" },
                (retryResponse) => resolve(retryResponse)
              );
            }, 500);
          } else {
            resolve(response);
          }
        }
      );
    });
  }
  
  // Initialization ===========================================
  
  function initialize() {
    // Load saved API key
    chrome.storage.sync.get(['geminiApiKey'], function(result) {
      if (result.geminiApiKey) {
        geminiApiKey = result.geminiApiKey;
        apiKeyInput.value = geminiApiKey;
      }
    });
    
    // Save API key handler
    saveKeyButton.addEventListener('click', function() {
      geminiApiKey = apiKeyInput.value.trim();
      if (!geminiApiKey) return;
      
      chrome.storage.sync.set({ geminiApiKey }, function() {
        addBotMessage("API key saved successfully!");
      });
    });
    
    // Fetch problem data
    fetchProblemDataWithRetry().then(response => {
      if (response?.success) {
        problemData = response.data;
        problemTitle.textContent = problemData.title;
        problemDifficulty.textContent = `Difficulty: ${problemData.difficulty}`;
        addBotMessage(`I can help you with "${problemData.title}". Ask me for hints or explanations.`);
      } else {
        addBotMessage(response?.error || "Please open a LeetCode problem page first.");
      }
    });
    
    // Message sending
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    // Quick actions
    quickButtons.forEach(button => {
      button.addEventListener('click', function() {
        userInput.value = this.dataset.prompt;
        sendMessage();
      });
    });
  }
  
  // Message Sending =========================================
  
  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    if (!geminiApiKey) {
      addBotMessage("Please enter and save your Gemini API key first.");
      return;
    }
    
    if (!problemData?.title) {
      addBotMessage("No problem detected. Please open a LeetCode problem page.");
      return;
    }
    
    addUserMessage(message);
    userInput.value = '';
    showLoading(true);
    
    try {
      const response = await callGeminiAPI(message);
      addBotMessage(response);
    } catch (error) {
      addBotMessage(`Error: ${error.message}`);
    } finally {
      showLoading(false);
    }
  }
  
  function callGeminiAPI(message) {
    const prompt = `You are a coding assistant helping solve:
    
Problem: ${problemData.title}
Difficulty: ${problemData.difficulty}
Description: ${stripHtml(problemData.description)}

User Request: ${message}

Provide helpful response with code examples when appropriate.`;
    
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      throw new Error(data.error?.message || "No response from API");
    });
  }
  
  // Start the extension
  initialize();
});