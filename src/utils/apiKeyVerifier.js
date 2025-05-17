import { parseOpenAIError, parseClaudeError } from "./apiErrors.js";

export async function verifyApiKey(options) {
  const { apiKey, providerType, apiUrl, model, customValidation } = options;

  if (!apiKey) return { valid: false, error: "API key is empty" };

  if (customValidation?.formatCheck && !customValidation.formatCheck(apiKey))
    return {
      valid: false,
      error: customValidation.formatErrorMessage || "Invalid API key format",
    };

  try {
    if (providerType === "openai") return await verifyOpenAIKey(apiKey, apiUrl);
    else if (providerType === "claude") {
      console.log("Verifying Claude key", apiKey, "\n", apiUrl, "\n");
      return await verifyClaudeKey(apiKey, apiUrl, model);
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message || `Error validating ${providerType} API key`,
    };
  }
}

async function verifyOpenAIKey(apiKey, apiUrl) {
  const response = await fetch(`${apiUrl}/v1/models`, {
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
}

async function verifyClaudeKey(apiKey, apiUrl, model) {
  const response = await fetch(`${apiUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    const errorData = parseClaudeError(error, "Invalid API key");
    return {
      valid: false,
      error: errorData.message,
    };
  }

  return { valid: true };
}
