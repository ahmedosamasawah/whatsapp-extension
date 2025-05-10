import "../app.css";
import { mount } from "svelte";
import App from "../components/App.svelte";
import { initializeSettings, getSettings } from "../store/settings.js";

async function initApp() {
  const container = document.createElement("div");
  container.id = "whatsapp-transcriber-app";
  document.body.appendChild(container);

  await initializeSettings();
  let currentSettings = JSON.stringify(getSettings());

  mount(App, { target: container });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "settingsUpdated") {
      const latestSettings = JSON.stringify(getSettings());

      if (latestSettings !== currentSettings) {
        currentSettings = latestSettings;
        window.location.reload();
      }
    }

    return true;
  });
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", initApp);
else initApp();
