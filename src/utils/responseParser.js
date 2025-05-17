/** @param {string} response @param {string} originalTranscription @returns {{transcript: string, cleaned: string, summary: string, reply: string}} */
export function parseProcessedResponse(response, originalTranscription) {
  let result = {
    transcript: originalTranscription,
    cleaned: "",
    summary: "",
    reply: "",
  };

  try {
    const json = JSON.parse(response);
    if (json && typeof json === "object") {
      result.transcript = json.original_transcript || originalTranscription;
      result.cleaned = json.cleaned_transcript || "";
      result.summary = json.summary || "";
      result.reply = json.reply || "";

      if (!json.cleaned_transcript) console.warn("Missing cleaned_transcript");
      if (!json.summary) console.warn("Missing summary");
      if (!json.reply) console.warn("Missing reply");
      return result;
    }
  } catch (error) {
    console.warn("Failed to parse JSON:", error.message);
    result.cleaned = response.trim();
    result.summary = "Error: Could not parse AI response as JSON";
    result.reply = "Please try transcribing again";
  }

  return result;
}
