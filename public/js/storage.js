/**
 * Remembers which checklist items the user ticked. Storage can be unavailable (private mode,
 * blocked cookies), so every access is guarded and the UI works without it.
 */

/** @param {string} key @returns {Set<string>} */
export function loadChecked(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

/** @param {string} key @param {Set<string>} checked */
export function saveChecked(key, checked) {
  try {
    localStorage.setItem(key, JSON.stringify([...checked]));
  } catch {
    // Ignore: progress simply will not persist.
  }
}
