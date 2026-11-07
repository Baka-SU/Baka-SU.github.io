import { createApp } from "vue";
import Patcher from "../components/Patcher.vue";

// Mounts the browser patcher where a page authored `<!-- patcher -->`.
function mountPatcher(slot: HTMLElement) {
  const icons = JSON.parse(slot.dataset.icons ?? "{}");
  slot.removeAttribute("data-icons");
  createApp(Patcher, { lang: slot.dataset.lang ?? "en", icons }).mount(slot);
}

export function mountPatcherWhenVisible(slot: HTMLElement) {
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      mountPatcher(slot);
    },
    { rootMargin: "200px" },
  );
  observer.observe(slot);
}
