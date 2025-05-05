<script>
  import {
    apiKey,
    extensionStatus,
    initializeStores,
    extensionStatusText,
  } from "../lib/stores.js";

  let statusMessage = "";
  let isEnabled = true;

  (() => {
    initializeStores();
  })();

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

<div class="w-80 font-sans p-4 text-gray-800">
  <header class="mb-4 pb-3 border-b border-gray-200">
    <h1 class="text-lg font-semibold text-[#00a884] m-0">
      WhatsApp AI Transcriber Plus
    </h1>
  </header>

  <div class="bg-gray-100 rounded-lg p-3 mb-4">
    <div class="flex justify-between items-center mb-2">
      <span class="font-medium text-sm">Status:</span>
      <span
        class={[
          "flex items-center text-sm",
          $extensionStatusText.type === "error" && "text-red-500",
          $extensionStatusText.type === "warning" && "text-yellow-600",
          $extensionStatusText.type === "success" && "text-green-600",
        ]}
      >
        <span
          class={[
            "inline-block w-2.5 h-2.5 rounded-full mr-1.5",
            $extensionStatusText.type === "error" && "bg-red-500",
            $extensionStatusText.type === "warning" && "bg-yellow-600",
            $extensionStatusText.type === "success" && "bg-green-600",
          ]}
        ></span>
        {statusMessage}
      </span>
    </div>

    <div class="flex justify-between items-center">
      <span class="font-medium text-sm">Extension:</span>
      <button
        type="button"
        class={[
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
          isEnabled ? "bg-[#00a884]" : "bg-gray-300",
        ]}
        onclick={toggleExtension}
        role="switch"
        aria-checked={isEnabled}
      >
        <span class="sr-only">Enable extension</span>
        <span
          class={[
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out",
            isEnabled ? "translate-x-6" : "translate-x-1",
          ]}
        ></span>
      </button>
    </div>
  </div>

  <div class="mb-4">
    <button
      class="w-full bg-[#00a884] text-white border-0 rounded-lg py-2.5 px-4 text-sm font-medium cursor-pointer transition-colors hover:bg-[#008f72]"
      onclick={openOptions}
    >
      Open Settings
    </button>
  </div>

  <div class="text-xs leading-relaxed text-gray-600">
    <p class="my-2">
      This extension transcribes WhatsApp voice messages using AI and provides:
    </p>
    <ul class="my-2 pl-5">
      <li class="mb-1">Raw transcription</li>
      <li class="mb-1">Cleaned version</li>
      <li class="mb-1">Brief summary</li>
      <li class="mb-1">Suggested reply</li>
    </ul>
    <p class="my-2">
      {#if !$apiKey}
        Configure your API key in the settings to get started.
      {:else}
        Click the "Transcribe" button next to voice messages to analyze them.
      {/if}
    </p>
  </div>
</div>
