import { createBaseProcessor } from "./base.js";
import { parseOpenAIError } from "../../../utils/apiErrors.js";
import { verifyApiKey } from "../../../utils/apiKeyVerifier.js";
import { parseProcessedResponse } from "../../../utils/responseParser.js";
import { renderTemplate, defaultTemplates } from "../../../utils/template.js";

const DEFAULT_CONFIG = {
  apiUrl: "https://api.openai.com",
  model: "gpt-4o",
};

export const createOpenAIProcessor = (config = {}) => {
  const settings = { ...DEFAULT_CONFIG, ...config };
  const { apiKey } = settings;

  const verifyOpenAIKey = async (key) => {
    return verifyApiKey({
      apiKey: key,
      providerType: "openai",
      apiUrl: settings.apiUrl,
      customValidation: {
        formatCheck: (k) => k.startsWith("sk-"),
        formatErrorMessage: "Invalid API key format, should start with sk-",
      },
    });
  };

  const processWithOpenAI = async (transcription, options = {}) => {
    if (!apiKey) throw new Error("API key not configured");

    const promptTemplate =
      options.promptTemplate || defaultTemplates.openai.processing;
    const promptContent = renderTemplate(promptTemplate, {
      transcription,
      language: options.language || "same as transcription",
    });

    const response = await fetch(`${settings.apiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
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
  };

  return {
    ...createBaseProcessor(),
    verifyApiKey: verifyOpenAIKey,
    processTranscription: processWithOpenAI,
  };
};
