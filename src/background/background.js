import * as storageService from "../services/storageService.js";
import { initialize, getSetting } from "../services/settingsService.js";

(async () => await initialize())();

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const notifyWhatsappTabs = debounce(async () => {
  try {
    const tabs = await chrome.tabs.query({
      url: "https://web.whatsapp.com/*",
    });

    if (tabs && tabs.length > 0) {
      const messagePromises = tabs.map(
        (tab) =>
          new Promise((resolve) => {
            chrome.tabs.sendMessage(
              tab.id,
              { action: "settingsUpdated" },
              () => {
                const lastError = chrome.runtime.lastError;
                if (lastError)
                  console.log(
                    `Error sending message to tab ${tab.id}: ${lastError.message}`
                  ); // TODO: Remove

                resolve();
              }
            );
          })
      );

      await Promise.all(messagePromises);
    }
  } catch (error) {
    console.error("Error notifying WhatsApp tabs:", error); // TODO: Remove
  }
}, 500);

/** @type {Object.<string, Function>} */
const messageHandlers = {
  /** @returns {Promise<{success: boolean}>} */
  async openOptionsPage() {
    chrome.runtime.openOptionsPage();
    return { success: true };
  },

  /** @returns {Promise<{syncStorage: Object, localStorage: Object}>} */
  async checkStorage() {
    const syncStorage = await storageService.getAll("sync");
    const localStorage = await storageService.getAll("local");

    return { syncStorage, localStorage };
  },

  /** @returns {Promise<{apiKey: string|null}>} */
  async getApiKey() {
    const transcriptionApiKey = getSetting("transcriptionApiKey", "");
    const processingApiKey = getSetting("processingApiKey", "");
    const legacyApiKey = getSetting("apiKey", "");

    return {
      apiKey: transcriptionApiKey || processingApiKey || legacyApiKey || null,
    };
  },

  /** @returns {Promise<{success: boolean, warning?: string}>} */
  async settingsUpdated() {
    try {
      notifyWhatsappTabs();
      return { success: true };
    } catch (error) {
      console.error("Error in settingsUpdated:", error); // TODO: Remove
      return { success: true, warning: "Error notifying tabs" };
    }
  },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return false;

  const handler = messageHandlers[message.action];
  if (!handler) return false;

  handler(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error(`Error handling ${message.action}:`, error); // TODO: Remove
      sendResponse({ error: error.message });
    });

  return true;
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});
