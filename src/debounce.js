const DEBOUNCE_DELAY = 100
const promises = {}

function timeout(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay))
}

/*
  Follow the result of calling asyncFn, debouncing calls with the same key.
 */
export default function debounced(asyncFn, key, delay = DEBOUNCE_DELAY) {
  if (!promises[key]) {
    promises[key] = Promise.resolve()
  }

  let callPromise = promises[key].then(async () => await asyncFn())
  promises[key] = callPromise.finally(async () => await timeout(delay))

  return callPromise
}
