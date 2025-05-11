import { writable, derived, get } from "svelte/store";
import * as storageService from "../services/storageService.js";
import {
  getSupportedTranscriptionProviders,
  getSupportedProcessingProviders,
  getDefaultTranscriptionProviderType,
  getDefaultProcessingProviderType,
} from "../api/index.js";

const DEFAULT_SETTINGS = {
  providerType: getDefaultTranscriptionProviderType(),
  apiKey: "",

  processingProviderType: getDefaultProcessingProviderType(),
  transcriptionProviderType: getDefaultTranscriptionProviderType(),

  processingApiKey: "",
  transcriptionApiKey: "",

  promptTemplate: "",
  language: "auto",
  processingModel: "gpt-4o",
  transcriptionModel: "whisper-1",
  isExtensionEnabled: true,
};

export const supportedLanguages = [
  { id: "auto", name: "Auto-detect" },
  { id: "en", name: "English" },
  { id: "es", name: "Spanish" },
  { id: "fr", name: "French" },
  { id: "de", name: "German" },
  { id: "it", name: "Italian" },
  { id: "ar", name: "Arabic" },
];

export const availableTranscriptionProviders = writable(
  getSupportedTranscriptionProviders().map((id) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    category: "transcription",
  }))
);

export const availableProcessingProviders = writable(
  getSupportedProcessingProviders().map((id) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    category: "processing",
  }))
);

export const availableProviders = writable(
  getSupportedTranscriptionProviders()
    .filter((id) => getSupportedProcessingProviders().includes(id))
    .map((id) => ({
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

  const legacyApiKey =
    (await storageService.get("apiKey", "local")) ||
    (await storageService.get("apiKey", "sync"));

  const transcriptionApiKey =
    (await storageService.get("transcriptionApiKey", "local")) ||
    (await storageService.get("transcriptionApiKey", "sync"));

  const processingApiKey =
    (await storageService.get("processingApiKey", "local")) ||
    (await storageService.get("processingApiKey", "sync"));

  const storedSettings = await storageService.getAll("sync");

  if (
    storedSettings.providerType &&
    !storedSettings.transcriptionProviderType
  ) {
    storedSettings.transcriptionProviderType = storedSettings.providerType;
  }

  if (storedSettings.providerType && !storedSettings.processingProviderType) {
    storedSettings.processingProviderType = storedSettings.providerType;
  }

  if (legacyApiKey && !transcriptionApiKey) {
    storedSettings.transcriptionApiKey = legacyApiKey;
  }

  if (legacyApiKey && !processingApiKey) {
    storedSettings.processingApiKey = legacyApiKey;
  }

  settings.set({
    ...DEFAULT_SETTINGS,
    ...storedSettings,
    apiKey: legacyApiKey || "",
    transcriptionApiKey:
      storedSettings.transcriptionApiKey || legacyApiKey || "",
    processingApiKey: storedSettings.processingApiKey || legacyApiKey || "",
  });

  updateStatus({
    isApiKeyConfigured: !!(
      transcriptionApiKey ||
      processingApiKey ||
      legacyApiKey
    ),
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
    }

    if (currentSettings.transcriptionApiKey) {
      await storageService.set(
        "transcriptionApiKey",
        currentSettings.transcriptionApiKey,
        ["local", "sync"]
      );
    }

    if (currentSettings.processingApiKey) {
      await storageService.set(
        "processingApiKey",
        currentSettings.processingApiKey,
        ["local", "sync"]
      );
    }

    const isApiKeyConfigured = !!(
      currentSettings.transcriptionApiKey ||
      currentSettings.processingApiKey ||
      currentSettings.apiKey
    );
    updateStatus({ isApiKeyConfigured });

    for (const [key, value] of Object.entries(currentSettings)) {
      if (
        key !== "apiKey" &&
        key !== "transcriptionApiKey" &&
        key !== "processingApiKey"
      ) {
        await storageService.set(key, value, "sync");
      }
    }

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
