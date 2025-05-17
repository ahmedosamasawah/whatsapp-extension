import { getProcessor, getTranscriber } from "../api/index.js";

import {
  updateStatus,
  getAllSettings,
  updateSettings,
} from "./settingsService.js";

import { defaultTemplates } from "../utils/template.js";
import { formatTranscriptionError } from "../utils/apiErrors.js";

export const configureTranscriber = (settings = {}) => {
  const providerType = settings.transcriptionProviderType || "openai";

  const config = {
    apiKey: settings.transcriptionApiKey || "",
    transcriptionModel: settings.transcriptionModel,
  };

  if (providerType === "localWhisper")
    config.apiUrl = settings.localWhisperUrl || "http://localhost:9000";

  console.log("Config", config);

  return getTranscriber(providerType, config);
};

export const configureProcessingProvider = (settings = {}) => {
  const providerType = settings.processingProviderType || "openai";

  return getProcessor(providerType, {
    apiKey: settings.processingApiKey || "",
    processingModel: settings.processingModel,
  });
};

export const verifyLocalWhisperServer = async (options = {}) => {
  const apiUrl = options.localWhisperUrl || "http://localhost:9000";

  const provider = getTranscriber("localWhisper", { apiUrl });

  const result = await provider.verifyApiKey();
  if (result.valid) await updateSettings({ localWhisperUrl: apiUrl });

  return result;
};

export const verifyApiKey = async (
  apiKey,
  providerType,
  providerCategory,
  options = {}
) => {
  try {
    if (providerType === "localWhisper")
      return verifyLocalWhisperServer(options);

    const provider =
      providerCategory === "transcription"
        ? getTranscriber(providerType, { apiKey })
        : getProcessor(providerType, { apiKey });

    const result = await provider.verifyApiKey(apiKey);

    if (result.valid)
      await updateSettings({
        [`${providerCategory}ApiKey`]: apiKey,
      });

    return result;
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

export const processVoiceMessage = async (audioBlob) => {
  updateStatus({ pendingTranscriptions: true });

  try {
    const settings = getAllSettings();
    const transcriber = configureTranscriber(settings);
    const processor = configureProcessingProvider(settings);

    const transcription = await transcriber.transcribeAudio(audioBlob, {
      language: settings.language,
    });

    const promptTemplate =
      settings.promptTemplate ||
      defaultTemplates[settings.processingProviderType]?.processing;

    const processed = await processor.processTranscription(transcription, {
      language: settings.language,
      promptTemplate: promptTemplate,
    });

    updateStatus({ pendingTranscriptions: false, lastError: null });
    return processed;
  } catch (error) {
    updateStatus({ pendingTranscriptions: false, lastError: error.message });
    return formatTranscriptionError(error);
  }
};
