import { createOpenAIProvider } from "./providers/OpenAIProvider.js";

const PROVIDERS = {
  openai: createOpenAIProvider,
  // Future providers can be added here:
  // claude: createClaudeProvider,
};

/** @param {string} type @param {Object} config @returns {Object} @throws {Error} */
export function getProvider(type, config = {}) {
  const createProvider = PROVIDERS[type];

  if (!createProvider) throw new Error(`Unsupported provider type: ${type}`);

  return createProvider(config);
}

/** @returns {Array<string>} */
export function getSupportedProviders() {
  return Object.keys(PROVIDERS);
}

/** @returns {string} */
export function getDefaultProviderType() {
  return "openai";
}
