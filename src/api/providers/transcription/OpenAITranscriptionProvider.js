import { parseOpenAIError } from "../../../utils/apiErrors.js";
import { createBaseTranscriptionProvider } from "./BaseTranscriptionProvider.js";

/** @param {Object} config @returns {Object} */
export function createOpenAITranscriptionProvider(config = {}) {
  const provider = {
    ...createBaseTranscriptionProvider(config),
    apiKey: config.apiKey,
    apiUrl: "https://api.openai.com",
    transcriptionModel: config.transcriptionModel || "whisper-1",

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

    transcribeAudio: async (audioBlob, options = {}) => {
      if (!provider.apiKey) throw new Error("API key not configured");

      const formData = new FormData();
      formData.append("model", provider.transcriptionModel || "whisper-1");
      formData.append(
        "file",
        new File([audioBlob], "audio.ogg", { type: audioBlob.type })
      );

      if (options.language && options.language !== "auto")
        formData.append("language", options.language);

      const response = await fetch(
        `${provider.apiUrl}/v1/audio/transcriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        const errorData = parseOpenAIError(errorText, "Transcription failed");
        throw new Error(errorData.message);
      }

      const result = await response.json();
      return result.text;
    },
  };

  return provider;
}
