import { createOpenAIProcessor } from "./providers/processing/openai.js";
import { createClaudeProcessor } from "./providers/processing/claude.js";
import { createOllamaProcessor } from "./providers/processing/ollama.js";
import { createOpenAITranscriber } from "./providers/transcription/openai.js";
import { createLocalWhisperTranscriber } from "./providers/transcription/local-whisper.js";

const TRANSCRIPTION_PROVIDERS = {
  openai: createOpenAITranscriber,
  localWhisper: createLocalWhisperTranscriber,
};

const PROCESSING_PROVIDERS = {
  openai: createOpenAIProcessor,
  claude: createClaudeProcessor,
  ollama: createOllamaProcessor,
};

export function getTranscriber(type, config = {}) {
  const createProvider = TRANSCRIPTION_PROVIDERS[type];

  return createProvider(config);
}

export function getProcessor(type, config = {}) {
  const createProvider = PROCESSING_PROVIDERS[type];

  return createProvider(config);
}

export function getSupportedTranscribers() {
  return Object.keys(TRANSCRIPTION_PROVIDERS);
}

export function getSupportedProcessors() {
  return Object.keys(PROCESSING_PROVIDERS);
}

export function getDefaultTranscriber() {
  return "openai";
}

export function getDefaultProcessor() {
  return "openai";
}
