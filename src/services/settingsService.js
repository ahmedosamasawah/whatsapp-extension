import {
  getDefaultProcessor,
  getDefaultTranscriber,
  getSupportedProcessors,
  getSupportedTranscribers,
} from "../api/index.js";

import { writable, get, derived } from "svelte/store";
import * as storageService from "./storageService.js";

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
  language: "auto",
  promptTemplate: "",
  processingApiKey: "",
  transcriptionApiKey: "",
  isExtensionEnabled: true,
  processingModel: "gpt-4o",
  transcriptionModel: "whisper-1",
  localWhisperUrl: "http://localhost:9000",
  processingProviderType: getDefaultProcessor(),
  transcriptionProviderType: getDefaultTranscriber(),
};

export const availableTranscriptionProviders = writable(
  getSupportedTranscribers().map((id) => ({
    id,
    name:
      id === "localWhisper"
        ? "Local Whisper Server"
        : id.charAt(0).toUpperCase() + id.slice(1),
    category: "transcription",
  }))
);

export const availableProcessingProviders = writable(
  getSupportedProcessors().map((id) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    category: "processing",
  }))
);

const settings = writable({ ...DEFAULT_SETTINGS });
const status = writable({
  isApiKeyConfigured: false,
  isExtensionEnabled: true,
  pendingTranscriptions: 0,
  lastError: null,
});

export const transcriptionCache = writable(new Map());

export async function initialize() {
  try {
    const storedTranscriptions = await storageService.get(
      "wa-transcriptions",
      "indexedDB"
    );
    transcriptionCache.set(new Map(Object.entries(storedTranscriptions || {})));

    const storedSettings = await storageService.getAll("sync");

    // Handle API keys from both local and sync storage for backward compatibility
    const transcriptionApiKey =
      storedSettings.transcriptionApiKey ||
      (await storageService.get("transcriptionApiKey", "local")) ||
      (await storageService.get("transcriptionApiKey", "sync")) ||
      "";

    const processingApiKey =
      storedSettings.processingApiKey ||
      (await storageService.get("processingApiKey", "local")) ||
      (await storageService.get("processingApiKey", "sync")) ||
      "";

    settings.set({
      ...DEFAULT_SETTINGS,
      ...storedSettings,
      transcriptionApiKey,
      processingApiKey,
    });

    updateStatus({
      isApiKeyConfigured: !!(transcriptionApiKey || processingApiKey),
      isExtensionEnabled: storedSettings.isExtensionEnabled !== false,
    });

    setupSettingsPersistence();

    try {
      await chrome.runtime.sendMessage({ action: "settingsUpdated" });
    } catch (error) {}
  } catch (error) {
    console.error("Failed to initialize settings:", error);
  }
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

    // Store API keys in both local and sync storage for backward compatibility
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

    // Store other settings in sync storage
    for (const [key, value] of Object.entries(currentSettings)) {
      if (key !== "transcriptionApiKey" && key !== "processingApiKey") {
        await storageService.set(key, value, "sync");
      }
    }
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

export function getSetting(key, defaultValue) {
  return get(settings)[key] !== undefined ? get(settings)[key] : defaultValue;
}

export function getAllSettings() {
  return get(settings);
}

export async function updateSettings(updates) {
  settings.update((s) => ({ ...s, ...updates }));

  if (updates.transcriptionApiKey || updates.processingApiKey) {
    const currentSettings = get(settings);
    const isApiKeyConfigured = !!(
      currentSettings.transcriptionApiKey || currentSettings.processingApiKey
    );
    updateStatus({ isApiKeyConfigured });
  }

  try {
    await chrome.runtime.sendMessage({ action: "settingsUpdated" });
  } catch (error) {}
}

export async function resetSettings() {
  await updateSettings(DEFAULT_SETTINGS);
}

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

export function getStatus() {
  return get(status);
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

export async function cacheTranscription(id, data) {
  transcriptionCache.update((cache) => {
    cache.set(id, data);
    return cache;
  });
}
export { settings, status };
export { DEFAULT_SETTINGS };
