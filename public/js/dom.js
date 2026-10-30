/**
 * Tiny DOM builder. Text is always attached with `textContent`/text nodes (never `innerHTML`),
 * so server or AI-provided strings can never inject markup.
 */

/**
 * @param {string} tag
 * @param {Record<string, string | number | boolean | null | undefined>} [attrs]
 * @param {...(Node | string | null | undefined | false)} children
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'class') el.className = String(value);
    else if (value === true) el.setAttribute(name, '');
    else el.setAttribute(name, String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return el;
}

/** Replaces all children of `container` with `nodes`. */
export function mount(container, ...nodes) {
  container.replaceChildren(...nodes);
}
