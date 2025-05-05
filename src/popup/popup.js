import "../app.css";
import { mount } from "svelte";
import Popup from "./Popup.svelte";

const app = mount(Popup, {
  target: document.getElementById("whatsapp-transcriber-app"),
});

export default app;
