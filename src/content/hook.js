(() => {
  const audioMap = new Map();
  const originalCreateObjectURL = URL.createObjectURL;

  URL.createObjectURL = function (blob) {
    const url = originalCreateObjectURL.apply(this, arguments);

    if (blob?.type?.startsWith("audio/")) {
      audioMap.set(url, {
        blob,
        mime: blob.type,
        sent: false,
      });
    }

    return url;
  };

  function processAndSendAudio(url) {
    const record = audioMap.get(url);
    if (!record || record.sent) return;

    record.sent = true;

    record.blob.arrayBuffer().then((buffer) => {
      window.postMessage(
        {
          source: "WA_TRANSCRIBER",
          type: "WA_AUDIO",
          mime: record.mime,
          data: [...new Uint8Array(buffer)],
        },
        "*"
      );
    });
  }
  
  function patchSrcSetter(obj) {
    const descriptor =
      Object.getOwnPropertyDescriptor(obj, "src") ||
      Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");

    Object.defineProperty(obj, "src", {
      configurable: true,
      enumerable: true,
      get() {
        return descriptor.get.call(this);
      },
      set(value) {
        processAndSendAudio(value);
        return descriptor.set.call(this, value);
      },
    });
  }

  const nativeAudio = Audio;
  window.Audio = new Proxy(nativeAudio, {
    construct(Target, args, newTarget) {
      const audio = Reflect.construct(Target, args, newTarget);

      if (args[0]) processAndSendAudio(args[0]);

      patchSrcSetter(audio);

      return audio;
    },
  });

  patchSrcSetter(HTMLMediaElement.prototype);
})();
