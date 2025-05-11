/** @param {string|Object} errorData @param {string} defaultMessage @param {Object} options @returns {Object} */
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

    const errorType = options.getErrorType(error);
    const errorMessage = options.getErrorMessage(error);

    if (options.isAuthError(error, errorType)) {
      return {
        message: "Authentication failed. Please check your API key.",
        type: "authentication",
        userMessage:
          "Your API key appears to be invalid. Please check your settings.",
      };
    }

    if (options.isQuotaError(error, errorType)) {
      return {
        message: `Your ${options.providerName} API key has reached its usage limit. Please check your billing details or use a different API key.`,
        type: "quota_exceeded",
        userMessage: `Your API key has reached its usage limit. Please check your ${options.providerName} account billing details or update your API key.`,
      };
    }

    if (
      options.isInvalidRequest &&
      options.isInvalidRequest(error, errorType)
    ) {
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

/** @param {string} errorText @param {string} defaultMessage @returns {Object} */
export function parseOpenAIError(
  errorText,
  defaultMessage = "API request failed"
) {
  return baseErrorParser(errorText, defaultMessage, {
    providerName: "OpenAI",
    getErrorType: (error) => error.error?.type || "",
    getErrorMessage: (error) => error.error?.message || defaultMessage,
    isAuthError: (error, errorType) => errorType === "authentication_error",
    isQuotaError: (error, errorType) => errorType === "insufficient_quota",
    isInvalidRequest: (error, errorType) =>
      errorType === "invalid_request_error",
  });
}

/** @param {string|Object} errorData @param {string} defaultMessage @returns {Object} */
export function parseClaudeError(
  errorData,
  defaultMessage = "API request failed"
) {
  return baseErrorParser(errorData, defaultMessage, {
    providerName: "Anthropic",
    getErrorType: (error) => error.error?.type || "",
    getErrorMessage: (error) => error.error?.message || defaultMessage,
    isAuthError: (error, errorType) => {
      return (
        errorType.includes("authentication") ||
        errorType.includes("unauthorized")
      );
    },
    isQuotaError: (error, errorType) => {
      return errorType.includes("quota") || errorType.includes("rate_limit");
    },
  });
}

/** @param {Error|string} error @returns {{transcript: string, cleaned: string, summary: string, reply: string}} */
export function formatTranscriptionError(error) {
  const errorMessage = typeof error === "string" ? error : error.message;

  return {
    transcript: `ERROR: ${errorMessage}`,
    cleaned: errorMessage.includes("API key has reached its usage limit")
      ? "Please update your API key in the extension settings or check your OpenAI account billing details."
      : "Try again later or check the extension settings.",
    summary: "",
    reply: "",
  };
}
