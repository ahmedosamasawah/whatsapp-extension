import { parseClaudeError } from "../../../utils/apiErrors.js";
import { verifyApiKey } from "../../../utils/apiKeyVerifier.js";
import { parseProcessedResponse } from "../../../utils/responseParser.js";
import { createBaseProcessingProvider } from "./BaseProcessingProvider.js";
import { renderTemplate, defaultTemplates } from "../../../utils/template.js";

/** @param {Object} config @returns {Object} */
export function createClaudeProcessingProvider(config = {}) {
  const provider = {
    ...createBaseProcessingProvider(config),
    apiKey: config.apiKey,
    apiUrl: "https://api.anthropic.com",
    model: config.processingModel || "claude-3-opus-20240229",

    verifyApiKey: async (apiKey) => {
      return verifyApiKey({
        apiKey,
        provider: "claude",
        apiUrl: provider.apiUrl,
        model: provider.model,
      });
    },

    processTranscription: async (transcription, options = {}) => {
      if (!provider.apiKey) throw new Error("API key not configured");

      const promptTemplate =
        options.promptTemplate || defaultTemplates.claude.processing;

      const promptContent = renderTemplate(promptTemplate, {
        transcription,
        language: options.language || "auto-detected",
      });

      const response = await fetch(`${provider.apiUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": provider.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            {
              role: "user",
              content: promptContent,
            },
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorData = parseClaudeError(error, "Processing failed");
        throw new Error(errorData.message);
      }

      const result = await response.json();
      const content = result.content[0].text;
      return parseProcessedResponse(content, transcription);
    },
  };

  return provider;
}
