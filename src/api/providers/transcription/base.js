export const createBaseTranscriber = () => ({
  verifyApiKey: async () => {
    throw new Error("Function 'verifyApiKey' must be implemented");
  },

  transcribeAudio: async () => {
    throw new Error("Function 'transcribeAudio' must be implemented");
  },
});
