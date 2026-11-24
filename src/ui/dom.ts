// Tiny DOM helpers.
export const $ = <T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T => {
  const e = root.querySelector<T>(selector);
  if (!e) throw new Error(`Missing element: ${selector}`);
  return e;
};

/** Like `$` but returns null instead of throwing. */
export const $maybe = <T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T | null => root.querySelector<T>(selector);

export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  html?: string,
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
/** Escape text for safe use inside innerHTML. */
export const esc = (t: unknown): string => String(t).replace(/[&<>"']/g, (c) => ESCAPES[c]);
