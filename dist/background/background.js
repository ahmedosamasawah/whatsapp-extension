(function () {
  'use strict';

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") chrome.runtime.openOptionsPage();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "openOptionsPage") {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
    }

    if (message.action === "verifyApiKey") {
      verifyApiKey(message.apiKey)
        .then((result) => {
          if (result.valid) {
            chrome.storage.sync.set({ openai_api_key: message.apiKey });
            chrome.storage.local.set({ openai_api_key: message.apiKey });
          }
          sendResponse(result);
        })
        .catch((error) => sendResponse({ valid: false, error: error.message }));

      return true;
    }

    if (message.action === "checkStorage") {
      chrome.storage.sync.get(null, function (syncItems) {
        chrome.storage.local.get(null, function (localItems) {
          sendResponse({
            syncStorage: syncItems,
            localStorage: localItems,
          });
        });
      });
      return true;
    }

    if (message.action === "getApiKey") {
      chrome.storage.local.get(["openai_api_key"], function (localItems) {
        if (localItems.openai_api_key)
          sendResponse({ apiKey: localItems.openai_api_key });
        else {
          chrome.storage.sync.get(["openai_api_key"], function (syncItems) {
            if (syncItems.openai_api_key) {
              chrome.storage.local.set({
                openai_api_key: syncItems.openai_api_key,
              });
              sendResponse({ apiKey: syncItems.openai_api_key });
            } else sendResponse({ apiKey: null });
          });
        }
      });
      return true;
    }

    if (message.action === "settingsUpdated") {
      console.log("Settings updated, notifying tabs");
      chrome.tabs.query({ url: "https://web.whatsapp.com/*" }, (tabs) => {
        tabs.forEach((tab) =>
          chrome.tabs.sendMessage(tab.id, { action: "settingsUpdated" })
        );
      });

      sendResponse({ success: true });
    }
  });

  /** @param {string} apiKey */
  async function verifyApiKey(apiKey) {
    if (!apiKey) return { valid: false, error: "API key is empty" };

    if (!apiKey.startsWith("sk-"))
      return { valid: false, error: "Invalid API key format" };

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
  }

  chrome.storage.sync.get(["openai_api_key"], function (result) {
    if (result.openai_api_key)
      chrome.storage.local.set({ openai_api_key: result.openai_api_key });
  });

})();
//# sourceMappingURL=background.js.map
