import { getProvider } from "../api/index.js";
import { defaultTemplates } from "../utils/template.js";
import { getSettings, updateStatus } from "../store/settings.js";
import { formatTranscriptionError } from "../utils/apiErrors.js";

/** @param {Object} settings @returns {Object} */
function getProviderFromSettings(settings = {}) {
  const providerType = settings.providerType || "openai";

  return getProvider(providerType, {
    apiKey: settings.apiKey,
    transcriptionModel: settings.transcriptionModel,
    processingModel: settings.processingModel,
  });
}

/** @param {string} apiKey @param {string} providerType @returns {Promise<{valid: boolean, error?: string}>} */
export async function verifyApiKey(apiKey, providerType = null) {
  const settings = await getSettings();
  const type = providerType || settings.providerType || "openai";
  const provider = getProvider(type, { apiKey });
  return provider.verifyApiKey(apiKey);
}

/** @param {Blob} audioBlob @returns {Promise<{transcript: string, cleaned: string, summary: string, reply: string}>} */
export async function processVoiceMessage(audioBlob) {
  updateStatus({ pendingTranscriptions: true });

  try {
    const settings = await getSettings();
    const provider = getProviderFromSettings(settings);

    const transcription = await provider.transcribeAudio(audioBlob, {
      language: settings.language,
    });

    const processed = await provider.processTranscription(transcription, {
      language: settings.language,
      promptTemplate:
        settings.promptTemplate ||
        defaultTemplates[settings.providerType]?.processing ||
        defaultTemplates.openai.processing,
    });

    updateStatus({ pendingTranscriptions: false, lastError: null });
    return processed;
  } catch (error) {
    updateStatus({ pendingTranscriptions: false, lastError: error.message });
    return formatTranscriptionError(error);
  }
}
