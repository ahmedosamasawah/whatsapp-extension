import {
  getTranscriptionProvider,
  getProcessingProvider,
} from "../api/index.js";
import { defaultTemplates } from "../utils/template.js";
import {
  getSettings,
  updateStatus,
  updateSettings,
} from "../store/settings.js";
import { formatTranscriptionError } from "../utils/apiErrors.js";

/** @param {Object} settings @returns {Object} */
function getConfiguredTranscriptionProvider(settings = {}) {
  const providerType =
    settings.transcriptionProviderType || settings.providerType || "openai";

  const apiKey = settings.transcriptionApiKey || settings.apiKey || "";

  return getTranscriptionProvider(providerType, {
    apiKey,
    transcriptionModel: settings.transcriptionModel,
  });
}

/** @param {Object} settings @returns {Object} */
function getConfiguredProcessingProvider(settings = {}) {
  const providerType =
    settings.processingProviderType || settings.providerType || "openai";

  const apiKey = settings.processingApiKey || settings.apiKey || "";

  return getProcessingProvider(providerType, {
    apiKey,
    processingModel: settings.processingModel,
  });
}

/** @param {string} apiKey @param {string} providerType @param {string} providerCategory @returns {Promise<{valid: boolean, error?: string}>} */
export async function verifyApiKey(
  apiKey,
  providerType = null,
  providerCategory = "both"
) {
  try {
    const settings = await getSettings();

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
    const settings = await getSettings();

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
