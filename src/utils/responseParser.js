/** @param {string} response @param {string} originalTranscription @returns {{transcript: string, cleaned: string, summary: string, reply: string}} */
export function parseProcessedResponse(response, originalTranscription) {
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
