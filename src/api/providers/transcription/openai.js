import { createBaseTranscriber } from "./base.js";
import { parseOpenAIError } from "../../../utils/apiErrors.js";
import { verifyApiKey } from "../../../utils/apiKeyVerifier.js";

const DEFAULT_CONFIG = {
  apiUrl: "https://api.openai.com",
  model: "whisper-1",
};

export const createOpenAITranscriber = (config = {}) => {
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

  const transcribeWithOpenAI = async (audioBlob, options = {}) => {
    if (!apiKey) throw new Error("API key not configured");

    const formData = new FormData();
    formData.append("model", settings.model);
    formData.append(
      "file",
      new File([audioBlob], "audio.ogg", { type: audioBlob.type })
    );

    if (options.language && options.language !== "auto")
      formData.append("language", options.language);

    const response = await fetch(`${settings.apiUrl}/v1/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = parseOpenAIError(errorText, "Transcription failed");
      throw new Error(errorData.message);
    }

    const result = await response.json();
    return result.text;
  };

  return {
    ...createBaseTranscriber(),
    verifyApiKey: verifyOpenAIKey,
    transcribeAudio: transcribeWithOpenAI,
  };
};
