// In-game heads-up display.
import { $, $maybe } from './dom';
import { ui, wireSfx } from './ui';

export interface HudInfo {
  dayTxt: string;
  periodTxt: string;
  periodIcon: string;
  period: number;
  weather: string;
  objective: string;
  coins: number;
  level: number;
  xp: number;
  xpNeed: number;
  energy: number;
  stress: number;
  muted: boolean;
  quests: { text: string; need: number; prog: number; done: boolean }[];
}

export interface PromptInfo {
  text: string;
  enabled: boolean;
  why?: string;
}

export interface HudHandlers {
  onJournal(): void;
  onMute(): void;
  onMenu(): void;
}

let built = false;

function build(): void {
  $('#hud').innerHTML = `
    <div class="hud-tl"><span class="pill" id="h-day">Day 1</span><span class="pill"><span id="h-per">Morning</span><span class="periods" id="h-periods"></span></span><span class="pill" id="h-weather"></span></div>
    <div id="objective"><span class="pill" id="h-obj"></span></div>
    <div class="hud-tr"><div class="hud-btns"><button class="hudbtn" id="b-journal">📓 Journal <small>[J]</small></button><button class="hudbtn" id="b-mute">🔊</button><button class="hudbtn" id="b-menu">☰</button></div>
      <span class="pill">🪙 <b id="h-coins">0</b></span>
      <div class="barrow"><span id="h-lvl"></span><div class="bar xp"><div id="h-xp"></div></div></div>
      <div class="barrow"><span>⚡ Energy</span><div class="bar energy"><div id="h-en"></div></div></div>
      <div class="barrow"><span>😵 Stress</span><div class="bar stress"><div id="h-st"></div></div></div></div>
    <div id="questbox"><h4>Daily quests</h4><div id="h-q"></div></div>
    <canvas id="minimap" width="300" height="300"></canvas>
    <div id="prompt" class="hidden"></div>
    <div id="bottomhint"><span class="kbd">WASD</span>move <span class="kbd">Shift</span>run <span class="kbd">E</span>interact <span class="kbd">Q/Z·drag</span>camera</div>`;
  built = true;
  wireSfx($('#hud'));
}

export const hud = {
  /** Hook up the top-right buttons. Call once after the first `show()`. */
  bind(h: HudHandlers): void {
    if (!built) build();
    $('#b-journal').onclick = h.onJournal;
    $('#b-mute').onclick = h.onMute;
    $('#b-menu').onclick = h.onMenu;
  },
  show(): void {
    if (!built) build();
    $('#hud').classList.remove('hidden');
  },
  hide(): void {
    $('#hud').classList.add('hidden');
  },
  update(i: HudInfo): void {
    if (!built) build();
    $('#h-day').innerHTML = `📅 ${i.dayTxt}`;
    $('#h-per').innerHTML = `${i.periodIcon} ${i.periodTxt}&nbsp;`;
    $('#h-periods').innerHTML = [0, 1, 2, 3, 4]
      .map((p) => `<i class="${p < i.period ? 'done' : p === i.period ? 'now' : ''}"></i>`)
      .join('');
    $('#h-weather').textContent = i.weather;
    $('#h-obj').textContent = i.objective;
    $('#objective').style.display = i.objective ? '' : 'none';
    $('#h-coins').textContent = String(i.coins);
    $('#h-lvl').innerHTML = `<span class="lvlchip">Lv ${i.level}</span>`;
    $('#h-xp').style.width = (i.xp / i.xpNeed) * 100 + '%';
    $('#h-en').style.width = i.energy + '%';
    $('#h-st').style.width = i.stress + '%';
    $('#h-q').innerHTML = i.quests
      .map(
        (q) =>
          `<div class="q ${q.done ? 'done' : ''}"><span>${q.done ? '✅' : '🔸'}</span><span>${q.text}</span><b>${q.need > 1 ? `${Math.min(q.prog, q.need)}/${q.need}` : ''}</b></div>`,
      )
      .join('');
    $('#b-mute').textContent = i.muted ? '🔇' : '🔊';
  },
  /** Show the context button near the bottom ("Attend Math class", …). Pass null to hide. */
  setPrompt(p: PromptInfo | null): void {
    const b = $maybe('#prompt');
    if (!b) return;
    if (!p) {
      b.classList.add('hidden');
      b.dataset.key = '';
      return;
    }
    const key = p.text + p.enabled + (p.why ?? '');
    if (b.dataset.key === key) return;
    b.dataset.key = key;
    b.classList.remove('hidden');
    b.innerHTML = `<button class="btn primary ${p.enabled ? '' : 'off'}"><span class="kbd">E</span>${p.text}</button>${p.why ? `<div class="why">${p.why}</div>` : ''}`;
    $('button', b).onclick = () => ui.onPrompt?.();
  },
};
