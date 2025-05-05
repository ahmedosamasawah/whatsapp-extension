chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openOptionsPage") {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return false;
  }

  if (message.action === "verifyApiKey") {
    verifyApiKey(message.apiKey)
      .then((result) => {
        if (result.valid) {
          chrome.storage.sync.set({ openai_api_key: message.apiKey }, () => {
            chrome.storage.local.set({ openai_api_key: message.apiKey }, () => {
              sendResponse(result);
            });
          });
        } else {
          sendResponse(result);
        }
      })
      .catch((error) => sendResponse({ valid: false, error: error.message }));
    return true;
  }

  if (message.action === "checkStorage") {
    chrome.storage.sync.get(null, function (syncItems) {
      chrome.storage.local.get(null, function (localItems) {
        try {
          sendResponse({
            syncStorage: syncItems,
            localStorage: localItems,
          });
        } catch (error) {
          console.error("Error sending response:", error);
        }
      });
    });
    return true;
  }

  if (message.action === "getApiKey") {
    chrome.storage.local.get(["openai_api_key"], function (localItems) {
      if (localItems.openai_api_key) {
        try {
          sendResponse({ apiKey: localItems.openai_api_key });
        } catch (error) {
          console.error("Error sending response:", error);
        }
      } else {
        chrome.storage.sync.get(["openai_api_key"], function (syncItems) {
          try {
            if (syncItems.openai_api_key) {
              chrome.storage.local.set({
                openai_api_key: syncItems.openai_api_key,
              });
              sendResponse({ apiKey: syncItems.openai_api_key });
            } else {
              sendResponse({ apiKey: null });
            }
          } catch (error) {
            console.error("Error sending response:", error);
          }
        });
      }
    });
    return true;
  }

  if (message.action === "settingsUpdated") {
    try {
      chrome.tabs.query({ url: "https://web.whatsapp.com/*" }, (tabs) => {
        try {
          if (tabs && tabs.length > 0) {
            tabs.forEach((tab) => {
              try {
                chrome.tabs.sendMessage(
                  tab.id,
                  { action: "settingsUpdated" },
                  () => {
                    const lastError = chrome.runtime.lastError;
                    if (lastError) {
                      console.log(
                        `Error sending message to tab ${tab.id}: ${lastError.message}`
                      );
                    }
                  }
                );
              } catch (tabError) {
                console.log(`Error in tab message: ${tabError.message}`);
              }
            });
          }

          sendResponse({ success: true });
        } catch (innerError) {
          console.error("Error processing tabs:", innerError);
          sendResponse({ success: true, warning: "Error notifying tabs" });
        }
      });
    } catch (outerError) {
      console.error("Error in tabs.query:", outerError);
      sendResponse({ success: true, warning: "Error querying tabs" });
    }
    return true;
  }

  return false;
});

/** @param {string} apiKey */
async function verifyApiKey(apiKey) {
  if (!apiKey) return { valid: false, error: "API key is empty" };

  if (!apiKey.startsWith("sk-"))
    return { valid: false, error: "Invalid API key format" };

  try {
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

chrome.storage.sync.get(["openai_api_key"], function (result) {
  if (result.openai_api_key)
    chrome.storage.local.set({ openai_api_key: result.openai_api_key });
});
