(function () {
  'use strict';

  // Background script for WhatsApp AI Transcriber

  // Listen for extension installation or update
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      // Open options page on install
      chrome.runtime.openOptionsPage();
    }
  });

  // Listen for messages from content scripts or popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background received message:", message.action);

    // Handle opening options page
    if (message.action === "openOptionsPage") {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
    }

    // Handle API key verification
    if (message.action === "verifyApiKey") {
      verifyApiKey(message.apiKey)
        .then((result) => {
          if (result.valid) {
            // Save to both sync and local storage
            chrome.storage.sync.set({ openai_api_key: message.apiKey });
            chrome.storage.local.set({ openai_api_key: message.apiKey });
            console.log("API key saved to both sync and local storage");
          }
          sendResponse(result);
        })
        .catch((error) => sendResponse({ valid: false, error: error.message }));

      return true; // Keep channel open for async response
    }

    // Add a diagnostic message handler to check storage directly
    if (message.action === "checkStorage") {
      console.log("Checking storage contents...");
      chrome.storage.sync.get(null, function (syncItems) {
        console.log("Sync storage items:", syncItems);
        chrome.storage.local.get(null, function (localItems) {
          console.log("Local storage items:", localItems);
          sendResponse({
            syncStorage: syncItems,
            localStorage: localItems,
          });
        });
      });
      return true; // Keep channel open for async response
    }

    // Return API key directly to content script
    if (message.action === "getApiKey") {
      console.log("Getting API key from storage...");
      chrome.storage.local.get(["openai_api_key"], function (localItems) {
        if (localItems.openai_api_key) {
          console.log("Found API key in local storage");
          sendResponse({ apiKey: localItems.openai_api_key });
        } else {
          chrome.storage.sync.get(["openai_api_key"], function (syncItems) {
            if (syncItems.openai_api_key) {
              console.log("Found API key in sync storage, copying to local");
              chrome.storage.local.set({
                openai_api_key: syncItems.openai_api_key,
              });
              sendResponse({ apiKey: syncItems.openai_api_key });
            } else {
              console.log("No API key found in either storage");
              sendResponse({ apiKey: null });
            }
          });
        }
      });
      return true; // Keep channel open for async response
    }

    // Handle settings update notification
    if (message.action === "settingsUpdated") {
      console.log("Settings updated, notifying tabs");
      // Notify all WhatsApp tabs about the change
      chrome.tabs.query({ url: "https://web.whatsapp.com/*" }, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, { action: "settingsUpdated" });
        });
      });

      sendResponse({ success: true });
    }
  });

  /**
   * Verify if an OpenAI API key is valid
   * @param {string} apiKey - The API key to verify
   * @returns {Promise<Object>} - Results of the verification
   */
  async function verifyApiKey(apiKey) {
    if (!apiKey) {
      return { valid: false, error: "API key is empty" };
    }

    if (!apiKey.startsWith("sk-")) {
      return { valid: false, error: "Invalid API key format" };
    }

    try {
      // Make a lightweight request to OpenAI to check if the key is valid
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { valid: false, error: error.error.message || "Invalid API key" };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message || "Network error" };
    }
  }

  // When the background script loads, check sync storage for API key and copy to local
  chrome.storage.sync.get(["openai_api_key"], function (result) {
    if (result.openai_api_key) {
      console.log("Found API key in sync storage, copying to local storage");
      chrome.storage.local.set({ openai_api_key: result.openai_api_key });
    }
  });

})();
//# sourceMappingURL=background.js.map
