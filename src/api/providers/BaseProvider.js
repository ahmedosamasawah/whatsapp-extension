/** @param {Object} config @returns {Object} */
export function createBaseProvider(config = {}) {
  return {
    config,
    verifyApiKey: async (apiKey) => {
      throw new Error("Function 'verifyApiKey' must be implemented");
    },

    transcribeAudio: async (audioBlob, options = {}) => {
      throw new Error("Function 'transcribeAudio' must be implemented");
    },

    processTranscription: async (transcription, options = {}) => {
      throw new Error("Function 'processTranscription' must be implemented");
    },
  };
}
