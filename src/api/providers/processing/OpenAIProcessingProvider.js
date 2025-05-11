import { parseOpenAIError } from "../../../utils/apiErrors.js";
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
      if (!apiKey) return { valid: false, error: "API key is empty" };
      if (!apiKey.startsWith("sk-"))
        return { valid: false, error: "Invalid API key format" };

      const response = await fetch(`${provider.apiUrl}/v1/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorData = parseOpenAIError(errorText, "Invalid API key");

        return {
          valid: false,
          error: errorData.message,
        };
      }

      return { valid: true };
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

/** @param {string} response @param {string} originalTranscription @returns {{transcript: string, cleaned: string, summary: string, reply: string}} */
function parseProcessedResponse(response, originalTranscription) {
  const result = {
    transcript: originalTranscription,
    cleaned: "",
    summary: "",
    reply: "",
  };

  try {
    const sections = response.split("----").map((s) => s.trim());

    if (sections.length < 4) {
      console.warn("Unexpected response format:", response);
      result.cleaned = response.trim();
      result.summary = "Error: AI response was not in the expected format";
      result.reply = "Please try transcribing again";
      return result;
    }

    result.cleaned = sections[1] || "";
    result.summary = sections[2] || "";
    result.reply = sections[3] || "";

    if (!result.cleaned || !result.summary || !result.reply) {
      console.warn("Missing sections in response:", sections);
      result.summary =
        result.summary ||
        "Error: Some sections were missing from the AI response";
      result.reply = result.reply || "Please try transcribing again";
    }
  } catch (error) {
    console.error("Parsing error:", error.message);
    result.cleaned = response.trim();
    result.summary = "Error: Could not process AI response";
    result.reply = "Please try transcribing again";
  }

  return result;
}
