// DOM UI layer: overlays, dialogue, menus, results, toasts and effects.
// Everything is promise-based so game flow can simply `await ui.choice(...)`.
import { Sound } from '../audio/sound';
import { PERKS } from '../core/data';
import type { PerkId } from '../core/types';
import { sleep } from '../core/util';
import { $, el, esc } from './dom';

export type ToastKind = '' | 'good' | 'bad' | 'gold';
/** Return true when the key was handled (it is then swallowed). */
export type KeyHandler = (e: KeyboardEvent) => boolean;

let busy = 0;
const keyStack: KeyHandler[] = [];

// The top-most handler gets first refusal on every key press.
document.addEventListener(
  'keydown',
  (e) => {
    const h = keyStack[keyStack.length - 1];
    if (h?.(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true,
);

/** Route keyboard input to `fn` until the returned function is called. */
export function pushKeys(fn: KeyHandler): () => void {
  keyStack.push(fn);
  return () => {
    const i = keyStack.indexOf(fn);
    if (i >= 0) keyStack.splice(i, 1);
  };
}

export const wireSfx = (root: ParentNode): void => {
  root.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => Sound.sfx('click')));
};

export interface Overlay {
  root: HTMLElement;
  close(): void;
}

function overlay(content: HTMLElement, opts: { clear?: boolean; host?: HTMLElement } = {}): Overlay {
  const ov = el('div', 'overlay' + (opts.clear ? ' clear' : ''));
  ov.appendChild(content);
  (opts.host ?? document.body).appendChild(ov);
  busy++;
  wireSfx(ov);
  let closed = false;
  return {
    root: ov,
    close() {
      if (closed) return;
      closed = true;
      busy = Math.max(0, busy - 1);
      ov.remove();
    },
  };
}

export interface ChoiceOption {
  icon?: string;
  label: string;
  sub?: string;
  tag?: string;
  tagCls?: string;
  disabled?: boolean;
}
export interface ChoiceConfig {
  title: string;
  sub?: string;
  options: ChoiceOption[];
  /** Allow Esc / a cancel button (resolves -1). Default true. */
  cancel?: boolean;
  cancelLabel?: string;
  icon?: string;
}

export interface ResultsConfig {
  title: string;
  subtitle?: string;
  letter?: string;
  color?: string;
  rows?: [string, string | number][];
  chips?: { text: string; cls?: string }[];
  note?: string;
  buttons?: { label: string; primary?: boolean; cls?: string }[];
  confetti?: boolean;
}

export interface PrepItem {
  id: string;
  name: string;
  icon: string;
  desc: string;
  count: number;
}

type Portrait = { emoji: string; color: string };
type Line = [who: string, text: string];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
  rot: number;
  vr: number;
  life: number;
}
let particles: Particle[] = [];
let confettiRunning = false;

export const ui = {
  /** Speaker name -> dialogue portrait. Filled in at boot. */
  portraits: {} as Record<string, Portrait>,
  /** Called when the on-screen interact prompt is pressed. */
  onPrompt: null as (() => void) | null,
  overlay,
  pushKeys,
  wireSfx,

  /** True while any overlay / dialogue is open (the world should not react to input). */
  isBusy: (): boolean => busy > 0,

  toast(text: string, kind: ToastKind = '', ms = 3200): void {
    const host = $('#toasts');
    const t = el('div', 'toast ' + kind, text);
    host.appendChild(t);
    while (host.children.length > 5) host.firstChild?.remove();
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 450);
    }, ms);
  },

  async banner(title: string, sub = '', ms = 2300): Promise<void> {
    const b = $('#banner');
    b.className = '';
    b.innerHTML = `<div class="b1">${title}</div>${sub ? `<div class="b2">${sub}</div>` : ''}`;
    b.style.display = 'flex';
    await sleep(ms);
    b.classList.add('out');
    await sleep(500);
    b.style.display = 'none';
    b.className = '';
  },

  /** Fade the screen to / from black, optionally with a caption. */
  async fade(on: boolean, cap = '', cap2 = ''): Promise<void> {
    const f = $('#fade');
    if (on) {
      f.innerHTML = `<div class="cap">${cap}</div><div class="cap2">${cap2}</div>`;
      f.classList.add('on');
    } else f.classList.remove('on');
    await sleep(470);
  },

  floatText(text: string, x: number, y: number, color = '#fff'): void {
    const f = el('div', 'floatnum', text);
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    f.style.color = color;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1000);
  },

  /* ----- dialogue (visual-novel style) ----- */
  async say(lines: Line[]): Promise<void> {
    const host = $('#dialog');
    busy++;
    try {
      for (const [who, text] of lines) {
        const p = ui.portraits[who] ?? { emoji: '💬', color: '#4aa8ff' };
        host.innerHTML = '';
        const box = el(
          'div',
          'dlg',
          `<div class="portrait" style="--pc:${p.color}">${p.emoji}</div><div class="name">${esc(who)}</div><div class="text"></div><div class="next">▶ click / space</div>`,
        );
        host.appendChild(box);
        const tx = $('.text', box);
        const nx = $('.next', box);
        nx.style.visibility = 'hidden';
        await new Promise<void>((resolve) => {
          let i = 0;
          let done = false;
          const finish = () => {
            done = true;
            clearInterval(iv);
            tx.textContent = text;
            nx.style.visibility = 'visible';
          };
          const iv = setInterval(() => {
            i += 2;
            tx.textContent = text.slice(0, i);
            if (i % 6 === 0) Sound.sfx('tick');
            if (i >= text.length) finish();
          }, 20);
          const off = pushKeys((e) => {
            if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
              advance();
              return true;
            }
            return false;
          });
          const advance = () => {
            if (!done) finish();
            else {
              off();
              box.removeEventListener('pointerdown', advance);
              resolve();
            }
          };
          box.addEventListener('pointerdown', advance);
        });
      }
    } finally {
      host.innerHTML = '';
      busy = Math.max(0, busy - 1);
    }
  },

  /** Dialogue with choices. Resolves with the picked index. */
  ask(who: string, text: string, options: string[]): Promise<number> {
    const host = $('#dialog');
    busy++;
    const p = ui.portraits[who] ?? { emoji: '💬', color: '#4aa8ff' };
    host.innerHTML = '';
    const box = el(
      'div',
      'dlg',
      `<div class="portrait" style="--pc:${p.color}">${p.emoji}</div><div class="name">${esc(who)}</div><div class="text">${esc(text)}</div><div class="choices"></div>`,
    );
    host.appendChild(box);
    const choices = $('.choices', box);
    return new Promise((resolve) => {
      const pick = (i: number) => {
        off();
        host.innerHTML = '';
        busy = Math.max(0, busy - 1);
        Sound.sfx('ok');
        resolve(i);
      };
      options.forEach((o, i) => {
        const b = el(
          'button',
          'opt-btn',
          `<span class="lbl">${esc(o)}</span><span class="tag">${i + 1}</span>`,
        );
        b.onclick = () => pick(i);
        choices.appendChild(b);
      });
      const off = pushKeys((e) => {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= options.length) {
          pick(n - 1);
          return true;
        }
        return false;
      });
    });
  },

  /** Modal menu. Resolves with the chosen index, or -1 if cancelled. */
  choice({
    title,
    sub = '',
    options,
    cancel = true,
    cancelLabel = 'Never Mind',
    icon = '',
  }: ChoiceConfig): Promise<number> {
    const card = el('div', 'card menu');
    card.innerHTML = `<h2>${icon} ${title}</h2>${sub ? `<div class="sub">${sub}</div>` : '<div style="height:6px"></div>'}<div class="optlist"></div>`;
    const list = $('.optlist', card);
    return new Promise((resolve) => {
      const finish = (i: number) => {
        off();
        ov.close();
        resolve(i);
      };
      options.forEach((o, i) => {
        const b = el(
          'button',
          'opt-btn',
          `<span class="ico">${o.icon ?? ''}</span><span class="lbl">${o.label}${o.sub ? `<span class="sub">${o.sub}</span>` : ''}</span>${o.tag ? `<span class="tag ${o.tagCls ?? ''}">${o.tag}</span>` : ''}`,
        );
        if (o.disabled) b.disabled = true;
        b.onclick = () => finish(i);
        list.appendChild(b);
      });
      if (cancel) {
        const c = el('button', 'btn ghost small cancel', cancelLabel);
        c.onclick = () => finish(-1);
        card.appendChild(c);
      }
      const ov = overlay(card);
      const off = pushKeys((e) => {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= options.length && !options[n - 1].disabled) {
          finish(n - 1);
          return true;
        }
        if (e.key === 'Escape' && cancel) {
          finish(-1);
          return true;
        }
        return false;
      });
    });
  },

  async confirm(text: string, yes = 'Yes', no = 'No', title = 'Are you sure?'): Promise<boolean> {
    const i = await ui.choice({
      title,
      sub: text,
      options: [
        { label: yes, icon: '✅' },
        { label: no, icon: '↩️' },
      ],
      cancel: false,
    });
    return i === 0;
  },

  /** Simple information card with one button. `html` is trusted markup. */
  info(title: string, html: string, btn = 'OK'): Promise<void> {
    const card = el('div', 'card menu', `<h2>${title}</h2><div class="infobody">${html}</div>`);
    const b = el('button', 'btn primary', btn);
    card.appendChild(b);
    return new Promise((resolve) => {
      const ov = overlay(card);
      const done = () => {
        off();
        ov.close();
        resolve();
      };
      b.onclick = done;
      const off = pushKeys((e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          done();
          return true;
        }
        return false;
      });
    });
  },

  /** Result card (stamp, rows, reward chips). Resolves with the index of the pressed button. */
  results({
    title,
    subtitle = '',
    letter = '',
    color = '#ff6b6b',
    rows = [],
    chips = [],
    note = '',
    buttons = [{ label: 'Continue ▶', primary: true }],
    confetti = false,
  }: ResultsConfig): Promise<number> {
    const card = el('div', 'card result');
    card.innerHTML = `<h2>${title}</h2><div class="sub">${subtitle}</div>${letter ? `<div class="stamp" style="--c:${color}">${letter}</div>` : ''}
      <div class="rows">${rows.map(([a, b]) => `<div class="r"><span>${a}</span><span>${b}</span></div>`).join('')}</div>
      <div class="chips">${chips.map((c, i) => `<span class="chip ${c.cls ?? ''}" style="animation-delay:${0.3 + i * 0.08}s">${c.text}</span>`).join('')}</div>${note ? `<div class="sub note">${note}</div>` : ''}<div class="btnrow"></div>`;
    const row = $('.btnrow', card);
    return new Promise((resolve) => {
      const finish = (i: number) => {
        off();
        ov.close();
        resolve(i);
      };
      buttons.forEach((b, i) => {
        const x = el('button', 'btn ' + (b.primary ? 'primary' : (b.cls ?? '')), b.label);
        x.onclick = () => finish(i);
        row.appendChild(x);
      });
      const ov = overlay(card);
      if (letter) setTimeout(() => Sound.sfx('stamp'), 300);
      if (confetti) setTimeout(() => ui.confetti(innerWidth / 2, innerHeight * 0.35, 90), 400);
      const off = pushKeys((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          finish(0);
          return true;
        }
        return false;
      });
    });
  },

  /** Choose consumables to bring to a test. Resolves with the selected item ids. */
  prep({
    title,
    subtitle,
    items,
  }: {
    title: string;
    subtitle: string;
    items: PrepItem[];
  }): Promise<string[]> {
    const selected = new Set<string>();
    const card = el(
      'div',
      'card menu',
      `<h2>🎒 ${title}</h2><div class="sub">${subtitle}</div><div class="optlist"></div>`,
    );
    const list = $('.optlist', card);
    return new Promise((resolve) => {
      for (const it of items) {
        const b = el(
          'button',
          'opt-btn',
          `<span class="ico">${it.icon}</span><span class="lbl">${it.name}<span class="sub">${it.desc}</span></span><span class="tag">×${it.count}</span>`,
        );
        b.onclick = () => {
          if (selected.delete(it.id)) b.classList.remove('picked');
          else {
            selected.add(it.id);
            b.classList.add('picked');
          }
        };
        list.appendChild(b);
      }
      const go = el('button', 'btn primary start', 'Start ▶');
      go.onclick = () => {
        off();
        ov.close();
        resolve([...selected]);
      };
      card.appendChild(go);
      const ov = overlay(card);
      const off = pushKeys((e) => {
        if (e.key === 'Enter') {
          go.click();
          return true;
        }
        return false;
      });
    });
  },

  perkPick(ids: PerkId[], level: number): Promise<PerkId> {
    const card = el(
      'div',
      'card menu',
      `<h2>⭐ Level ${level}!</h2><div class="sub">Choose a new perk. It lasts for the rest of the year.</div><div class="optlist"></div>`,
    );
    return new Promise((resolve) => {
      const finish = (id: PerkId) => {
        off();
        ov.close();
        resolve(id);
      };
      ids.forEach((id, i) => {
        const p = PERKS[id];
        const b = el(
          'button',
          'opt-btn',
          `<span class="ico">${p.icon}</span><span class="lbl">${p.name}<span class="sub">${p.desc}</span></span><span class="tag gold">${i + 1}</span>`,
        );
        b.onclick = () => finish(id);
        $('.optlist', card).appendChild(b);
      });
      const ov = overlay(card);
      Sound.sfx('level');
      ui.confetti(innerWidth / 2, innerHeight * 0.3, 70);
      const off = pushKeys((e) => {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= ids.length) {
          finish(ids[n - 1]);
          return true;
        }
        return false;
      });
    });
  },

  /* ----- confetti (2D overlay canvas) ----- */
  confetti(x: number, y: number, n = 60): void {
    const canvas = $<HTMLCanvasElement>('#fx');
    const g = canvas.getContext('2d');
    if (!g) return;
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const colors = ['#ffb300', '#ff6b6b', '#2fd3a0', '#4aa8ff', '#9b6bff', '#fff'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 4 + Math.random() * 9;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 7,
        r: 4 + Math.random() * 5,
        c: colors[i % colors.length],
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
        life: 1,
      });
    }
    if (confettiRunning) return;
    confettiRunning = true;
    const step = () => {
      g.clearRect(0, 0, innerWidth, innerHeight);
      particles = particles.filter((p) => p.life > 0 && p.y < innerHeight + 30);
      for (const p of particles) {
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.rot += p.vr;
        p.life -= 0.006;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.globalAlpha = Math.max(0, p.life);
        g.fillStyle = p.c;
        g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        g.restore();
      }
      if (particles.length) requestAnimationFrame(step);
      else {
        confettiRunning = false;
        g.clearRect(0, 0, innerWidth, innerHeight);
      }
    };
    requestAnimationFrame(step);
  },

  clearScreens(): void {
    $('#screens').innerHTML = '';
  },
};
