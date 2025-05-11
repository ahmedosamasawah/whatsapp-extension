<script>
  import {
    status,
    statusText,
    initialize,
    updateStatus,
  } from "../services/settingsService.js";

  let isEnabled = $state(true);

  (async () => {
    await initialize();
    status.subscribe((currentStatus) => {
      isEnabled = currentStatus.isExtensionEnabled;
    });
  })();

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  function toggleExtension() {
    const newStatus = !isEnabled;

    if (newStatus !== isEnabled) {
      isEnabled = newStatus;
      updateStatus({
        isExtensionEnabled: isEnabled,
      });

      chrome.runtime.sendMessage({
        action: "settingsUpdated",
      });
    }
  }
</script>

<main class={["w-80 font-sans p-4 text-gray-800"]}>
  <header class={["mb-4 pb-3 border-b border-gray-200"]}>
    <h1 class={["text-lg font-semibold text-[#00a884] m-0"]}>
      WhatsApp AI Transcriber
    </h1>
  </header>

  <section class={["bg-gray-100 rounded-lg p-3 mb-4"]}>
    <div class={["flex justify-between items-center mb-2"]}>
      <span class={["font-medium text-sm"]}>Status:</span>
      <span
        class={[
          "flex items-center text-sm",
          $statusText.type === "error" && "text-red-500",
          $statusText.type === "warning" && "text-yellow-600",
          $statusText.type === "success" && "text-green-600",
        ]}
        dir="auto"
      >
        <span
          class={[
            "inline-block w-2.5 h-2.5 rounded-full mr-1.5",
            $statusText.type === "error" && "bg-red-500",
            $statusText.type === "warning" && "bg-yellow-600",
            $statusText.type === "success" && "bg-green-600",
          ]}
          aria-hidden="true"
        ></span>
        {$statusText.text}
      </span>
    </div>

    {#if $status.lastError && $status.lastError.includes("API key has reached its usage limit")}
      <div
        class={[
          "bg-yellow-50 border border-yellow-200 rounded-md p-2 mb-3 text-xs text-yellow-800",
        ]}
      >
        <p class={["m-0"]}>
          Your OpenAI API key has reached its usage limit. You need to:
        </p>
        <ul class={["pl-4 mt-1.5 mb-0"]}>
          <li>Check your OpenAI account billing</li>
          <li>Update payment method or add credits</li>
          <li>Or use a different API key</li>
        </ul>
      </div>
    {/if}

    <div class={["flex justify-between items-center"]}>
      <span class={["font-medium text-sm"]}>Extension:</span>
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
            "inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ease-in-out",
            isEnabled ? "-translate-x-[8px]" : "translate-x-[13px]",
          ]}
          aria-hidden="true"
        ></span>
      </button>
    </div>
  </section>

  <section class={["mb-4"]}>
    <button
      class={[
        "w-full bg-[#00a884] text-white border-0 rounded-lg py-2.5 px-4 text-sm font-medium cursor-pointer transition-colors hover:bg-[#008f72]",
      ]}
      onclick={openOptions}
      type="button"
    >
      Open Settings
    </button>
  </section>

  <footer class={["text-xs leading-relaxed text-gray-600"]}>
    <p class={["my-2"]} dir="auto">
      This extension transcribes WhatsApp voice messages using AI and provides:
    </p>
    <ul class={["my-2 pl-5"]}>
      <li class={["mb-1"]} dir="auto">Raw transcription</li>
      <li class={["mb-1"]} dir="auto">Cleaned version</li>
      <li class={["mb-1"]} dir="auto">Brief summary</li>
      <li class={["mb-1"]} dir="auto">Suggested reply</li>
    </ul>
    <p class={["my-2"]} dir="auto">
      Click the "Transcribe" button next to voice messages to process them.
    </p>
  </footer>
</main>
