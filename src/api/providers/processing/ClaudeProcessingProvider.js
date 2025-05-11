import { createBaseProcessingProvider } from "./BaseProcessingProvider.js";

/** @param {Object} config @returns {Object} */
export function createClaudeProcessingProvider(config = {}) {
  const provider = {
    ...createBaseProcessingProvider(config),
    apiKey: config.apiKey,
    apiUrl: "https://api.anthropic.com",
    model: config.processingModel || "claude-3-opus-20240229",

    verifyApiKey: async (apiKey) => {
      if (!apiKey) return { valid: false, error: "API key is empty" };

      const response = await fetch(`${provider.apiUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          valid: false,
          error: error.error?.message || "Invalid API key",
        };
      }

      return { valid: true };
    },

    processTranscription: async (transcription, options = {}) => {
      if (!provider.apiKey) throw new Error("API key not configured");

      const systemPrompt = `You are an AI assistant that processes WhatsApp voice message transcriptions. Process the following transcript following these exact instructions:

Your response MUST follow this exact format with FOUR sections separated by '----':
[original transcript] ---- [grammatically corrected version in the original language - ${
        options.language || "auto-detected"
      }]\n[English translation if needed] ---- [concise summary in English] ---- [natural reply in the original language]

Instructions for each section:
1. First section: Copy the original transcript exactly as provided.
2. Second section: Create a grammatically correct, polished version of the transcript. Remove filler words, false starts, and repetitions. Maintain the original meaning. Then, on the next line, provide the English translation if the original language is not English.
3. Third section: Write a concise 1-2 sentence summary in English that captures the core message and key information from the transcript.
4. Fourth section: Suggest a natural, conversational reply that directly addresses the main points or questions from the message. The reply should sound like something a real person would say in a WhatsApp conversation (not formal or robotic).

Use ONLY '----' as separators with no additional text, headers, or explanations.`;

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
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `TRANSCRIPT: ${transcription}`,
            },
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Processing failed");
      }

      const result = await response.json();
      const content = result.content[0].text;
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
