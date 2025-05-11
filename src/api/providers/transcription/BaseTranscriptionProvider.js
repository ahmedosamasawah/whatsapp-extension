/** @param {Object} config @returns {Object} */
export function createBaseTranscriptionProvider(config = {}) {
  return {
    config,
    /** @param {string} apiKey @returns {Promise<{valid: boolean, error?: string}>} */
    verifyApiKey: async (apiKey) => {
      throw new Error("Function 'verifyApiKey' must be implemented");
    },

    /** @param {Blob} audioBlob @param {Object} options @returns {Promise<string>} */
    transcribeAudio: async (audioBlob, options = {}) => {
      throw new Error("Function 'transcribeAudio' must be implemented");
    },
  };
}
