<script>
  import { onMount } from "svelte";
  import {
    apiKey,
    extensionStatus,
    initializeStores,
    extensionStatusText,
  } from "../lib/stores.js";

  let statusMessage = "";
  let isEnabled = true;

  onMount(() => {
    initializeStores();

    const unsubscribe = extensionStatusText.subscribe((status) => {
      statusMessage = status.text;
    });

    const unsubscribeStatus = extensionStatus.subscribe((status) => {
      isEnabled = status.isExtensionEnabled;
    });

    return () => {
      unsubscribe();
      unsubscribeStatus();
    };
  });

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  function toggleExtension() {
    isEnabled = !isEnabled;
    extensionStatus.update((s) => ({
      ...s,
      isExtensionEnabled: isEnabled,
    }));

    chrome.runtime.sendMessage({
      action: "settingsUpdated",
    });
  }
</script>

<div class="container">
  <header>
    <h1>WhatsApp AI Transcriber Plus</h1>
  </header>

  <div class="status-container">
    <div class="status-row">
      <span class="status-label">Status:</span>
      <span
        class="status-value"
        class:error={$extensionStatusText.type === "error"}
        class:warning={$extensionStatusText.type === "warning"}
        class:success={$extensionStatusText.type === "success"}
      >
        <span
          class="status-icon"
          class:error={$extensionStatusText.type === "error"}
          class:warning={$extensionStatusText.type === "warning"}
          class:success={$extensionStatusText.type === "success"}
        ></span>
        {statusMessage}
      </span>
    </div>

    <div class="status-row">
      <span class="status-label">Extension:</span>
      <label class="toggle">
        <input
          type="checkbox"
          bind:checked={isEnabled}
          on:change={toggleExtension}
        />
        <span class="slider"></span>
      </label>
    </div>
  </div>

  <div class="button-container">
    <button class="settings-button" on:click={openOptions}>
      Open Settings
    </button>
  </div>

  <div class="info">
    <p>
      This extension transcribes WhatsApp voice messages using AI and provides:
    </p>
    <ul>
      <li>Raw transcription</li>
      <li>Cleaned version</li>
      <li>Brief summary</li>
      <li>Suggested reply</li>
    </ul>
    <p>
      {#if !$apiKey}
        Configure your API key in the settings to get started.
      {:else}
        Click the "Transcribe" button next to voice messages to analyze them.
      {/if}
    </p>
  </div>
</div>

<style>
  .container {
    width: 320px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    padding: 16px;
    color: #333;
  }

  header {
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
  }

  h1 {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    color: #00a884;
  }

  .status-container {
    background-color: #f5f5f5;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
  }

  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .status-row:last-child {
    margin-bottom: 0;
  }

  .status-label {
    font-weight: 500;
    font-size: 14px;
  }

  .status-value {
    display: flex;
    align-items: center;
    font-size: 14px;
  }

  .status-icon {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 6px;
  }

  .status-icon.success {
    background-color: #4caf50;
  }

  .status-icon.error {
    background-color: #f44336;
  }

  .status-icon.warning {
    background-color: #ff9800;
  }

  .status-value.success {
    color: #4caf50;
  }

  .status-value.error {
    color: #f44336;
  }

  .status-value.warning {
    color: #ff9800;
  }

  .button-container {
    margin-bottom: 16px;
  }

  .settings-button {
    width: 100%;
    background-color: #00a884;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .settings-button:hover {
    background-color: #008f72;
  }

  .info {
    font-size: 13px;
    line-height: 1.4;
    color: #666;
  }

  .info p {
    margin: 8px 0;
  }

  .info ul {
    margin: 8px 0;
    padding-left: 20px;
  }

  .info li {
    margin-bottom: 4px;
  }

  /* Toggle Switch */
  .toggle {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.3s;
    border-radius: 20px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: #00a884;
  }

  input:focus + .slider {
    box-shadow: 0 0 1px #00a884;
  }

  input:checked + .slider:before {
    transform: translateX(20px);
  }

  /* Dark Mode Support */
  @media (prefers-color-scheme: dark) {
    .container {
      background-color: #222;
      color: #e0e0e0;
    }

    header {
      border-bottom-color: #444;
    }

    h1 {
      color: #25d366;
    }

    .status-container {
      background-color: #333;
    }

    .info {
      color: #aaa;
    }
  }
</style>
