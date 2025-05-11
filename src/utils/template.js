/** @param {string} template @param {Object} variables @returns {string} */
export function renderTemplate(template, variables = {}) {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    return variables[trimmedKey] !== undefined ? variables[trimmedKey] : match;
  });
}

export const defaultTemplates = {
  openai: {
    processing: `You are an AI assistant that processes WhatsApp voice message transcriptions. Process the following transcript following these exact instructions:

Your response MUST follow this exact format with FOUR sections separated by '----':
[original transcript] ---- [grammatically corrected version in {{language}}]\n[English translation] ---- [concise summary in English] ---- [natural reply in {{language}}]

Instructions for each section:
1. First section: Copy the original transcript exactly as provided.
2. Second section: Create a grammatically correct, polished version of the transcript in {{language}}. Remove filler words, false starts, and repetitions. Maintain the original meaning. Then, on the next line, provide the English translation.
3. Third section: Write a concise 1-2 sentence summary in English that captures the core message and key information from the transcript.
4. Fourth section: Suggest a natural, conversational reply in {{language}} that directly addresses the main points or questions from the message. The reply should sound like something a real person would say in a WhatsApp conversation (not formal or robotic).

Use ONLY '----' as separators with no additional text, headers, or explanations.

TRANSCRIPT:
{{transcription}}`,
  },

  claude: {
    processing: `Process the following WhatsApp voice message transcript following these exact instructions:

Your response MUST follow this exact format with FOUR sections separated by '----':
[original transcript] ---- [grammatically corrected version in {{language}}]\n[English translation] ---- [concise summary in English] ---- [natural reply in {{language}}]

Instructions for each section:
1. First section: Copy the original transcript exactly as provided.
2. Second section: Create a grammatically correct, polished version of the transcript in {{language}}. Remove filler words, false starts, and repetitions. Maintain the original meaning. Then, on the next line, provide the English translation.
3. Third section: Write a concise 1-2 sentence summary in English that captures the core message and key information from the transcript.
4. Fourth section: Suggest a natural, conversational reply in {{language}} that directly addresses the main points or questions from the message. The reply should sound like something a real person would say in a WhatsApp conversation.

Use ONLY '----' as separators with no additional text.

TRANSCRIPT:
{{transcription}}`,
  },
};
