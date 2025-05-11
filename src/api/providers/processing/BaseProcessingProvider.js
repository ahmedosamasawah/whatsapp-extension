/** @param {Object} config @returns {Object} */
export function createBaseProcessingProvider(config = {}) {
  return {
    config,
    /** @param {string} apiKey @returns {Promise<{valid: boolean, error?: string}>} */
    verifyApiKey: async (apiKey) => {
      throw new Error("Function 'verifyApiKey' must be implemented");
    },

    /** @param {string} transcription @param {Object} options @returns {Promise<{transcript: string, cleaned: string, summary: string, reply: string}>} */
    processTranscription: async (transcription, options = {}) => {
      throw new Error("Function 'processTranscription' must be implemented");
    },
  };
}
