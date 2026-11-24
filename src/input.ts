// Player input: keyboard, mouse-drag camera, wheel zoom and the touch joystick.
import { Sound } from './audio/sound';
import { clamp } from './core/util';
import { $ } from './ui/dom';

export interface InputHandlers {
  /** True when the world should react to input (playing, no overlay open). */
  canAct(): boolean;
  onInteract(): void;
  onJournal(): void;
  onMute(): void;
  onMenu(): void;
}

export class Input {
  /** Currently held keys, lower-cased `KeyboardEvent.key`. */
  readonly keys: Record<string, boolean> = {};
  /** Touch joystick axes, -1..1 (y is up). */
  readonly joy = { x: 0, y: 0 };
  camYaw = 0;
  camPitch = 0.42;
  camDist = 9.5;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly h: InputHandlers,
  ) {
    this.wireKeyboard();
    this.wirePointer();
    this.wireTouch();
  }

  /** Stop all held movement (e.g. when the window loses focus). */
  releaseAll(): void {
    for (const k in this.keys) this.keys[k] = false;
  }

  private wireKeyboard(): void {
    addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      Sound.init();
      if (!this.h.canAct()) return;
      if (k === 'e' || k === 'enter' || k === ' ') {
        this.h.onInteract();
        e.preventDefault();
      } else if (k === 'j' || k === 'tab') {
        this.h.onJournal();
        e.preventDefault();
      } else if (k === 'm') this.h.onMute();
      else if (k === 'escape') this.h.onMenu();
    });
    addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
  }

  private wirePointer(): void {
    const c = this.canvas;
    let drag: { x: number; y: number; id: number } | null = null;
    c.addEventListener('pointerdown', (e) => {
      Sound.init();
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      this.camYaw -= (e.clientX - drag.x) * 0.006;
      this.camPitch = clamp(this.camPitch + (e.clientY - drag.y) * 0.004, 0.12, 1.2);
      drag.x = e.clientX;
      drag.y = e.clientY;
    });
    const end = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) drag = null;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener(
      'wheel',
      (e) => {
        if (this.h.canAct()) this.camDist = clamp(this.camDist + Math.sign(e.deltaY) * 0.8, 5, 16);
      },
      { passive: true },
    );
  }

  private wireTouch(): void {
    const joyEl = $('#joy');
    const knob = $('#joy i');
    let id: number | null = null;
    const move = (e: PointerEvent) => {
      const r = joyEl.getBoundingClientRect();
      let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      this.joy.x = dx;
      this.joy.y = -dy;
      knob.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
    };
    joyEl.addEventListener('pointerdown', (e) => {
      id = e.pointerId;
      joyEl.setPointerCapture(id);
      Sound.init();
      move(e);
    });
    joyEl.addEventListener('pointermove', (e) => {
      if (e.pointerId === id) move(e);
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      this.joy.x = this.joy.y = 0;
      knob.style.transform = '';
    };
    joyEl.addEventListener('pointerup', release);
    joyEl.addEventListener('pointercancel', release);
    $('#tact').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Sound.init();
      if (this.h.canAct()) this.h.onInteract();
    });
  }
}
