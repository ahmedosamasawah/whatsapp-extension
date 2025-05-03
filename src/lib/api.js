import { get } from "svelte/store";
import {
  extensionStatus,
  selectedAnalysisModel,
  transcriptionSettings,
  selectedTranscriptionModel,
  getApiKey as getApiKeyFunc,
} from "./stores";

/** @param {Blob} audioBlob */
export async function transcribeAudio(audioBlob) {
  const key = await getApiKeyFunc();
  const model = get(selectedTranscriptionModel);

  if (!key) throw new Error("API key not configured");

  extensionStatus.update((s) => ({
    ...s,
    pendingTranscriptions: s.pendingTranscriptions + 1,
    lastError: null,
  }));

  const formData = new FormData();
  formData.append("model", model);
  formData.append(
    "file",
    new File([audioBlob], "audio.ogg", { type: audioBlob.type })
  );

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${errorText}`);
  }

  const result = await response.json();
  extensionStatus.update((s) => ({
    ...s,
    pendingTranscriptions: s.pendingTranscriptions - 1,
  }));
  return result.text;
}

/** @param {string} transcription */
export async function analyzeTranscription(transcription) {
  const key = await getApiKeyFunc();
  const model = get(selectedAnalysisModel);
  const settings = get(transcriptionSettings);

  if (!key) throw new Error("API key not configured");

  extensionStatus.update((s) => ({
    ...s,
    pendingTranscriptions: s.pendingTranscriptions + 1,
    lastError: null,
  }));

  try {
    let systemPrompt =
      "You are an AI assistant that processes voice message transcriptions.";

    let userPrompt = settings.promptTemplate.replace(
      "TRANSCRIPT",
      transcription
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analysis failed: ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;

    const sections = parseAnalysisResponse(content, transcription);
    return sections;
  } catch (error) {
    extensionStatus.update((s) => ({ ...s, lastError: error.message }));
    throw error;
  } finally {
    extensionStatus.update((s) => ({
      ...s,
      pendingTranscriptions: s.pendingTranscriptions - 1,
    }));
  }
}

/** @param {string} response @param {string} originalTranscription */
function parseAnalysisResponse(response, originalTranscription) {
  const result = {
    transcript: originalTranscription,
    cleaned: "",
    summary: "",
    reply: "",
  };

  const cleanedMatch = response.match(
    /CLEANED:?\s*([\s\S]*?)(?=SUMMARY:|REPLY:|$)/i
  );
  const summaryMatch = response.match(/SUMMARY:?\s*([\s\S]*?)(?=REPLY:|$)/i);
  const replyMatch = response.match(/REPLY:?\s*([\s\S]*?)(?=$)/i);

  if (cleanedMatch && cleanedMatch[1]) result.cleaned = cleanedMatch[1].trim();
  if (summaryMatch && summaryMatch[1]) result.summary = summaryMatch[1].trim();
  if (replyMatch && replyMatch[1]) result.reply = replyMatch[1].trim();

  if (!result.cleaned && !result.summary && !result.reply) {
    const parts = response.split(/\d+\.\s+/);
    if (parts.length >= 5) {
      result.cleaned = parts[2]?.trim() || "";
      result.summary = parts[3]?.trim() || "";
      result.reply = parts[4]?.trim() || "";
    }
  }

  return result;
}

/** @param {Blob} audioBlob */
export async function processVoiceMessage(audioBlob) {
  const transcription = await transcribeAudio(audioBlob);
  const analysis = await analyzeTranscription(transcription);
  return analysis;
}
