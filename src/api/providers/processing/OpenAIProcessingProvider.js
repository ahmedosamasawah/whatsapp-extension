import { parseOpenAIError } from "../../../utils/apiErrors.js";
import { verifyApiKey } from "../../../utils/apiKeyVerifier.js";
import { parseProcessedResponse } from "../../../utils/responseParser.js";
import { createBaseProcessingProvider } from "./BaseProcessingProvider.js";
import { renderTemplate, defaultTemplates } from "../../../utils/template.js";

/** @param {Object} config @returns {Object} */
export function createOpenAIProcessingProvider(config = {}) {
  const provider = {
    ...createBaseProcessingProvider(config),
    apiKey: config.apiKey,
    apiUrl: "https://api.openai.com",
    processingModel: config.processingModel || "gpt-4o",

    verifyApiKey: async (apiKey) => {
      return verifyApiKey({
        apiKey,
        provider: "openai",
        apiUrl: provider.apiUrl,
        customValidation: {
          formatCheck: (key) => key.startsWith("sk-"),
          formatErrorMessage: "Invalid API key format",
        },
      });
    },

    processTranscription: async (transcription, options = {}) => {
      if (!provider.apiKey) throw new Error("API key not configured");

      const promptTemplate =
        options.promptTemplate || defaultTemplates.openai.processing;

      const promptContent = renderTemplate(promptTemplate, {
        transcription,
        language: options.language || "auto",
      });

      const response = await fetch(`${provider.apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.processingModel,
          messages: [
            {
              role: "user",
              content: promptContent,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorData = parseOpenAIError(errorText, "Processing failed");
        throw new Error(errorData.message);
      }

      const result = await response.json();
      const content = result.choices[0].message.content;
      return parseProcessedResponse(content, transcription);
    },
  };

  return provider;
}
