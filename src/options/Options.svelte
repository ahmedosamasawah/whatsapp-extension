<script>
  import { onMount } from "svelte";
  import {
    apiKey,
    availableModels,
    initializeStores,
    selectedAnalysisModel,
    transcriptionSettings,
    selectedTranscriptionModel,
  } from "../lib/stores.js";

  let apiKeyValue = "";
  let isVerifying = false;
  let verificationStatus = null;
  let transcriptionModel = "";
  let analysisModel = "";
  let generateCleaned = true;
  let generateSummary = true;
  let generateReply = true;
  let language = "auto";
  let promptTemplate = "";

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

  onMount(async () => {
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
  });

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
    selectedTranscriptionModel.set(transcriptionModel);
    selectedAnalysisModel.set(analysisModel);

    chrome.runtime.sendMessage({ action: "settingsUpdated" });
  }

  function saveTranscriptionSettings() {
    transcriptionSettings.set({
      generateCleaned,
      generateSummary,
      generateReply,
      language,
      promptTemplate: promptTemplate || defaultPromptTemplate,
    });

    chrome.runtime.sendMessage({ action: "settingsUpdated" });
  }

  function resetPromptTemplate() {
    promptTemplate = defaultPromptTemplate;
  }
</script>

<div class="container">
  <h1>WhatsApp AI Transcriber Plus Settings</h1>

  <section class="settings-section">
    <h2>API Key</h2>
    <form on:submit|preventDefault={saveApiKey}>
      <div class="form-group">
        <label for="api-key">OpenAI API Key</label>
        <div class="input-group">
          <input
            type="text"
            id="api-key"
            placeholder="sk-..."
            bind:value={apiKeyValue}
            disabled={isVerifying}
          />
          <button type="submit" disabled={isVerifying}>
            {isVerifying ? "Verifying..." : "Save & Verify"}
          </button>
        </div>
        {#if verificationStatus}
          <div
            class="status-message"
            class:success={verificationStatus.valid}
            class:error={!verificationStatus.valid}
          >
            {verificationStatus.message}
          </div>
        {/if}
      </div>
    </form>

    <div class="info-box">
      <h3>How to Get an OpenAI API Key</h3>
      <ol>
        <li>
          Go to <a href="https://platform.openai.com/signup" target="_blank"
            >OpenAI Platform</a
          > and create an account or sign in.
        </li>
        <li>
          Navigate to <a
            href="https://platform.openai.com/api-keys"
            target="_blank">API Keys</a
          > in your account dashboard.
        </li>
        <li>Click on "Create new secret key" and copy the key.</li>
        <li>Paste the key in the field above and click "Save & Verify".</li>
      </ol>
      <p class="note">
        Note: The OpenAI API is a paid service. You will be charged based on
        your usage.
      </p>
    </div>
  </section>

  <section class="settings-section">
    <h2>AI Models</h2>
    <form on:submit|preventDefault={saveModelSettings}>
      <div class="form-group">
        <label for="transcription-model">Transcription Model</label>
        <select id="transcription-model" bind:value={transcriptionModel}>
          {#each $availableModels.filter((m) => m.type === "transcription") as model}
            <option value={model.id}>{model.name}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="analysis-model">Analysis Model</label>
        <select id="analysis-model" bind:value={analysisModel}>
          {#each $availableModels.filter((m) => m.type === "analysis") as model}
            <option value={model.id}>{model.name}</option>
          {/each}
        </select>
        <p class="helper-text">
          This model processes the transcription to generate the cleaned
          version, summary, and suggested reply.
        </p>
      </div>

      <div class="button-row">
        <button type="submit">Save Model Settings</button>
      </div>
    </form>
  </section>

  <section class="settings-section">
    <h2>Transcription Settings</h2>
    <form on:submit|preventDefault={saveTranscriptionSettings}>
      <div class="form-group">
        <label for="language">Preferred Language</label>
        <select id="language" bind:value={language}>
          {#each languages as lang}
            <option value={lang.id}>{lang.name}</option>
          {/each}
        </select>
        <p class="helper-text">
          Auto-detect will try to identify the language in the audio.
        </p>
      </div>

      <div class="checkbox-group">
        <h3>Generate Outputs</h3>
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={generateCleaned} />
          <span>Cleaned Version (fixed grammar, filler removal)</span>
        </label>

        <label class="checkbox-label">
          <input type="checkbox" bind:checked={generateSummary} />
          <span>Brief Summary</span>
        </label>

        <label class="checkbox-label">
          <input type="checkbox" bind:checked={generateReply} />
          <span>Suggested Reply</span>
        </label>
      </div>

      <div class="form-group">
        <label for="prompt-template">Prompt Template</label>
        <div class="textarea-with-buttons">
          <textarea
            id="prompt-template"
            bind:value={promptTemplate}
            rows="8"
            placeholder={defaultPromptTemplate}
          ></textarea>
          <button
            type="button"
            class="reset-button"
            on:click={resetPromptTemplate}
          >
            Reset to Default
          </button>
        </div>
        <p class="helper-text">
          This prompt is sent to the AI model to generate the outputs. Use
          "TRANSCRIPT" as a placeholder for the transcription.
        </p>
      </div>

      <div class="button-row">
        <button type="submit">Save Settings</button>
      </div>
    </form>
  </section>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    color: #333;
  }

  h1 {
    color: #00a884;
    font-size: 28px;
    margin-top: 0;
    margin-bottom: 30px;
    text-align: center;
  }

  h2 {
    color: #00a884;
    font-size: 20px;
    margin-top: 0;
    margin-bottom: 20px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  }

  h3 {
    color: #333;
    font-size: 16px;
    margin: 15px 0 10px;
  }

  .settings-section {
    background-color: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    margin-bottom: 30px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }

  input[type="text"],
  select,
  textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
    box-sizing: border-box;
  }

  select {
    appearance: none;
    padding-right: 30px;
  }

  .input-group {
    display: flex;
    gap: 10px;
  }

  .input-group input {
    flex-grow: 1;
  }

  button {
    background-color: #00a884;
    color: white;
    border: none;
    padding: 10px 16px;
    font-size: 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  button:hover {
    background-color: #008f72;
  }

  button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .button-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .info-box {
    margin-top: 20px;
    padding: 15px;
    background-color: #f0f7ff;
    border-left: 4px solid #4285f4;
    border-radius: 4px;
  }

  .info-box h3 {
    margin-top: 0;
    color: #4285f4;
  }

  .info-box p {
    margin-bottom: 8px;
  }

  .info-box a {
    color: #4285f4;
    text-decoration: none;
  }

  .info-box a:hover {
    text-decoration: underline;
  }

  .helper-text {
    font-size: 13px;
    color: #666;
    margin-top: 5px;
    margin-bottom: 0;
  }

  .status-message {
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 14px;
  }

  .status-message.success {
    background-color: #e8f5e9;
    color: #4caf50;
    border-left: 3px solid #4caf50;
  }

  .status-message.error {
    background-color: #ffebee;
    color: #f44336;
    border-left: 3px solid #f44336;
  }

  .checkbox-group {
    margin-bottom: 20px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    cursor: pointer;
  }

  .checkbox-label input {
    margin-right: 10px;
  }

  .textarea-with-buttons {
    position: relative;
  }

  textarea {
    resize: vertical;
    min-height: 100px;
    font-family: inherit;
    line-height: 1.5;
  }

  .reset-button {
    position: absolute;
    bottom: 10px;
    right: 10px;
    font-size: 12px;
    padding: 5px 10px;
    background-color: #f0f0f0;
    color: #333;
  }

  .reset-button:hover {
    background-color: #e0e0e0;
  }

  .note {
    font-style: italic;
    color: #666;
  }

  /* Dark Mode Support */
  @media (prefers-color-scheme: dark) {
    body {
      background-color: #121212;
      color: #e0e0e0;
    }

    .container {
      color: #e0e0e0;
    }

    .settings-section {
      background-color: #222;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }

    h1,
    h2 {
      color: #25d366;
    }

    h2 {
      border-bottom-color: #444;
    }

    h3 {
      color: #e0e0e0;
    }

    input[type="text"],
    select,
    textarea {
      background-color: #333;
      border-color: #444;
      color: #e0e0e0;
    }

    .info-box {
      background-color: #1c2a3a;
      border-left-color: #4285f4;
    }

    .helper-text {
      color: #aaa;
    }

    .status-message.success {
      background-color: #1b5e20;
      color: #a5d6a7;
    }

    .status-message.error {
      background-color: #b71c1c;
      color: #ef9a9a;
    }

    .reset-button {
      background-color: #444;
      color: #e0e0e0;
    }

    .reset-button:hover {
      background-color: #555;
    }

    .note {
      color: #aaa;
    }
  }
</style>
