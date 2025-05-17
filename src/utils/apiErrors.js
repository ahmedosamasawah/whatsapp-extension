const errorTypes = {
  auth: (type) =>
    ["authentication_error", "unauthorized"].some((t) => type.includes(t)),
  quota: (type) =>
    ["insufficient_quota", "quota", "rate_limit"].some((t) => type.includes(t)),
  invalidRequest: (type) => ["invalid_request_error"].includes(type),
};

function baseErrorParser(
  errorData,
  defaultMessage = "API request failed",
  options = {}
) {
  try {
    const error =
      typeof errorData === "string" ? JSON.parse(errorData) : errorData;

    if (!error || !error.error) {
      return {
        message: defaultMessage,
        type: "unknown",
        userMessage:
          "There was an error processing your request. Please try again.",
      };
    }

    const errorType = options.getErrorType(error) || "unknown";
    const errorMessage = options.getErrorMessage(error) || defaultMessage;

    if (errorTypes.auth(errorType)) {
      return {
        message: "Authentication failed. Please check your API key.",
        type: "authentication",
        userMessage:
          "Your API key appears to be invalid. Please check your settings.",
      };
    }

    if (errorTypes.quota(errorType)) {
      return {
        message: `Your ${options.providerName} API key has reached its usage limit. Please check your billing details or use a different API key.`,
        type: "quota_exceeded",
        userMessage: `Your API key has reached its usage limit. Please check your ${options.providerName} account billing details or update your API key.`,
      };
    }

    if (errorTypes.invalidRequest(errorType)) {
      return {
        message: errorMessage || "Invalid request to the API",
        type: "invalid_request",
        userMessage:
          "There was a problem with the request. Please check your settings.",
      };
    }

    return {
      message: errorMessage || defaultMessage,
      type: errorType || "unknown",
      userMessage:
        "There was an error processing your request. Please try again.",
    };
  } catch (parseError) {
    return {
      message: typeof errorData === "string" ? errorData : defaultMessage,
      type: "unknown",
      userMessage:
        "There was an error processing your request. Please try again.",
    };
  }
}

export function parseOpenAIError(
  errorText,
  defaultMessage = "API request failed"
) {
  return baseErrorParser(errorText, defaultMessage, {
    providerName: "OpenAI",
    getErrorType: (error) => error.error?.type || "",
    getErrorMessage: (error) => error.error?.message || defaultMessage,
  });
}

export function parseClaudeError(
  errorData,
  defaultMessage = "API request failed"
) {
  return baseErrorParser(errorData, defaultMessage, {
    providerName: "Anthropic",
    getErrorType: (error) => error.error?.type || "",
    getErrorMessage: (error) => error.error?.message || defaultMessage,
  });
}

export function formatTranscriptionError(error) {
  const errorData = error.cause || {};
  const message = error.message || "Unknown error";
  const type = errorData.type || "unknown";
  let cleanedMessage = "";

  if (type === "quota_exceeded")
    cleanedMessage =
      "Please update your API key in the extension settings or check your OpenAI account billing details.";
  else if (type === "authentication")
    cleanedMessage = "Invalid API key. Please check your settings.";
  else cleanedMessage = "Try again later or check the extension settings.";

  return {
    transcript: `ERROR: ${message}`,
    cleaned: cleanedMessage,
    summary: "",
    reply: "",
  };
}
