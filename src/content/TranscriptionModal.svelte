<script>
  export let data = {
    transcript: "",
    cleaned: "",
    summary: "",
    reply: "",
  };

  export let show = false;
  export let loading = false;
  export let close = () => {};
  export let useReply = (replyText) => {};

  const tabs = [
    { id: "transcript", label: "Transcript", icon: "📝" },
    { id: "cleaned", label: "Cleaned", icon: "✨" },
    { id: "summary", label: "Summary", icon: "📌" },
    { id: "reply", label: "Suggested Reply", icon: "💬" },
  ];

  let activeTab = "transcript";

  function setActiveTab(tabId) {
    activeTab = tabId;
  }

  function copyText(text) {
    navigator.clipboard.writeText(text);

    const toast = document.createElement("div");
    toast.className = "transcription-toast";
    toast.textContent = "Copied to clipboard!";
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }

  function handleUseReply() {
    useReply(data.reply);
    close();
  }

  function handleModalClick(event) {
    event.stopPropagation();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      close();
    }
  }

  function handleModalKeydown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
    }
  }
</script>

{#if show}
  <div
    class="overlay"
    onclick={close}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  ></div>
  <div
    class="modal"
    onclick={handleModalClick}
    onkeydown={handleModalKeydown}
    role="dialog"
    aria-labelledby="modal-title"
  >
    <div class="modal-header">
      <div class="modal-title" id="modal-title">Voice Message Analysis</div>
      <button class="modal-close-btn" onclick={close}>✕</button>
    </div>

    <div class="modal-tabs">
      {#each tabs as tab}
        <button
          class="tab-button"
          class:active={activeTab === tab.id}
          onclick={() => setActiveTab(tab.id)}
          disabled={loading || !data[tab.id]}
        >
          <span class="tab-icon">{tab.icon}</span>
          <span class="tab-label">{tab.label}</span>
        </button>
      {/each}
    </div>

    <div class="modal-content">
      {#if loading}
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <div class="loading-text">Analyzing voice message...</div>
        </div>
      {:else if activeTab === "transcript"}
        <div class="content-section">
          <p class="section-text">{data.transcript}</p>
        </div>
      {:else if activeTab === "cleaned"}
        <div class="content-section">
          <p class="section-text">{data.cleaned}</p>
        </div>
      {:else if activeTab === "summary"}
        <div class="content-section">
          <p class="section-text">{data.summary}</p>
        </div>
      {:else if activeTab === "reply"}
        <div class="content-section">
          <p class="section-text">{data.reply}</p>
        </div>
      {/if}
    </div>

    <div class="modal-footer">
      {#if !loading}
        <button
          class="copy-button"
          onclick={() => copyText(data[activeTab])}
          disabled={!data[activeTab]}
        >
          Copy Text
        </button>

        {#if activeTab === "reply" && data.reply}
          <button class="use-reply-button" onclick={handleUseReply}>
            Use Reply
          </button>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    z-index: 999;
    backdrop-filter: blur(3px);
    animation: fadeIn 0.2s ease-out;
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
    padding: 0;
    z-index: 1000;
    max-width: 500px;
    width: 90%;
    overflow: hidden;
    animation: scaleIn 0.2s ease-out;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background-color: #f0f2f5;
    border-bottom: 1px solid #e0e0e0;
  }

  .modal-title {
    font-weight: 600;
    color: #128c7e;
    font-size: 16px;
  }

  .modal-close-btn {
    background: none;
    border: none;
    color: #888;
    font-size: 18px;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .modal-close-btn:hover {
    background-color: #e0e0e0;
    color: #555;
  }

  .modal-tabs {
    display: flex;
    background-color: #f0f2f5;
    border-bottom: 1px solid #e0e0e0;
  }

  .tab-button {
    flex: 1;
    padding: 10px 8px;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 12px;
    color: #666;
  }

  .tab-button.active {
    border-bottom-color: #00a884;
    color: #00a884;
    font-weight: 500;
  }

  .tab-button:hover:not(.active):not(:disabled) {
    background-color: #e8e8e8;
  }

  .tab-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tab-icon {
    font-size: 16px;
    margin-bottom: 4px;
  }

  .modal-content {
    padding: 20px;
    overflow-y: auto;
    max-height: 60vh;
    flex-grow: 1;
  }

  .content-section {
    line-height: 1.6;
  }

  .section-text {
    margin: 0;
    white-space: pre-wrap;
  }

  .modal-footer {
    padding: 12px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid #e0e0e0;
    background-color: #f0f2f5;
  }

  .copy-button,
  .use-reply-button {
    padding: 8px 16px;
    border: none;
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
  }

  .copy-button {
    background-color: #00a884;
    color: white;
  }

  .copy-button:hover {
    background-color: #008f72;
  }

  .use-reply-button {
    background-color: #4285f4;
    color: white;
  }

  .use-reply-button:hover {
    background-color: #3367d6;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #00a884;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  .loading-text {
    color: #666;
    font-size: 14px;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes scaleIn {
    from {
      transform: translate(-50%, -50%) scale(0.9);
      opacity: 0;
    }
    to {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }

  @media (prefers-color-scheme: dark) {
    .modal {
      background-color: #222;
    }

    .modal-header {
      background-color: #333;
      border-bottom-color: #444;
    }

    .modal-title {
      color: #25d366;
    }

    .modal-close-btn {
      color: #aaa;
    }

    .modal-close-btn:hover {
      background-color: #444;
      color: #ddd;
    }

    .modal-tabs {
      background-color: #333;
      border-bottom-color: #444;
    }

    .tab-button {
      color: #aaa;
    }

    .tab-button.active {
      color: #25d366;
      border-bottom-color: #25d366;
    }

    .tab-button:hover:not(.active):not(:disabled) {
      background-color: #444;
    }

    .modal-content {
      color: #e0e0e0;
    }

    .modal-footer {
      border-top-color: #444;
      background-color: #333;
    }

    .loading-text {
      color: #aaa;
    }
  }

  :global(.transcription-toast) {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 20px;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 2000;
    animation: fadeIn 0.3s ease;
  }

  :global(.transcription-toast.hide) {
    animation: fadeOut 0.3s ease;
  }
</style>
