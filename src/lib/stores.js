import { writable, derived, get } from "svelte/store";

export const apiKey = writable("");

export const availableModels = writable([
  {
    id: "whisper-1",
    name: "Whisper (Audio Transcription)",
    type: "transcription",
  },
  { id: "gpt-4o", name: "GPT-4o (Analysis)", type: "analysis" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo (Analysis)", type: "analysis" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo (Analysis)", type: "analysis" },
]);

export const selectedTranscriptionModel = writable("whisper-1");
export const selectedAnalysisModel = writable("gpt-4o");

export const transcriptionSettings = writable({
  generateCleaned: true,
  generateSummary: true,
  generateReply: true,
  language: "auto",
  promptTemplate: `Based on the voice message transcript, generate four outputs:
TRANSCRIPT: The exact transcript
CLEANED: A grammatically corrected, filler-word-free version
SUMMARY: A concise summary in 1-2 sentences
REPLY: A natural, helpful suggested reply to this message`,
});

export const transcriptionCache = writable(new Map());

export const extensionStatus = writable({
  isApiKeyConfigured: false,
  isExtensionEnabled: true,
  pendingTranscriptions: 0,
  lastError: null,
});

export const extensionStatusText = derived(extensionStatus, ($status) => {
  if (!$status.isApiKeyConfigured)
    return { text: "API key not configured", type: "error" };
  if (!$status.isExtensionEnabled)
    return { text: "Extension disabled", type: "warning" };
  if ($status.lastError)
    return { text: "Error: " + $status.lastError, type: "error" };

  if ($status.pendingTranscriptions > 0)
    return { text: "Transcribing...", type: "pending" };

  return { text: "Ready", type: "success" };
});

export function initializeStores() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["openai_api_key"], (localResult) => {
      if (localResult.openai_api_key) {
        apiKey.set(localResult.openai_api_key);
        extensionStatus.update((s) => ({ ...s, isApiKeyConfigured: true }));
      }

      chrome.storage.sync.get(
        [
          "openai_api_key",
          "selectedTranscriptionModel",
          "selectedAnalysisModel",
          "transcriptionSettings",
          "isExtensionEnabled",
        ],
        (result) => {
          if (!localResult.openai_api_key && result.openai_api_key) {
            apiKey.set(result.openai_api_key);
            extensionStatus.update((s) => ({ ...s, isApiKeyConfigured: true }));

            chrome.storage.local.set({ openai_api_key: result.openai_api_key });
          }

          if (result.selectedTranscriptionModel)
            selectedTranscriptionModel.set(result.selectedTranscriptionModel);

          if (result.selectedAnalysisModel)
            selectedAnalysisModel.set(result.selectedAnalysisModel);

          if (result.transcriptionSettings)
            transcriptionSettings.set(result.transcriptionSettings);

          if (result.isExtensionEnabled !== undefined) {
            extensionStatus.update((s) => ({
              ...s,
              isExtensionEnabled: result.isExtensionEnabled,
            }));
          }

          const currentApiKey = get(apiKey);
          resolve();
        }
      );
    });
  });
}

export function setupStorePersistence() {
  apiKey.subscribe((value) => {
    chrome.storage.sync.set({ openai_api_key: value });
    chrome.storage.local.set({ openai_api_key: value });
    extensionStatus.update((s) => ({ ...s, isApiKeyConfigured: !!value }));
  });

  selectedTranscriptionModel.subscribe((value) => {
    chrome.storage.sync.set({ selectedTranscriptionModel: value });
  });

  selectedAnalysisModel.subscribe((value) => {
    chrome.storage.sync.set({ selectedAnalysisModel: value });
  });

  transcriptionSettings.subscribe((value) => {
    chrome.storage.sync.set({ transcriptionSettings: value });
  });

  extensionStatus.subscribe((value) => {
    chrome.storage.sync.set({ isExtensionEnabled: value.isExtensionEnabled });
  });
}

export function getApiKey() {
  const key = get(apiKey);

  if (!key) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getApiKey" }, (response) => {
        if (response && response.apiKey) {
          apiKey.set(response.apiKey);
          extensionStatus.update((s) => ({ ...s, isApiKeyConfigured: true }));
          resolve(response.apiKey);
        } else resolve(null);
      });
    });
  }

  return key;
}
