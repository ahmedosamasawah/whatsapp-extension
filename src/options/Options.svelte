<script>
  import {
    apiKey,
    availableModels,
    initializeStores,
    selectedAnalysisModel,
    transcriptionSettings,
    selectedTranscriptionModel,
  } from "../lib/stores.js";

  let apiKeyValue = "";
  let language = "auto";
  let analysisModel = "";
  let isVerifying = false;
  let promptTemplate = "";
  let generateReply = true;
  let generateCleaned = true;
  let generateSummary = true;
  let transcriptionModel = "";
  let verificationStatus = null;
  let modelSaveStatus = null;
  let transcriptionSaveStatus = null;

  const languages = [
    { id: "auto", name: "Auto-detect" },
    { id: "en", name: "English" },
    { id: "es", name: "Spanish" },
    { id: "fr", name: "French" },
    { id: "de", name: "German" },
    { id: "it", name: "Italian" },
    { id: "pt", name: "Portuguese" },
    { id: "nl", name: "Dutch" },
    { id: "ru", name: "Russian" },
    { id: "ja", name: "Japanese" },
    { id: "zh", name: "Chinese" },
    { id: "ar", name: "Arabic" },
  ];

  const defaultPromptTemplate = `Based on the voice message transcript, generate four outputs:
1. TRANSCRIPT: The exact transcript
2. CLEANED: A grammatically corrected, filler-word-free version
3. SUMMARY: A concise summary in 1-2 sentences
4. REPLY: A natural, helpful suggested reply to this message`;

  (async () => {
    await initializeStores();

    const unsubscribeApiKey = apiKey.subscribe((value) => {
      apiKeyValue = value;
    });

    const unsubscribeTranscriptionModel = selectedTranscriptionModel.subscribe(
      (value) => {
        transcriptionModel = value;
      }
    );

    const unsubscribeAnalysisModel = selectedAnalysisModel.subscribe(
      (value) => {
        analysisModel = value;
      }
    );

    const unsubscribeSettings = transcriptionSettings.subscribe((value) => {
      generateCleaned = value.generateCleaned;
      generateSummary = value.generateSummary;
      generateReply = value.generateReply;
      language = value.language;
      promptTemplate = value.promptTemplate;
    });

    return () => {
      unsubscribeApiKey();
      unsubscribeSettings();
      unsubscribeAnalysisModel();
      unsubscribeTranscriptionModel();
    };
  })();

  async function saveApiKey() {
    if (!apiKeyValue) {
      verificationStatus = { valid: false, message: "API key cannot be empty" };
      return;
    }

    isVerifying = true;
    verificationStatus = null;

    const result = await chrome.runtime.sendMessage({
      action: "verifyApiKey",
      apiKey: apiKeyValue,
    });

    if (result.valid) {
      apiKey.set(apiKeyValue);
      verificationStatus = {
        valid: true,
        message: "API key verified successfully!",
      };
    } else {
      verificationStatus = {
        valid: false,
        message: result.error || "Invalid API key",
      };
    }

    isVerifying = false;
  }

  function saveModelSettings() {
    console.log("saveModelSettings called");
    console.log("transcriptionModel:", transcriptionModel);
    console.log("analysisModel:", analysisModel);

    selectedTranscriptionModel.set(transcriptionModel);
    selectedAnalysisModel.set(analysisModel);

    try {
      chrome.runtime.sendMessage({ action: "settingsUpdated" }, (response) => {
        // Check if there was an error with the messaging
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.log("Message error:", lastError.message);
          // The settings were still saved locally even if messaging failed
        }

        console.log("settingsUpdated response:", response);
        // Show success message
        modelSaveStatus = {
          success: true,
          message: "Model settings saved successfully!",
        };

        // Clear the message after 3 seconds
        setTimeout(() => {
          modelSaveStatus = null;
        }, 3000);
      });
    } catch (error) {
      console.error("Error sending settings updated message:", error);
      // The settings were still saved locally even if messaging failed
      modelSaveStatus = {
        success: true,
        message: "Model settings saved successfully!",
      };

      // Clear the message after 3 seconds
      setTimeout(() => {
        modelSaveStatus = null;
      }, 3000);
    }
  }

  function saveTranscriptionSettings() {
    transcriptionSettings.set({
      generateCleaned,
      generateSummary,
      generateReply,
      language,
      promptTemplate: promptTemplate || defaultPromptTemplate,
    });

    try {
      chrome.runtime.sendMessage({ action: "settingsUpdated" }, (response) => {
        // Check if there was an error with the messaging
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.log("Message error:", lastError.message);
          // The settings were still saved locally even if messaging failed
        }

        console.log("transcription settings updated:", response);
        // Show success message
        transcriptionSaveStatus = {
          success: true,
          message: "Transcription settings saved successfully!",
        };

        // Clear the message after 3 seconds
        setTimeout(() => {
          transcriptionSaveStatus = null;
        }, 3000);
      });
    } catch (error) {
      console.error("Error sending settings updated message:", error);
      // The settings were still saved locally even if messaging failed
      transcriptionSaveStatus = {
        success: true,
        message: "Transcription settings saved successfully!",
      };

      // Clear the message after 3 seconds
      setTimeout(() => {
        transcriptionSaveStatus = null;
      }, 3000);
    }
  }

  function resetPromptTemplate() {
    promptTemplate = defaultPromptTemplate;
  }
</script>

<div class="max-w-4xl mx-auto p-5 font-sans text-gray-800">
  <h1 class="text-[#00a884] text-2xl mb-8 mt-0 text-center font-bold">
    WhatsApp AI Transcriber Plus Settings
  </h1>

  <section class="bg-white p-6 rounded-xl shadow-md mb-8">
    <h2 class="text-[#00a884] text-xl mt-0 mb-5 border-b border-gray-200 pb-3">
      API Key
    </h2>
    <div>
      <div class="mb-5">
        <label for="api-key" class="block mb-2 font-medium"
          >OpenAI API Key</label
        >
        <div class="flex gap-2">
          <input
            type="text"
            id="api-key"
            placeholder="sk-..."
            bind:value={apiKeyValue}
            disabled={isVerifying}
            class="w-full p-2.5 border border-gray-300 rounded-md text-base"
          />
          <button
            type="button"
            onclick={saveApiKey}
            disabled={isVerifying}
            class="bg-[#00a884] text-white border-0 py-2.5 px-4 text-base rounded-md cursor-pointer transition-colors hover:bg-[#008f72] disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isVerifying ? "Verifying..." : "Save & Verify"}
          </button>
        </div>
        {#if verificationStatus}
          <div
            class={[
              "mt-2.5 p-2 rounded-tr-md rounded-br-md text-sm",
              verificationStatus.valid &&
                "bg-green-50 text-green-600 border-l-2 border-green-500",
              !verificationStatus.valid &&
                "bg-red-50 text-red-600 border-l-4 border-red-500",
            ]}
          >
            {verificationStatus.message}
          </div>
        {/if}
      </div>
    </div>

    <div
      class="mt-5 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-tr-md rounded-br-md"
    >
      <h3 class="mt-0 text-blue-600 text-base font-medium">
        How to Get an OpenAI API Key
      </h3>
      <ol class="pl-5 list-decimal">
        <li class="mb-1">
          Go to <a
            href="https://platform.openai.com/signup"
            target="_blank"
            class="text-blue-600 no-underline hover:underline"
            >OpenAI Platform</a
          > and create an account or sign in.
        </li>
        <li class="mb-1">
          Navigate to <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            class="text-blue-600 no-underline hover:underline">API Keys</a
          > in your account dashboard.
        </li>
        <li class="mb-1">Click on "Create new secret key" and copy the key.</li>
        <li class="mb-1">
          Paste the key in the field above and click "Save & Verify".
        </li>
      </ol>
      <p class="italic text-gray-600 mb-2">
        Note: The OpenAI API is a paid service. You will be charged based on
        your usage.
      </p>
    </div>
  </section>

  <!-- <section class="bg-white p-6 rounded-xl shadow-md mb-8">
    <h2 class="text-[#00a884] text-xl mt-0 mb-5 border-b border-gray-200 pb-3">
      AI Models
    </h2>
    <div>
      <div class="mb-5">
        <label for="transcription-model" class="block mb-2 font-medium"
          >Transcription Model</label
        >
        <select
          id="transcription-model"
          bind:value={transcriptionModel}
          class="w-full p-2.5 border border-gray-300 rounded-md text-base appearance-none"
        >
          {#each $availableModels.filter((m) => m.type === "transcription") as model}
            <option value={model.id}>{model.name}</option>
          {/each}
        </select>
      </div>

      <div class="mb-5">
        <label for="analysis-model" class="block mb-2 font-medium"
          >Analysis Model</label
        >
        <select
          id="analysis-model"
          bind:value={analysisModel}
          class="w-full p-2.5 border border-gray-300 rounded-md text-base appearance-none"
        >
          {#each $availableModels.filter((m) => m.type === "analysis") as model}
            <option value={model.id}>{model.name}</option>
          {/each}
        </select>
        <p class="text-xs text-gray-600 mt-1.5 mb-0">
          This model processes the transcription to generate the cleaned
          version, summary, and suggested reply.
        </p>
      </div>

      <div class="flex justify-between items-center mt-5">
        {#if modelSaveStatus}
          <div
            class="bg-green-50 text-green-600 border-l-2 border-green-500 p-2 rounded-tr-md rounded-br-md text-sm flex-1 mr-4"
          >
            {modelSaveStatus.message}
          </div>
        {:else}
          <div></div>
        {/if}
        <button
          type="button"
          onclick={saveModelSettings}
          class="bg-[#00a884] text-white border-0 py-2.5 px-4 text-base rounded-md cursor-pointer transition-colors hover:bg-[#008f72]"
        >
          Save Model Settings
        </button>
      </div>
    </div>
  </section> -->

  <section class="bg-white p-6 rounded-xl shadow-md mb-8">
    <h2 class="text-[#00a884] text-xl mt-0 mb-5 border-b border-gray-200 pb-3">
      Transcription Settings
    </h2>
    <div>
      <div class="mb-5">
        <label for="language" class="block mb-2 font-medium"
          >Preferred Language</label
        >
        <select
          id="language"
          bind:value={language}
          class="w-full p-2.5 border border-gray-300 rounded-md text-base appearance-none"
        >
          {#each languages as lang}
            <option value={lang.id}>{lang.name}</option>
          {/each}
        </select>
        <p class="text-xs text-gray-600 mt-1.5 mb-0">
          Auto-detect will try to identify the language in the audio.
        </p>
      </div>

      <div class="mb-5">
        <h3 class="text-gray-800 text-base font-medium my-2.5">
          Generate Outputs
        </h3>
        <label class="flex items-center mb-2.5 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={generateCleaned}
            class="w-4 h-4 text-[#00a884] bg-gray-100 border-gray-300 rounded focus:ring-[#00a884] focus:ring-2"
          />
          <span class="ml-2"
            >Cleaned Version (fixed grammar, filler removal)</span
          >
        </label>

        <label class="flex items-center mb-2.5 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={generateSummary}
            class="w-4 h-4 text-[#00a884] bg-gray-100 border-gray-300 rounded focus:ring-[#00a884] focus:ring-2"
          />
          <span class="ml-2">Brief Summary</span>
        </label>

        <label class="flex items-center mb-2.5 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={generateReply}
            class="w-4 h-4 text-[#00a884] bg-gray-100 border-gray-300 rounded focus:ring-[#00a884] focus:ring-2"
          />
          <span class="ml-2">Suggested Reply</span>
        </label>
      </div>

      <div class="mb-5">
        <label for="prompt-template" class="block mb-2 font-medium"
          >Prompt Template</label
        >
        <div class="relative">
          <textarea
            id="prompt-template"
            bind:value={promptTemplate}
            rows="8"
            placeholder={defaultPromptTemplate}
            class="w-full p-2.5 border border-gray-300 rounded-md text-base resize-y min-h-[100px] font-sans leading-normal"
          ></textarea>
          <button
            type="button"
            class="absolute bottom-2.5 right-2.5 text-xs py-1 px-2.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onclick={resetPromptTemplate}
          >
            Reset to Default
          </button>
        </div>
        <p class="text-xs text-gray-600 mt-1.5 mb-0">
          This prompt is sent to the AI model to generate the outputs. Use
          "TRANSCRIPT" as a placeholder for the transcription.
        </p>
      </div>

      <div class="flex justify-between items-center mt-5">
        {#if transcriptionSaveStatus}
          <div
            class="bg-green-50 text-green-600 border-l-2 border-green-500 p-2 rounded-tr-md rounded-br-md text-sm flex-1 mr-4"
          >
            {transcriptionSaveStatus.message}
          </div>
        {:else}
          <div></div>
        {/if}
        <button
          type="button"
          onclick={saveTranscriptionSettings}
          class="bg-[#00a884] text-white border-0 py-2.5 px-4 text-base rounded-md cursor-pointer transition-colors hover:bg-[#008f72]"
        >
          Save Settings
        </button>
      </div>
    </div>
  </section>
</div>
