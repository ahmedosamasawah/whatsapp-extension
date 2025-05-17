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
  const tabs = await chrome.tabs.query({
    url: "https://web.whatsapp.com/*",
  });

  if (tabs && tabs.length > 0) {
    const messagePromises = tabs.map(
      (tab) =>
        new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { action: "settingsUpdated" }, () => {
            const lastError = chrome.runtime.lastError;
            if (lastError)
              console.log(
                `Error sending message to tab ${tab.id}: ${lastError.message}`
              ); // TODO: Remove

            resolve();
          });
        })
    );

    await Promise.all(messagePromises);
  }
}, 500);

const messageHandlers = {
  async openOptionsPage() {
    chrome.runtime.openOptionsPage();
    return { success: true };
  },

  async checkStorage() {
    const syncStorage = await storageService.getAll("sync");
    const localStorage = await storageService.getAll("local");

    return { syncStorage, localStorage };
  },

  async getApiKey() {
    const transcriptionApiKey = getSetting("transcriptionApiKey", "");
    const processingApiKey = getSetting("processingApiKey", "");

    return {
      apiKey: transcriptionApiKey || processingApiKey || null,
    };
  },

  async settingsUpdated() {
    try {
      notifyWhatsappTabs();
      return { success: true };
    } catch (error) {
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
      sendResponse({ error: error.message });
    });

  return true;
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});
