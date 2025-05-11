/** @param {string} errorText @param {string} defaultMessage @returns {Object} */
export function parseOpenAIError(
  errorText,
  defaultMessage = "API request failed"
) {
  try {
    const errorData = JSON.parse(errorText);

    if (!errorData.error)
      return {
        message: defaultMessage,
        type: "unknown",
        userMessage:
          "There was an error processing your request. Please try again.",
      };

    switch (errorData.error.type) {
      case "insufficient_quota":
        return {
          message:
            "Your OpenAI API key has reached its usage limit. Please check your billing details or use a different API key.",
          type: "quota_exceeded",
          userMessage:
            "Your API key has reached its usage limit. Please check your OpenAI account billing details or update your API key.",
        };

      case "invalid_request_error":
        return {
          message: errorData.error.message || "Invalid request to the API",
          type: "invalid_request",
          userMessage:
            "There was a problem with the request. Please check your settings.",
        };

      case "authentication_error":
        return {
          message: "Authentication failed. Please check your API key.",
          type: "authentication",
          userMessage:
            "Your API key appears to be invalid. Please check your settings.",
        };

      default:
        return {
          message: errorData.error.message || defaultMessage,
          type: errorData.error.type || "unknown",
          userMessage:
            "There was an error processing your request. Please try again.",
        };
    }
  } catch (parseError) {
    return {
      message: errorText || defaultMessage,
      type: "unknown",
      userMessage:
        "There was an error processing your request. Please try again.",
    };
  }
}

/** @param {string|Object} errorData @param {string} defaultMessage @returns {Object} */
export function parseClaudeError(
  errorData,
  defaultMessage = "API request failed"
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

    const errorType = error.error.type || "";

    if (
      errorType.includes("authentication") ||
      errorType.includes("unauthorized")
    ) {
      return {
        message: "Authentication failed. Please check your API key.",
        type: "authentication",
        userMessage:
          "Your API key appears to be invalid. Please check your settings.",
      };
    }

    if (errorType.includes("quota") || errorType.includes("rate_limit")) {
      return {
        message:
          "Your Anthropic API key has reached its usage limit. Please check your billing details or use a different API key.",
        type: "quota_exceeded",
        userMessage:
          "Your API key has reached its usage limit. Please check your Anthropic account billing details or update your API key.",
      };
    }

    return {
      message: error.error.message || defaultMessage,
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
