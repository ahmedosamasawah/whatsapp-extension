export const createBaseProcessor = () => ({
  verifyApiKey: async () => {
    throw new Error("Function 'verifyApiKey' must be implemented");
  },

  processTranscription: async () => {
    throw new Error("Function 'processTranscription' must be implemented");
  },
});
  