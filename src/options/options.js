import "../app.css";
import { mount } from "svelte";
import Options from "./Options.svelte";

const app = mount(Options, {
  target: document.getElementById("whatsapp-transcriber-app"),
});

export default app;
