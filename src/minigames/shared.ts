// Helpers shared by the arcade-style club mini-games.
import type { GameState, Look } from '../core/types';
import { el } from '../ui/dom';
import { ui } from '../ui/ui';

/** Letter ranks the clubs award. */
export type Rank = 'S' | 'A' | 'B' | 'C' | 'D';

export interface ArcadeConfig {
  state: GameState;
  seed: number;
  /** Showcase day: harder. */
  hard: boolean;
  /** 0-based difficulty step (0..2) for the older arcade games. */
  term: number;
  /** 0-based semester (0..7) for games that scale over the whole degree. */
  sem: number;
  look: Look;
}

const introSeen = new Set<string>();

/** Show a how-to-play card the first time a mini-game is opened in this session. */
export async function intro(id: string, title: string, html: string): Promise<void> {
  if (introSeen.has(id)) return;
  introSeen.add(id);
  await ui.info(title, html, 'Let’s Go! ▶');
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = el('canvas');
  c.id = 'mg-canvas';
  c.width = w;
  c.height = h;
  c.style.height = `min(86vh, ${h}px)`;
  c.style.width = 'auto';
  c.style.aspectRatio = `${w}/${h}`;
  return c;
}

export function context2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas is not available');
  return g;
}

/** Wrap a canvas with a hint line, ready to hand to `ui.overlay`. */
export function canvasWithHint(canvas: HTMLCanvasElement, hint: string): HTMLElement {
  const wrap = el('div', 'mg-wrap');
  wrap.appendChild(canvas);
  wrap.appendChild(el('div', 'mg-hint', hint));
  return wrap;
}

/** Trace a rounded rectangle path. */
export function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
