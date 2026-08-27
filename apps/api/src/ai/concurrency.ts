import { config } from "@planify/api/config";
import { ApiError } from "@planify/api/errors/handle-api-error";

/**
 * FIFO semaphore limiting concurrent AI generations.
 *
 */

type Waiter = {
  resolve: () => void;
  reject: (err: unknown) => void;
  /** Signal and its bound handler, so pump/fail can remove the listener. */
  signal?: AbortSignal;
  onAbort?: (() => void) | undefined;
  queueNumber: number; // tracks the number of the waiter
};

let active = 0;
const queue: Waiter[] = [];

/** Resolves waiters that have run in their slot(s) */
function pump(): void {
  while (active < config.ai.maxConcurrentGenerations && queue.length > 0) {
    const waiter = queue.shift()!;
    active++;

    // If the waiter has an abort signal
    if (waiter.signal && waiter.onAbort) {
      waiter.signal.removeEventListener("abort", waiter.onAbort);
    }

    waiter.resolve();
  }
}

/**
 * Adds a function to the generation queue, returning a promise that resolves when
 * the function has acquired a slot. The slot is released when the promise returned
 * by `fn` resolves or rejects.
*/
export async function withGenerationSlot<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  // If a slot is available, immedietly run fn.
  if (active < config.ai.maxConcurrentGenerations) {
    active++;
    try {
      //runs and returns of fn()
      return await fn();
    } finally {
      active--;
      pump();
    }
  }

  // Queue is full
  if (queue.length >= config.ai.maxQueueLength) {
    throw new ApiError(
      429,
      "generation_busy",
      "Too many generations are queued. Please try again later.",
    );
  }

  // Create a new waiter and add it to the queue. 
  // The promise RESOLVES when the waiter acquires a slot
  // The promise REJECTS if the waiter is aborted
  return new Promise<void>((resolve, reject) => {
    const fail = (err: unknown) => {
      queue.splice(waiter.queueNumber, 1); // remove the waiter from the queue

      // If the waiter has an abort signal
      if (waiter.signal && onAbort) {
        waiter.signal.removeEventListener("abort", onAbort);
      }

      // Reject the promise with the error
      reject(err);
    };

    // Listener for the abort signal, if provided
    const onAbort = () => {
      fail(new DOMException("Aborted", "AbortError"));
    };

    const waiter: Waiter = {
      resolve,
      reject,
      signal,
      onAbort: signal ? onAbort : undefined,
      queueNumber: queue.length, // track the number of the waiter
    };

    if (signal) {
      // If the signal is already aborted, fail immediately
      if (signal.aborted) {
        fail(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    // Add waiter to queue
    queue.push(waiter);
  }).then(async () => {

  // This code below will execute once the promise above resolves, meaning the waiter has acquired a slot.
  try {
    //runs and returns of fn()
    return await fn();
  } finally {
    active--;
    pump();
  }
})
}
