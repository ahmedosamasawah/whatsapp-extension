(function () {
  'use strict';

  (() => {
    // Map to track audio blob URLs
    const audioMap = new Map();

    // Store original createObjectURL method
    const origCreate = URL.createObjectURL;

    // Intercept URL.createObjectURL to capture audio blobs
    URL.createObjectURL = function (blob) {
      // Call original method
      const url = origCreate.apply(this, arguments);

      // If this is an audio blob, store it
      if (blob?.type?.startsWith("audio/")) {
        audioMap.set(url, {
          blob,
          mime: blob.type,
          sent: false,
        });
      }

      return url;
    };

    /**
     * Check if a URL is for audio and send it to the content script if not already sent
     */
    function maybeSend(url) {
      const rec = audioMap.get(url);
      if (!rec || rec.sent) return;

      // Mark as sent
      rec.sent = true;

      // Convert blob to array buffer and send to content script
      rec.blob.arrayBuffer().then((buf) => {
        window.postMessage(
          {
            source: "WA_TRANSCRIBER",
            type: "WA_AUDIO",
            mime: rec.mime,
            data: [...new Uint8Array(buf)],
          },
          "*"
        );
      });
    }

    /**
     * Patch the src setter on an HTMLElement to intercept audio URLs
     */
    function patchSrcSetter(obj) {
      // Get original descriptor
      const desc =
        Object.getOwnPropertyDescriptor(obj, "src") ||
        Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");

      // Replace with our interceptor
      Object.defineProperty(obj, "src", {
        configurable: true,
        enumerable: true,
        get() {
          return desc.get.call(this);
        },
        set(v) {
          maybeSend(v);
          return desc.set.call(this, v);
        },
      });
    }

    // Intercept Audio constructor
    const NativeAudio = Audio;
    window.Audio = new Proxy(NativeAudio, {
      construct(Target, args, newTarget) {
        const audio = Reflect.construct(Target, args, newTarget);
        if (args[0]) maybeSend(args[0]);
        patchSrcSetter(audio);
        return audio;
      },
    });

    // Patch HTMLMediaElement.prototype for all existing and future audio/video elements
    patchSrcSetter(HTMLMediaElement.prototype);
  })();

})();
//# sourceMappingURL=hook.js.map
