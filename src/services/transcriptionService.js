import {
  getProcessingProvider,
  getTranscriptionProvider,
} from "../api/index.js";

import {
  updateStatus,
  getAllSettings,
  updateSettings,
} from "./settingsService.js";

import { defaultTemplates } from "../utils/template.js";
import { formatTranscriptionError } from "../utils/apiErrors.js";

/** @param {Object} settings @returns {Object} */
function getConfiguredTranscriptionProvider(settings = {}) {
  const allSettings =
    Object.keys(settings).length > 0 ? settings : getAllSettings();

  const providerType =
    allSettings.transcriptionProviderType ||
    allSettings.providerType ||
    "openai";

  const apiKey = allSettings.transcriptionApiKey || allSettings.apiKey || "";

  return getTranscriptionProvider(providerType, {
    apiKey,
    transcriptionModel: allSettings.transcriptionModel,
  });
}

/** @param {Object} settings @returns {Object} */
function getConfiguredProcessingProvider(settings = {}) {
  const allSettings =
    Object.keys(settings).length > 0 ? settings : getAllSettings();

  const providerType =
    allSettings.processingProviderType || allSettings.providerType || "openai";

  const apiKey = allSettings.processingApiKey || allSettings.apiKey || "";

  return getProcessingProvider(providerType, {
    apiKey,
    processingModel: allSettings.processingModel,
  });
}

/** @param {string} apiKey @param {string} providerType @param {string} providerCategory @returns {Promise<{valid: boolean, error?: string}>} */
export async function verifyApiKey(
  apiKey,
  providerType = null,
  providerCategory = "both"
) {
  try {
    const settings = getAllSettings();

    let type;
    if (providerCategory === "transcription") {
      type =
        providerType ||
        settings.transcriptionProviderType ||
        settings.providerType ||
        "openai";
    } else if (providerCategory === "processing") {
      type =
        providerType ||
        settings.processingProviderType ||
        settings.providerType ||
        "openai";
    } else {
      type = providerType || settings.providerType || "openai";
    }

    if (providerCategory === "transcription") {
      const provider = getTranscriptionProvider(type, { apiKey });
      const result = await provider.verifyApiKey(apiKey);

      if (result.valid) await updateSettings({ transcriptionApiKey: apiKey });

      return result;
    } else if (providerCategory === "processing") {
      const provider = getProcessingProvider(type, { apiKey });
      const result = await provider.verifyApiKey(apiKey);

      if (result.valid) await updateSettings({ processingApiKey: apiKey });

      return result;
    } else {
      const transcriptionProvider = getTranscriptionProvider(type, { apiKey });
      const processingProvider = getProcessingProvider(type, { apiKey });

      const transcriptionResult = await transcriptionProvider.verifyApiKey(
        apiKey
      );

      if (!transcriptionResult.valid) return transcriptionResult;

      const processingResult = await processingProvider.verifyApiKey(apiKey);

      if (processingResult.valid)
        await updateSettings({
          apiKey,
          transcriptionApiKey: apiKey,
          processingApiKey: apiKey,
        });

      return processingResult;
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/** @param {Blob} audioBlob @returns {Promise<{transcript: string, cleaned: string, summary: string, reply: string}>} */
export async function processVoiceMessage(audioBlob) {
  updateStatus({ pendingTranscriptions: true });

  try {
    const settings = getAllSettings();

    const transcriptionProvider = getConfiguredTranscriptionProvider(settings);
    const transcription = await transcriptionProvider.transcribeAudio(
      audioBlob,
      {
        language: settings.language,
      }
    );

    const processingProvider = getConfiguredProcessingProvider(settings);
    const processed = await processingProvider.processTranscription(
      transcription,
      {
        language: settings.language,
        promptTemplate:
          settings.promptTemplate ||
          defaultTemplates[
            settings.processingProviderType || settings.providerType
          ]?.processing ||
          defaultTemplates.openai.processing,
      }
    );

    updateStatus({ pendingTranscriptions: false, lastError: null });
    return processed;
  } catch (error) {
    updateStatus({ pendingTranscriptions: false, lastError: error.message });
    return formatTranscriptionError(error);
  }
}
