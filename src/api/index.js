import { createOpenAIProcessingProvider } from "./providers/processing/OpenAIProcessingProvider.js";
import { createClaudeProcessingProvider } from "./providers/processing/ClaudeProcessingProvider.js";
import { createOpenAITranscriptionProvider } from "./providers/transcription/OpenAITranscriptionProvider.js";

const TRANSCRIPTION_PROVIDERS = {
  openai: createOpenAITranscriptionProvider,
};

const PROCESSING_PROVIDERS = {
  openai: createOpenAIProcessingProvider,
  claude: createClaudeProcessingProvider,
};

/** @param {string} type @param {Object} config @returns {Object} */
export function getTranscriptionProvider(type, config = {}) {
  const createProvider = TRANSCRIPTION_PROVIDERS[type];
  if (!createProvider)
    throw new Error(`Unsupported transcription provider type: ${type}`);
  return createProvider(config);
}

/** @param {string} type @param {Object} config @returns {Object} */
export function getProcessingProvider(type, config = {}) {
  const createProvider = PROCESSING_PROVIDERS[type];
  if (!createProvider)
    throw new Error(`Unsupported processing provider type: ${type}`);
  return createProvider(config);
}

/** @returns {Array<string>} */
export function getSupportedTranscriptionProviders() {
  return Object.keys(TRANSCRIPTION_PROVIDERS);
}

/** @returns {Array<string>} */
export function getSupportedProcessingProviders() {
  return Object.keys(PROCESSING_PROVIDERS);
}

/** @returns {string} */
export function getDefaultTranscriptionProviderType() {
  return "openai";
}

/** @returns {string} */
export function getDefaultProcessingProviderType() {
  return "openai";
}
