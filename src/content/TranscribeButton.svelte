<script>
  import { transcriptionCache } from "../lib/stores.js";

  export let bubbleId;
  export let playBtn;
  export let show = undefined;
  export let transcribe = undefined;

  let isTranscribed = false;
  let isLoading = false;
  let buttonText = "Transcribe";

  $: {
    if (bubbleId && $transcriptionCache.has(bubbleId)) {
      isTranscribed = true;
      buttonText = "✓";
    }
  }

  function handleClick() {
    if (isLoading) return;

    if (isTranscribed) {
      const data = $transcriptionCache.get(bubbleId);
      if (data && show) show({ data, bubbleId });

      return;
    }

    isLoading = true;
    buttonText = "⏳";

    if (transcribe) transcribe({ bubbleId, playBtn });
  }

  export function setTranscribed(data) {
    isLoading = false;
    isTranscribed = true;
    buttonText = "✓";

    if (bubbleId && data) {
      transcriptionCache.update((cache) => {
        cache.set(bubbleId, data);
        return cache;
      });
    }
  }

  export function setError() {
    isLoading = false;
    buttonText = "⚠️";
    setTimeout(() => (buttonText = "Retry"), 2000);
  }
</script>

<button
  class="transcribe-button"
  class:transcribed={isTranscribed}
  class:loading={isLoading}
  onclick={handleClick}
>
  {buttonText}
</button>

<style>
  .transcribe-button {
    margin: 5px;
    padding: 6px 12px;
    font-size: 12px;
    color: #ffffff;
    background-color: #00a884;
    border: none;
    border-radius: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    min-width: 80px;
  }

  .transcribe-button:hover {
    background-color: #008f72;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .transcribe-button:active {
    transform: translateY(1px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .transcribe-button:disabled {
    opacity: 0.7;
    cursor: default;
    transform: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .transcribe-button.transcribed {
    background-color: #4caf50;
  }

  .transcribe-button.loading {
    background-color: #ffa000;
  }
</style>
