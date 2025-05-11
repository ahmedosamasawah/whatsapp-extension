import { writable, get, derived } from "svelte/store";
import * as storageService from "./storageService.js";
import {
  getDefaultProcessingProviderType,
  getDefaultTranscriptionProviderType,
  getSupportedTranscriptionProviders,
  getSupportedProcessingProviders,
} from "../api/index.js";

export const supportedLanguages = [
  { id: "auto", name: "Auto-detect" },
  { id: "en", name: "English" },
  { id: "es", name: "Spanish" },
  { id: "fr", name: "French" },
  { id: "de", name: "German" },
  { id: "it", name: "Italian" },
  { id: "ar", name: "Arabic" },
];

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

const settings = writable({});
const isInitialized = writable(false);
const status = writable({
  isApiKeyConfigured: false,
  isExtensionEnabled: true,
  pendingTranscriptions: 0,
  lastError: null,
});

let initializationPromise = null;

/** @returns {Promise<void>} */
export function initialize() {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      const storedSettings = await storageService.getAll("sync");

      const legacyApiKey =
        (await storageService.get("apiKey", "local")) ||
        (await storageService.get("apiKey", "sync"));

      const transcriptionApiKey =
        (await storageService.get("transcriptionApiKey", "local")) ||
        (await storageService.get("transcriptionApiKey", "sync"));

      const processingApiKey =
        (await storageService.get("processingApiKey", "local")) ||
        (await storageService.get("processingApiKey", "sync"));

      if (
        storedSettings.providerType &&
        !storedSettings.transcriptionProviderType
      )
        storedSettings.transcriptionProviderType = storedSettings.providerType;

      if (storedSettings.providerType && !storedSettings.processingProviderType)
        storedSettings.processingProviderType = storedSettings.providerType;

      if (legacyApiKey && !transcriptionApiKey)
        storedSettings.transcriptionApiKey = legacyApiKey;

      if (legacyApiKey && !processingApiKey)
        storedSettings.processingApiKey = legacyApiKey;

      const mergedSettings = {
        ...DEFAULT_SETTINGS,
        ...storedSettings,
        apiKey: legacyApiKey || "",
        transcriptionApiKey:
          storedSettings.transcriptionApiKey || legacyApiKey || "",
        processingApiKey: storedSettings.processingApiKey || legacyApiKey || "",
      };

      settings.set(mergedSettings);

      updateStatus({
        isApiKeyConfigured: !!(
          transcriptionApiKey ||
          processingApiKey ||
          legacyApiKey
        ),
        isExtensionEnabled: storedSettings.isExtensionEnabled !== false,
      });

      setupSettingsPersistence();

      isInitialized.set(true);
    } catch (error) {
      console.error("Failed to initialize settings:", error);
      throw error;
    }
  })();

  return initializationPromise;
}

/** @param {string} key @param {any} [defaultValue] @returns {any} */
export function getSetting(key, defaultValue) {
  const currentSettings = get(settings);

  if (Object.keys(currentSettings).length === 0) {
    console.warn(
      "Settings accessed before initialization. Call initialize() first."
    );
  }

  return currentSettings[key] !== undefined
    ? currentSettings[key]
    : defaultValue;
}

/** @returns {Object} */
export function getAllSettings() {
  return get(settings);
}

/** @param {Object} updates @returns {Promise<void>} */
export async function updateSettings(updates) {
  if (!get(isInitialized)) {
    console.warn(
      "Updating settings before initialization. Call initialize() first."
    );
    await initialize();
  }

  settings.update((s) => ({ ...s, ...updates }));

  if (
    updates.apiKey ||
    updates.transcriptionApiKey ||
    updates.processingApiKey
  ) {
    const currentSettings = get(settings);
    const isApiKeyConfigured = !!(
      currentSettings.transcriptionApiKey ||
      currentSettings.processingApiKey ||
      currentSettings.apiKey
    );
    updateStatus({ isApiKeyConfigured });
  }

  try {
    await chrome.runtime.sendMessage({ action: "settingsUpdated" });
  } catch (error) {}
}

/** @returns {Promise<void>} */
export async function resetSettings() {
  await updateSettings(DEFAULT_SETTINGS);
}

/** @param {Object} updates @returns {void} */
export function updateStatus(updates) {
  status.update((currentStatus) => {
    const newStatus = { ...currentStatus };

    if (updates.pendingTranscriptions !== undefined) {
      if (typeof updates.pendingTranscriptions === "boolean") {
        newStatus.pendingTranscriptions += updates.pendingTranscriptions
          ? 1
          : -1;
        if (newStatus.pendingTranscriptions < 0)
          newStatus.pendingTranscriptions = 0;
      } else {
        newStatus.pendingTranscriptions = updates.pendingTranscriptions;
      }
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

/** @returns {Object} */
export function getStatus() {
  return get(status);
}

/** @returns {boolean} */
export function isSettingsInitialized() {
  return get(isInitialized);
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

    for (const [key, value] of Object.entries(currentSettings)) {
      if (
        key !== "apiKey" &&
        key !== "transcriptionApiKey" &&
        key !== "processingApiKey"
      ) {
        await storageService.set(key, value, "sync");
      }
    }
  });
}

export const statusText = derived(status, ($status) => {
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

export { settings, status };
export { DEFAULT_SETTINGS };
