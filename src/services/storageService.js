import * as kv from "idb-keyval";

export async function get(key, storageType = "local") {
  if (storageType === "indexedDB") return await kv.get(key);

  return new Promise((resolve) =>
    chrome.storage[storageType].get([key], (result) =>
      resolve(result[key] !== undefined ? result[key] : null)
    )
  );
}

export async function set(key, value, storageType = "local") {
  const storageTypes = Array.isArray(storageType) ? storageType : [storageType];

  const promises = storageTypes.map((type) => {
    if (type === "indexedDB") return kv.set(key, value);

    return new Promise((resolve) => {
      const data = {};
      data[key] = value;
      chrome.storage[type].set(data, () => resolve(!chrome.runtime.lastError));
    });
  });

  await Promise.all(promises);
  return true;
}

export async function getAll(storageType = "local") {
  if (storageType === "indexedDB") {
    const entries = await kv.entries();
    return Object.fromEntries(entries);
  }

  return new Promise((resolve) => {
    chrome.storage[storageType].get(null, (items) => resolve(items || {}));
  });
}
