<script>
  import { onMount, onDestroy } from "svelte";
  import { mount } from "svelte";
  import TranscribeButton from "./TranscribeButton.svelte";
  import TranscriptionModal from "./TranscriptionModal.svelte";
  import { processVoiceMessage } from "../lib/api.js";
  import {
    transcriptionCache,
    initializeStores,
    setupStorePersistence,
    getApiKey as getApiKeyFunc,
  } from "../lib/stores.js";
  import { get } from "svelte/store";
  import { extensionStatus } from "../lib/stores.js";
  import { apiKey } from "../lib/stores.js";

  const playSelectors = [
    'span[data-icon="audio-play"]',
    '[data-testid="audio-player"]',
    'button[aria-label="Play voice message"]',
    ".audio-player",
  ];

  let buttons = new Map();
  let observer;
  let audioData = null;

  let showModal = false;
  let modalLoading = false;
  let modalData = {
    transcript: "",
    cleaned: "",
    summary: "",
    reply: "",
  };
  let currentBubbleId = null;

  onMount(async () => {
    await initializeStores();
    setupStorePersistence();
    validateApiKeyAccess();
    initializeButtons();
    setupMessageListener();

    observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.addedNodes.length > 0)) initializeButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });

  onDestroy(() => {
    if (observer) observer.disconnect();
  });

  function initializeButtons() {
    document.querySelectorAll(playSelectors.join(",")).forEach((playBtn) => {
      const bubble = playBtn.closest(".message-out, ._amkz, ._amjy");
      if (!bubble || bubble.querySelector(".transcribe-button")) return;

      if (!bubble.dataset.transcriptionId)
        bubble.dataset.transcriptionId = `bubble-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const bubbleId = bubble.dataset.transcriptionId;

      const container = document.createElement("div");
      bubble.appendChild(container);

      const component = mount(TranscribeButton, {
        target: container,
        props: {
          bubbleId,
          playBtn,
          transcribe: (detail) => handleTranscribe(detail),
          show: (detail) => showTranscription(detail),
        },
      });

      buttons.set(bubbleId, component);
    });
  }

  function setupMessageListener() {
    window.addEventListener("message", (e) => {
      if (
        e.source !== window ||
        e.data?.source !== "WA_TRANSCRIBER" ||
        e.data.type !== "WA_AUDIO"
      )
        return;

      const blob = new Blob([new Uint8Array(e.data.data)], {
        type: e.data.mime,
      });
      audioData = blob;

      if (currentBubbleId && modalLoading) processAudio();
    });
  }

  async function handleTranscribe({ bubbleId, playBtn }) {
    currentBubbleId = bubbleId;

    modalData = {
      transcript: "",
      cleaned: "",
      summary: "",
      reply: "",
    };
    modalLoading = true;
    showModal = true;

    if ($transcriptionCache.has(bubbleId)) {
      modalData = $transcriptionCache.get(bubbleId);
      modalLoading = false;
      return;
    }

    audioData = null;
    playBtn.click();
    setTimeout(() => playBtn.click(), 100);

    if (audioData) processAudio();
  }

  async function processAudio() {
    if (!audioData || !currentBubbleId) return;

    const blob = audioData;
    audioData = null;

    const result = await processVoiceMessage(blob);

    modalData = result;
    modalLoading = false;

    const component = buttons.get(currentBubbleId);
    if (component) component.setTranscribed(result);

    transcriptionCache.update((cache) => {
      cache.set(currentBubbleId, result);
      return cache;
    });
  }

  function showTranscription({ data, bubbleId }) {
    modalData = data;
    currentBubbleId = bubbleId;
    modalLoading = false;
    showModal = true;
  }

  function handleModalClose() {
    showModal = false;
    currentBubbleId = null;
  }

  function handleUseReply(e) {
    const reply = e.detail;

    const inputField = document.querySelector('[contenteditable="true"]');
    if (!inputField) return;

    inputField.textContent = reply;

    const event = new Event("input", { bubbles: true });
    inputField.dispatchEvent(event);

    inputField.focus();
  }

  async function validateApiKeyAccess() {
    const storeKey = get(apiKey);
    const helperKey = await getApiKeyFunc();

    if (!storeKey && !helperKey) {
      chrome.runtime.sendMessage({ action: "getApiKey" }, (response) => {});
      chrome.runtime.sendMessage({ action: "checkStorage" }, (response) => {});
    }
  }
</script>

<TranscriptionModal
  data={modalData}
  show={showModal}
  loading={modalLoading}
  close={handleModalClose}
  useReply={(reply) => handleUseReply({ detail: reply })}
/>
