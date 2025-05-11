import * as kv from "idb-keyval";

/** @param {string} key @param {string} [storageType='local'] @returns {Promise<any>} */
export async function get(key, storageType = "local") {
  if (storageType === "indexedDB") return await kv.get(key);
  else {
    return new Promise((resolve) =>
      chrome.storage[storageType].get([key], (result) =>
        resolve(result[key] !== undefined ? result[key] : null)
      )
    );
  }
}

/** @param {string} key @param {any} value @param {string|Array<string>} [storageType='local'] @returns {Promise<boolean>} */
export async function set(key, value, storageType = "local") {
  const storageTypes = Array.isArray(storageType) ? storageType : [storageType];

  const promises = storageTypes.map((type) => {
    if (type === "indexedDB") return kv.set(key, value);
    else
      return new Promise((resolve) => {
        const data = {};
        data[key] = value;
        chrome.storage[type].set(data, () => {
          const error = chrome.runtime.lastError;
          resolve(!error);
        });
      });
  });

  await Promise.all(promises);
  return true;
}

/** @param {string} [storageType='local'] @returns {Promise<Object>} */
export async function getAll(storageType = "local") {
  if (storageType === "indexedDB") return await kv.entries();
  else
    return new Promise((resolve) => {
      chrome.storage[storageType].get(null, (items) => {
        resolve(items || {});
      });
    });
}

/** @param {string} key @param {string|Array<string>} [storageType='local'] @returns {Promise<boolean>} */
export async function remove(key, storageType = "local") {
  const storageTypes = Array.isArray(storageType) ? storageType : [storageType];

  const promises = storageTypes.map((type) => {
    if (type === "indexedDB") return kv.del(key);
    else
      return new Promise((resolve) => {
        chrome.storage[type].remove(key, () => {
          const error = chrome.runtime.lastError;
          resolve(!error);
        });
      });
  });

  await Promise.all(promises);
  return true;
}
