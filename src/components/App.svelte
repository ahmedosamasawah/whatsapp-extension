<script>
  import { mount } from "svelte";
  import TranscribeButton from "./TranscribeButton.svelte";
  import TranscriptionModal from "./TranscriptionModal.svelte";
  import { processVoiceMessage } from "../services/transcriptionService.js";
  import { formatTranscriptionError } from "../utils/apiErrors.js";

  import {
    initialize,
    transcriptionCache,
    cacheTranscription,
  } from "../services/settingsService.js";

  (async () => await initialize())();

  const PLAY_BUTTON_SELECTORS = [
    'span[data-icon="audio-play"]',
    '[data-testid="audio-player"]',
    'button[aria-label="Play voice message"]',
    ".audio-player",
  ];

  let observer = $state(null);
  let audioData = $state(null);
  let buttons = $state(new Map());

  let showModal = $state(false);
  let modalLoading = $state(false);
  let modalData = $state({
    transcript: "",
    cleaned: "",
    summary: "",
    reply: "",
  });

  let currentBubbleId = $state(null);

  (async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    initializeButtons();
    setupMessageListener();

    observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.addedNodes.length > 0)) initializeButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  })();

  function initializeButtons() {
    document
      .querySelectorAll(PLAY_BUTTON_SELECTORS.join(","))
      .forEach((playBtn) => {
        const bubble = playBtn.closest(".message-out, ._amkz, ._amjy");
        if (!bubble || bubble.querySelector(".transcribe-button")) return;

        const parentElement = bubble.parentElement;
        const whatsAppId = parentElement.dataset.id;
        bubble.dataset.transcriptionId = `wa-${whatsAppId}`;
        const bubbleId = bubble.dataset.transcriptionId;

        const component = mount(TranscribeButton, {
          target: bubble.children[1],
          props: {
            bubbleId,
            playBtn,
            transcribe: (detail) => handleTranscribe(detail),
            show: (detail) => showTranscription(detail),
          },
        });

        buttons.set(bubbleId, component);

        if ($transcriptionCache.has(bubbleId))
          component.setTranscribed($transcriptionCache.get(bubbleId));
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

  /** @param {Object} detail */
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

    const component = buttons.get(bubbleId);
    if (component) {
      component.isLoading = true;
      component.isError = false;
    }

    if ($transcriptionCache.has(bubbleId)) {
      const cachedData = $transcriptionCache.get(bubbleId);

      if (!cachedData.transcript.startsWith("ERROR:")) {
        modalData = cachedData;
        modalLoading = false;

        if (component) {
          component.isLoading = false;
          component.isTranscribed = true;
        }

        return;
      }
    }

    audioData = null;
    playBtn.click();

    setTimeout(() => playBtn.click(), 200);

    if (audioData) processAudio();
  }

  async function processAudio() {
    if (!audioData || !currentBubbleId) return;

    const blob = audioData;
    audioData = null;

    try {
      const result = await processVoiceMessage(blob);

      if (result.transcript.startsWith("ERROR")) {
        console.log("Error processing audio:", result.transcript); // TODO: Remove
        modalLoading = false;

        modalData = result;

        const component = buttons.get(currentBubbleId);
        if (component) component.setError();

        await cacheTranscription(currentBubbleId, result);
        return;
      }

      modalData = result;
      modalLoading = false;

      const component = buttons.get(currentBubbleId);
      if (component) component.setTranscribed(result);

      await cacheTranscription(currentBubbleId, result);
    } catch (error) {
      console.error("Error processing audio:", error); // TODO: Remove
      modalData = formatTranscriptionError(error);
      modalLoading = false;

      const component = buttons.get(currentBubbleId);
      if (component) component.setError();

      await cacheTranscription(currentBubbleId, modalData);
    }
  }

  /** @param {Object} detail */
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
</script>

<TranscriptionModal
  data={modalData}
  show={showModal}
  loading={modalLoading}
  close={handleModalClose}
/>
