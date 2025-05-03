import { mount } from "svelte";
import Popup from "./Popup.svelte";

const app = mount(Popup, {
  target: document.body,
});

export default app;
