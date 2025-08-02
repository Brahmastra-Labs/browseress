/*!
 * async-hooks Polyfill
 * Provides a functional implementation of AsyncLocalStorage for browser compatibility.
 * A full 1:1 polyfill is not possible, but this covers the primary use case.
 */

'use strict';

class AsyncLocalStorage {
  constructor() {
    this._store = undefined;
  }

  /**
   * Runs a function with a given store, ensuring the store is available
   * for the entire synchronous or asynchronous duration of the function.
   * @param {*} store - The value to be stored for the context.
   * @param {Function} callback - The function to run.
   */
  run(store, callback) {
    const oldStore = this._store;
    this._store = store;

    try {
      const result = callback();

      // Check if the callback was async (returned a promise)
      if (result && typeof result.then === 'function') {
        // If it's a promise, wait for it to settle (fulfill or reject)
        // before restoring the previous context.
        return result.finally(() => {
          this._store = oldStore;
        });
      }

      // If it was synchronous, restore the context immediately.
      this._store = oldStore;
      return result;
    } catch (err) {
      // Also restore context if an error is thrown synchronously.
      this._store = oldStore;
      throw err;
    }
  }

  /**
   * Returns the current store. If called outside of a `run` call, it's undefined.
   */
  getStore() {
    return this._store;
  }
}

// Stubs for the rest of the legacy API surface to prevent crashes
let asyncIdCounter = 0;

module.exports = {
  AsyncLocalStorage,
  createHook: () => ({ enable: () => {}, disable: () => {} }),
  executionAsyncId: () => asyncIdCounter++,
  triggerAsyncId: () => 0,
};