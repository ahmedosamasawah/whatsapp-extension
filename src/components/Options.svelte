<script>
  import {
    settings,
    updateSettings,
    availableProviders,
    supportedLanguages,
    initializeSettings,
  } from "../store/settings.js";
  import { defaultTemplates } from "../utils/template.js";
  import { getDefaultProviderType } from "../api/index.js";
  import { verifyApiKey as verifyApiKeyService } from "../services/transcriptionService.js";

  let apiKey = $state("");
  let language = $state("auto");
  let promptTemplate = $state("");
  let isExtensionEnabled = $state(true);
  let processingModel = $state("gpt-4o");
  let transcriptionModel = $state("whisper-1");
  let providerType = $state(getDefaultProviderType());

  let isVerifying = $state(false);
  let settingsSaved = $state(null);
  let verificationStatus = $state(null);

  (async () => {
    await initializeSettings();

    const unsubscribe = settings.subscribe((value) => {
      if (Object.keys(value).length === 0) return;

      apiKey = value.apiKey || "";
      providerType = value.providerType || getDefaultProviderType();
      language = value.language || "auto";
      transcriptionModel = value.transcriptionModel || "whisper-1";
      processingModel = value.processingModel || "gpt-4o";
      promptTemplate = value.promptTemplate || "";
      isExtensionEnabled = value.isExtensionEnabled !== false;
    });

    return unsubscribe;
  })();

  function resetPromptTemplate() {
    promptTemplate =
      defaultTemplates[providerType]?.processing ||
      defaultTemplates.openai.processing;
  }

  async function verifyApiKey() {
    if (!apiKey) {
      verificationStatus = { valid: false, message: "API key cannot be empty" };
      return;
    }

    isVerifying = true;
    verificationStatus = null;

    try {
      const result = await verifyApiKeyService(apiKey, providerType);

      if (result.valid) {
        verificationStatus = {
          valid: true,
          message: "API key verified successfully!",
        };

        updateSettings({ apiKey });
      } else {
        verificationStatus = {
          valid: false,
          message: result.error || "Invalid API key",
        };
      }
    } catch (error) {
      verificationStatus = {
        valid: false,
        message: error.message || "Error verifying API key",
      };
    } finally {
      isVerifying = false;
    }
  }

  function saveSettings() {
    updateSettings({
      providerType,
      transcriptionModel,
      processingModel,
      language,
      promptTemplate,
      isExtensionEnabled,
    });

    settingsSaved = {
      success: true,
      message: "Settings saved successfully!",
    };

    setTimeout(() => (settingsSaved = null), 3000);
  }
</script>

<main class={["p-6 max-w-3xl mx-auto font-sans"]}>
  <header class={["mb-8"]}>
    <h1 class={["text-2xl font-bold text-[#128c7e] mb-2"]}>
      WhatsApp AI Transcriber Settings
    </h1>
    <p class={["text-gray-600"]}>
      Configure your WhatsApp transcription settings and AI provider.
    </p>
  </header>

  <section class={["mb-8 p-6 bg-white rounded-lg shadow-md"]}>
    <h2 class={["text-xl font-semibold mb-4 text-gray-800"]}>
      API Configuration
    </h2>

    <div class={["mb-4"]}>
      <label
        for="provider"
        class={["block text-sm font-medium text-gray-700 mb-1"]}
      >
        AI Provider
      </label>
      <select
        id="provider"
        bind:value={providerType}
        class={[
          "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00a884] focus:border-[#00a884]",
        ]}
      >
        {#each $availableProviders as provider}
          <option value={provider.id}>{provider.name}</option>
        {/each}
      </select>
    </div>

    <div class={["mb-4"]}>
      <label
        for="apiKey"
        class={["block text-sm font-medium text-gray-700 mb-1"]}
      >
        API Key
      </label>
      <div class={["flex"]}>
        <input
          id="apiKey"
          type="password"
          placeholder="Enter your API key"
          bind:value={apiKey}
          class={[
            "flex-1 p-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-[#00a884] focus:border-[#00a884]",
          ]}
        />
        <button
          onclick={verifyApiKey}
          disabled={isVerifying}
          class={[
            "bg-[#00a884] text-white px-4 py-2 rounded-r-md hover:bg-[#008f72] focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:ring-offset-2 disabled:opacity-50",
          ]}
          type="button"
        >
          {isVerifying ? "Verifying..." : "Verify"}
        </button>
      </div>

      {#if verificationStatus}
        <p
          class={[
            "mt-2 text-sm break-words max-w-full overflow-hidden",
            verificationStatus.valid ? "text-green-600" : "text-red-600",
          ]}
        >
          {verificationStatus.message}
        </p>
      {/if}

      <p class={["mt-2 text-xs text-gray-500"]}>
        Your API key is stored locally and used only for transcription requests.
      </p>
    </div>
  </section>

  <section class={["mb-8 p-6 bg-white rounded-lg shadow-md"]}>
    <h2 class={["text-xl font-semibold mb-4 text-gray-800"]}>Model Settings</h2>

    <div class={["mb-4"]}>
      <label
        for="transcriptionModel"
        class={["block text-sm font-medium text-gray-700 mb-1"]}
      >
        Transcription Model
      </label>
      <input
        id="transcriptionModel"
        type="text"
        bind:value={transcriptionModel}
        class={[
          "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00a884] focus:border-[#00a884]",
        ]}
      />
    </div>

    <div class={["mb-4"]}>
      <label
        for="processingModel"
        class={["block text-sm font-medium text-gray-700 mb-1"]}
      >
        Processing Model
      </label>
      <input
        id="processingModel"
        type="text"
        bind:value={processingModel}
        class={[
          "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00a884] focus:border-[#00a884]",
        ]}
      />
    </div>
  </section>

  <section class={["mb-8 p-6 bg-white rounded-lg shadow-md"]}>
    <h2 class={["text-xl font-semibold mb-4 text-gray-800"]}>
      Transcription Settings
    </h2>

    <div class={["mb-4"]}>
      <label
        for="language"
        class={["block text-sm font-medium text-gray-700 mb-1"]}
      >
        Language
      </label>
      <select
        id="language"
        bind:value={language}
        class={[
          "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00a884] focus:border-[#00a884]",
        ]}
      >
        {#each supportedLanguages as lang}
          <option value={lang.id}>{lang.name}</option>
        {/each}
      </select>
      <p class={["mt-1 text-xs text-gray-500"]}>
        Default language for transcription. Auto-detect will try to identify the
        language automatically.
      </p>
    </div>

    <div class={["mb-4"]}>
      <div class={["flex items-center justify-between"]}>
        <label
          for="extension-enabled"
          class={["text-sm font-medium text-gray-700"]}
        >
          Enable Extension
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={isExtensionEnabled}
          id="extension-enabled"
          class={[
            "relative inline-flex flex-shrink-0 h-6 w-11 border-2 items-center border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00a884]",
            isExtensionEnabled ? "bg-[#00a884]" : "bg-gray-200",
          ]}
          onclick={() => (isExtensionEnabled = !isExtensionEnabled)}
        >
          <span class="sr-only">Use setting</span>
          <span
            aria-hidden="true"
            class={[
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200",
              isExtensionEnabled ? "translate-x-[13px]" : "-translate-x-[9px]",
            ]}
          ></span>
        </button>
      </div>
      <p class={["mt-1 text-xs text-gray-500"]}>
        Turn the extension on or off without uninstalling.
      </p>
    </div>

    <div class={["mb-4"]}>
      <div class={["flex justify-between items-center mb-1"]}>
        <label
          for="promptTemplate"
          class={["block text-sm font-medium text-gray-700"]}
        >
          Prompt Template
        </label>
        <button
          onclick={resetPromptTemplate}
          class={["text-xs text-[#00a884] hover:text-[#008f72] underline"]}
          type="button"
        >
          Reset to default
        </button>
      </div>
      <textarea
        id="promptTemplate"
        bind:value={promptTemplate}
        rows="8"
        class={[
          "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00a884] focus:border-[#00a884] font-mono text-sm",
        ]}
        placeholder="Enter your custom prompt template"
      ></textarea>
      <p class={["mt-1 text-xs text-gray-500"]}>
        Customize how the AI processes your transcriptions. Use double curly
        braces around "transcription" and "language" to use them as variables.
      </p>
    </div>
  </section>

  <div class={["flex justify-end"]}>
    <button
      onclick={saveSettings}
      class={[
        "bg-[#00a884] text-white px-6 py-2 rounded-md hover:bg-[#008f72] focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:ring-offset-2",
      ]}
      type="button"
    >
      Save Settings
    </button>
  </div>

  {#if settingsSaved}
    <div class={["mt-4 p-3 bg-green-100 text-green-800 rounded-md"]}>
      {settingsSaved.message}
    </div>
  {/if}
</main>
