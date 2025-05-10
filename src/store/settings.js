import { writable, derived, get } from "svelte/store";
import * as storageService from "../services/storageService.js";
import { getSupportedProviders, getDefaultProviderType } from "../api/index.js";

const DEFAULT_SETTINGS = {
  providerType: getDefaultProviderType(),
  apiKey: "",
  transcriptionModel: "whisper-1",
  processingModel: "gpt-4o",
  language: "auto",
  promptTemplate: "",
  isExtensionEnabled: true,
};

export const supportedLanguages = [
  { id: "auto", name: "Auto-detect" },
  { id: "en", name: "English" },
  { id: "es", name: "Spanish" },
  { id: "fr", name: "French" },
  { id: "de", name: "German" },
  { id: "it", name: "Italian" },
  { id: "pt", name: "Portuguese" },
  { id: "nl", name: "Dutch" },
  { id: "ru", name: "Russian" },
  { id: "ja", name: "Japanese" },
  { id: "zh", name: "Chinese" },
  { id: "ar", name: "Arabic" },
];

export const availableProviders = writable(
  getSupportedProviders().map((id) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
  }))
);

export const settings = writable({});
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

/** @param {Object} updates */
export function updateStatus(updates) {
  extensionStatus.update((status) => {
    const newStatus = { ...status };

    if (updates.pendingTranscriptions !== undefined) {
      if (typeof updates.pendingTranscriptions === "boolean") {
        newStatus.pendingTranscriptions += updates.pendingTranscriptions
          ? 1
          : -1;
        if (newStatus.pendingTranscriptions < 0)
          newStatus.pendingTranscriptions = 0;
      } else newStatus.pendingTranscriptions = updates.pendingTranscriptions;
    }

    if (updates.lastError !== undefined)
      newStatus.lastError = updates.lastError;
    if (updates.isExtensionEnabled !== undefined)
      newStatus.isExtensionEnabled = updates.isExtensionEnabled;
    if (updates.isApiKeyConfigured !== undefined)
      newStatus.isApiKeyConfigured = updates.isApiKeyConfigured;

    return newStatus;
  });
}

export async function initializeSettings() {
  const transcriptions = await storageService.getTranscriptions();
  transcriptionCache.set(transcriptions);

  const apiKey =
    (await storageService.get("apiKey", "local")) ||
    (await storageService.get("apiKey", "sync"));

  const storedSettings = await storageService.getAll("sync");

  settings.set({
    ...DEFAULT_SETTINGS,
    ...storedSettings,
    apiKey: apiKey || "",
  });

  updateStatus({
    isApiKeyConfigured: !!apiKey,
    isExtensionEnabled: storedSettings.isExtensionEnabled !== false,
  });

  setupSettingsPersistence();
}

function setupSettingsPersistence() {
  let previousSettings = {};

  settings.subscribe(async (currentSettings) => {
    if (Object.keys(currentSettings).length === 0) return;

    const hasChanged = Object.entries(currentSettings).some(
      ([key, value]) => previousSettings[key] !== value
    );

    if (!hasChanged && Object.keys(previousSettings).length > 0) return;
    previousSettings = { ...currentSettings };

    if (currentSettings.apiKey) {
      await storageService.set("apiKey", currentSettings.apiKey, [
        "local",
        "sync",
      ]);
      updateStatus({ isApiKeyConfigured: true });
    }

    for (const [key, value] of Object.entries(currentSettings))
      if (key !== "apiKey") await storageService.set(key, value, "sync");

    chrome.runtime.sendMessage({ action: "settingsUpdated" });
  });

  transcriptionCache.subscribe(async (cache) => {
    if (cache.size > 0) {
      const transcriptionObj = Object.fromEntries(cache);
      await storageService.set(
        "wa-transcriptions",
        transcriptionObj,
        "indexedDB"
      );
    }
  });
}

/** @returns {Object} */
export function getSettings() {
  return get(settings);
}

/** @param {Object} updates */
export function updateSettings(updates) {
  settings.update((s) => ({ ...s, ...updates }));
}

/** @param {string} id @param {Object} data */
export function cacheTranscription(id, data) {
  transcriptionCache.update((cache) => {
    cache.set(id, data);
    return cache;
  });
}
