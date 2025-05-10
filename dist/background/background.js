(function () {
  'use strict';

  /** @param {Object} config @returns {Object} */
  function createBaseProvider(config = {}) {
    return {
      config,
      verifyApiKey: async (apiKey) => {
        throw new Error("Function 'verifyApiKey' must be implemented");
      },

      transcribeAudio: async (audioBlob, options = {}) => {
        throw new Error("Function 'transcribeAudio' must be implemented");
      },

      processTranscription: async (transcription, options = {}) => {
        throw new Error("Function 'processTranscription' must be implemented");
      },
    };
  }

  /** @param {string} template @param {Object} variables @returns {string} */
  function renderTemplate(template, variables = {}) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      return variables[trimmedKey] !== undefined ? variables[trimmedKey] : match;
    });
  }

  const defaultTemplates = {
    openai: {
      processing: `You are an AI assistant that processes WhatsApp voice message transcriptions. Process the following transcript following these exact instructions:

Your response MUST follow this exact format with FOUR sections separated by '----':
[original transcript] ---- [grammatically corrected version in {{language}}]\n[English translation] ---- [concise summary in English] ---- [natural reply in {{language}}]

Instructions for each section:
1. First section: Copy the original transcript exactly as provided.
2. Second section: Create a grammatically correct, polished version of the transcript in {{language}}. Remove filler words, false starts, and repetitions. Maintain the original meaning. Then, on the next line, provide the English translation.
3. Third section: Write a concise 1-2 sentence summary in English that captures the core message and key information from the transcript.
4. Fourth section: Suggest a natural, conversational reply in {{language}} that directly addresses the main points or questions from the message. The reply should sound like something a real person would say in a WhatsApp conversation (not formal or robotic).

Use ONLY '----' as separators with no additional text, headers, or explanations.

TRANSCRIPT:
{{transcription}}`,
    },
  };

  /** @param {string} errorText @param {string} defaultMessage @returns {Object} */
  function parseOpenAIError(
    errorText,
    defaultMessage = "API request failed"
  ) {
    try {
      const errorData = JSON.parse(errorText);

      if (!errorData.error)
        return {
          message: defaultMessage,
          type: "unknown",
          userMessage:
            "There was an error processing your request. Please try again.",
        };

      switch (errorData.error.type) {
        case "insufficient_quota":
          return {
            message:
              "Your OpenAI API key has reached its usage limit. Please check your billing details or use a different API key.",
            type: "quota_exceeded",
            userMessage:
              "Your API key has reached its usage limit. Please check your OpenAI account billing details or update your API key.",
          };

        case "invalid_request_error":
          return {
            message: errorData.error.message || "Invalid request to the API",
            type: "invalid_request",
            userMessage:
              "There was a problem with the request. Please check your settings.",
          };

        case "authentication_error":
          return {
            message: "Authentication failed. Please check your API key.",
            type: "authentication",
            userMessage:
              "Your API key appears to be invalid. Please check your settings.",
          };

        default:
          return {
            message: errorData.error.message || defaultMessage,
            type: errorData.error.type || "unknown",
            userMessage:
              "There was an error processing your request. Please try again.",
          };
      }
    } catch (parseError) {
      return {
        message: errorText || defaultMessage,
        type: "unknown",
        userMessage:
          "There was an error processing your request. Please try again.",
      };
    }
  }

  /** @param {Object} config @returns {Object} */
  function createOpenAIProvider(config = {}) {
    const provider = {
      ...createBaseProvider(config),
      apiKey: config.apiKey,
      apiUrl: "https://api.openai.com",
      transcriptionModel: config.transcriptionModel || "whisper-1",
      processingModel: config.processingModel || "gpt-4o",

      verifyApiKey: async (apiKey) => {
        if (!apiKey) return { valid: false, error: "API key is empty" };
        if (!apiKey.startsWith("sk-"))
          return { valid: false, error: "Invalid API key format" };

        try {
          const response = await fetch(`${provider.apiUrl}/v1/models`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            const errorData = parseOpenAIError(errorText, "Invalid API key");

            return {
              valid: false,
              error: errorData.message,
            };
          }

          return { valid: true };
        } catch (error) {
          return { valid: false, error: error.message || "Network error" };
        }
      },

      transcribeAudio: async (audioBlob, options = {}) => {
        if (!provider.apiKey) throw new Error("API key not configured");

        const formData = new FormData();
        formData.append("model", provider.transcriptionModel);
        formData.append(
          "file",
          new File([audioBlob], "audio.ogg", { type: audioBlob.type })
        );

        if (options.language && options.language !== "auto")
          formData.append("language", options.language);

        const response = await fetch(
          `${provider.apiUrl}/v1/audio/transcriptions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${provider.apiKey}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          const errorData = parseOpenAIError(errorText, "Transcription failed");
          throw new Error(errorData.message);
        }

        const result = await response.json();
        return result.text;
      },

      processTranscription: async (transcription, options = {}) => {
        if (!provider.apiKey) throw new Error("API key not configured");

        const promptTemplate =
          options.promptTemplate || defaultTemplates.openai.processing;

        const promptContent = renderTemplate(promptTemplate, {
          transcription,
          language: options.language || "auto",
        });

        const response = await fetch(`${provider.apiUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: provider.processingModel,
            messages: [
              {
                role: "user",
                content: promptContent,
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const errorData = parseOpenAIError(errorText, "Processing failed");
          throw new Error(errorData.message);
        }

        const result = await response.json();
        const content = result.choices[0].message.content;
        return parseProcessedResponse(content, transcription);
      },
    };

    return provider;
  }

  /** @param {string} response @param {string} originalTranscription @returns {{transcript: string, cleaned: string, summary: string, reply: string}} */
  function parseProcessedResponse(response, originalTranscription) {
    const result = {
      transcript: originalTranscription,
      cleaned: "",
      summary: "",
      reply: "",
    };

    try {
      const sections = response.split("----").map((s) => s.trim());

      if (sections.length < 4) {
        console.warn("Unexpected response format:", response); // TODO: Remove
        result.cleaned = response.trim();
        result.summary = "Error: AI response was not in the expected format";
        result.reply = "Please try transcribing again";
        return result;
      }

      result.cleaned = sections[1] || "";
      result.summary = sections[2] || "";
      result.reply = sections[3] || "";

      if (!result.cleaned || !result.summary || !result.reply) {
        console.warn("Missing sections in response:", sections); // TODO: Remove
        result.summary =
          result.summary ||
          "Error: Some sections were missing from the AI response";
        result.reply = result.reply || "Please try transcribing again";
      }
    } catch (error) {
      console.error("Parsing error:", error.message); // TODO: Remove
      result.cleaned = response.trim();
      result.summary = "Error: Could not process AI response";
      result.reply = "Please try transcribing again";
    }

    return result;
  }

  const PROVIDERS = {
    openai: createOpenAIProvider,
    // Future providers can be added here:
    // claude: createClaudeProvider,
  };

  /** @param {string} type @param {Object} config @returns {Object} @throws {Error} */
  function getProvider(type, config = {}) {
    const createProvider = PROVIDERS[type];

    if (!createProvider) throw new Error(`Unsupported provider type: ${type}`);

    return createProvider(config);
  }

  function promisifyRequest(request) {
      return new Promise((resolve, reject) => {
          // @ts-ignore - file size hacks
          request.oncomplete = request.onsuccess = () => resolve(request.result);
          // @ts-ignore - file size hacks
          request.onabort = request.onerror = () => reject(request.error);
      });
  }
  function createStore(dbName, storeName) {
      const request = indexedDB.open(dbName);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName);
      const dbp = promisifyRequest(request);
      return (txMode, callback) => dbp.then((db) => callback(db.transaction(storeName, txMode).objectStore(storeName)));
  }
  let defaultGetStoreFunc;
  function defaultGetStore() {
      if (!defaultGetStoreFunc) {
          defaultGetStoreFunc = createStore('keyval-store', 'keyval');
      }
      return defaultGetStoreFunc;
  }
  /**
   * Get a value by its key.
   *
   * @param key
   * @param customStore Method to get a custom store. Use with caution (see the docs).
   */
  function get$1(key, customStore = defaultGetStore()) {
      return customStore('readonly', (store) => promisifyRequest(store.get(key)));
  }
  /**
   * Set a value with a key.
   *
   * @param key
   * @param value
   * @param customStore Method to get a custom store. Use with caution (see the docs).
   */
  function set$1(key, value, customStore = defaultGetStore()) {
      return customStore('readwrite', (store) => {
          store.put(value, key);
          return promisifyRequest(store.transaction);
      });
  }
  function eachCursor(store, callback) {
      store.openCursor().onsuccess = function () {
          if (!this.result)
              return;
          callback(this.result);
          this.result.continue();
      };
      return promisifyRequest(store.transaction);
  }
  /**
   * Get all entries in the store. Each entry is an array of `[key, value]`.
   *
   * @param customStore Method to get a custom store. Use with caution (see the docs).
   */
  function entries(customStore = defaultGetStore()) {
      return customStore('readonly', (store) => {
          // Fast path for modern browsers
          // (although, hopefully we'll get a simpler path some day)
          if (store.getAll && store.getAllKeys) {
              return Promise.all([
                  promisifyRequest(store.getAllKeys()),
                  promisifyRequest(store.getAll()),
              ]).then(([keys, values]) => keys.map((key, i) => [key, values[i]]));
          }
          const items = [];
          return customStore('readonly', (store) => eachCursor(store, (cursor) => items.push([cursor.key, cursor.value])).then(() => items));
      });
  }

  /** @param {string} key @param {string} [storageType='local'] @returns {Promise<any>} */
  async function get(key, storageType = "local") {
    if (storageType === "indexedDB") return await get$1(key);
    else {
      return new Promise((resolve) =>
        chrome.storage[storageType].get([key], (result) =>
          resolve(result[key] !== undefined ? result[key] : null)
        )
      );
    }
  }

  /** @param {string} key @param {any} value @param {string|Array<string>} [storageType='local'] @returns {Promise<boolean>} */
  async function set(key, value, storageType = "local") {
    const storageTypes = Array.isArray(storageType) ? storageType : [storageType];

    const promises = storageTypes.map((type) => {
      if (type === "indexedDB") return set$1(key, value);
      else
        return new Promise((resolve) => {
          const data = {};
          data[key] = value;
          chrome.storage[type].set(data, () => {
            const error = chrome.runtime.lastError;
            resolve(!error);
          });
        });
    });

    await Promise.all(promises);
    return true;
  }

  /** @param {string} [storageType='local'] @returns {Promise<Object>} */
  async function getAll(storageType = "local") {
    if (storageType === "indexedDB") return await entries();
    else
      return new Promise((resolve) => {
        chrome.storage[storageType].get(null, (items) => {
          resolve(items || {});
        });
      });
  }

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

    /** @param {Object} message @returns {Promise<{valid: boolean, error?: string}>} */
    async verifyApiKey(message) {
      try {
        const provider = getProvider(message.providerType || "openai");
        const result = await provider.verifyApiKey(message.apiKey);

        if (result.valid)
          await set("apiKey", message.apiKey, ["local", "sync"]);

        return result;
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },

    /** @returns {Promise<{syncStorage: Object, localStorage: Object}>} */
    async checkStorage() {
      const syncStorage = await getAll("sync");
      const localStorage = await getAll("local");

      return { syncStorage, localStorage };
    },

    /** @returns {Promise<{apiKey: string|null}>} */
    async getApiKey() {
      const apiKey =
        (await get("apiKey", "local")) ||
        (await get("apiKey", "sync"));

      return { apiKey: apiKey || null };
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

  (async () => {
    const apiKey = await get("apiKey", "sync");
    if (apiKey) await set("apiKey", apiKey, "local");
  })();

})();
//# sourceMappingURL=background.js.map
