import { mount } from "svelte";
import App from "./App.svelte";
import "../app.css";

async function initApp() {
  const container = document.createElement("div");
  container.id = "whatsapp-transcriber-app";
  document.body.appendChild(container);

  const app = mount(App, {
    target: container,
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "settingsUpdated") window.location.reload();

    return true;
  });
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", initApp);
else initApp();
