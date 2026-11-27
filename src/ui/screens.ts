// Full-screen flows: title menu, help, settings and the character creator.
import { Sound } from '../audio/sound';
import { DEPARTMENTS } from '../core/courses';
import { GENDERS, defaultName } from '../core/state';
import {
  MAJOR_IDS,
  type Accessory,
  type Gender,
  type Look,
  type MajorId,
  type Meta,
  type Unlocks,
} from '../core/types';
import { hexCss } from '../core/util';
import { ACCESSORIES, BAGS, BLAZERS, HAIR_COLORS, HAIR_STYLES, SKINS } from '../render/characters';
import { $, el, esc } from './dom';
import { ui, wireSfx } from './ui';

export type TitleChoice = 'continue' | 'new' | 'help' | 'settings';

export function titleScreen(opts: { hasSave: boolean; saveInfo: string }): Promise<TitleChoice> {
  const host = $('#screens');
  host.innerHTML = '';
  const t = el(
    'div',
    'title-screen',
    `<div class="logo">ENGINEERS<br><span style="font-size:0.62em;letter-spacing:4px">OF THE ELITE</span></div><div class="tagline">Five departments. Eight semesters. One engineering degree.</div><div class="titlebtns"></div>`,
  );
  host.appendChild(t);
  const row = $('.titlebtns', t);
  return new Promise((resolve) => {
    const add = (label: string, cls: string, value: TitleChoice) => {
      const b = el('button', 'btn ' + cls, label);
      b.onclick = () => {
        Sound.init();
        Sound.sfx('ok');
        resolve(value);
      };
      row.appendChild(b);
    };
    if (opts.hasSave) add(`▶ Continue <small>${opts.saveInfo}</small>`, 'primary', 'continue');
    add('✨ New Game', opts.hasSave ? '' : 'primary', 'new');
    add('❓ How to Play', '', 'help');
    add('⚙ Settings', '', 'settings');
  });
}

export function helpScreen(): Promise<void> {
  return ui.info(
    'How to Play',
    `<b>Goal:</b> survive four years (8 semesters), ace your courses, make friends in every year and graduate with the best rank you can.<br><br>
    🕘 <b>Every day has 6 periods</b>: three lectures, lunch, after class and evening. Check the 📌 notice board for today’s rooms.<br>
    🏫 <b>Six department halls, five storeys each:</b> CSE, EEE, Math, Physics, Chemistry and Humanities. You belong to one of five departments, which sets your courses; each course is taught in its own department’s hall, so you will visit several. Check the 📌 notice board or a lobby directory, walk in and <b>climb the stairs</b> at the end of the corridor. Find the room number on the door, press <b>E</b>, take the glowing seat (<b>E</b>) and the lesson starts. Chat with the professor first for a study tip.<br>
    🔔 <b>Lectures</b> and <b>midterms</b> are quick quizzes. Keep a streak for a combo bonus! <b>Finals Day</b> ends each semester with a boss fight.<br>
    🎓 <b>Meet every year.</b> Upperclassmen give advice, younger students look up to you, and your year changes as you progress.<br>
    🍜 <b>The canteen is a real room.</b> Walk in, order at the hot-food counter, carry your tray to a table and sit down to eat (lunch uses the period). Friends eat there too, so sit near them! The store and vending machines are open all day.<br>
    🎭 <b>The Club House</b> holds five clubs: chess, music, dance, debate and sports, each in its own themed room. Joining is <b>mandatory</b>: every semester you register for <b>one or two</b> clubs (never more) and must attend. Sessions are mini-games that raise your stats and earn coins.<br>
    ⚡ <b>Energy & stress</b> matter: tired students answer slower. Eat, relax on the rooftop and sleep.<br>
    💬 <b>Talk to anyone.</b> All 87 people, students, professors and staff, have their own personality. How you answer moves your <b>Relationship</b> up or down. Check their profile to see what they like. Friends also unlock story scenes and permanent bonuses; gifts help!<br>
    ⭐ Explore! Gold stars and cats are hidden around campus.<br><br>
    <b>Controls:</b> WASD/arrows move · Shift run · E interact · drag or Q/Z rotate camera · scroll zoom · J journal · M mute. On touch: joystick + button.`,
    'Got It!',
  );
}

const QUALITY_LEVELS: [label: string, value: number][] = [
  ['Low', 0.6],
  ['Medium', 0.85],
  ['High', 1.2],
];

export function settingsScreen(meta: Meta, onChange: (m: Meta) => void): Promise<void> {
  const card = el(
    'div',
    'card menu',
    `<h2>⚙ Settings</h2><div class="field">Music</div><input type="range" id="s-m" min="0" max="1" step="0.05" value="${meta.settings.music}" class="slider"><div class="field">Sound effects</div><input type="range" id="s-s" min="0" max="1" step="0.05" value="${meta.settings.sfx}" class="slider"><div class="field">Graphics quality</div><div class="btnrow left" id="s-q"></div><div class="spacer"></div>`,
  );
  const q = $('#s-q', card);
  for (const [name, value] of QUALITY_LEVELS) {
    const b = el(
      'button',
      'btn small' + (Math.abs(meta.settings.quality - value) < 0.01 ? ' primary' : ''),
      name,
    );
    b.onclick = () => {
      meta.settings.quality = value;
      [...q.children].forEach((c) => c.classList.remove('primary'));
      b.classList.add('primary');
      onChange(meta);
    };
    q.appendChild(b);
  }
  $<HTMLInputElement>('#s-m', card).oninput = (e) => {
    meta.settings.music = +(e.target as HTMLInputElement).value;
    onChange(meta);
  };
  const effects = $<HTMLInputElement>('#s-s', card);
  effects.oninput = () => {
    meta.settings.sfx = +effects.value;
    onChange(meta);
  };
  // Play a sample when the slider is released, so the new level can be heard.
  effects.onchange = () => Sound.sfx('ok');
  const done = el('button', 'btn primary', 'Done');
  card.appendChild(done);
  return new Promise((resolve) => {
    const ov = ui.overlay(card);
    done.onclick = () => {
      ov.close();
      resolve();
    };
  });
}

export interface CreatorConfig {
  look: Look;
  unlocks: Unlocks;
  name: string;
  gender: Gender;
  major: MajorId;
  onChange(look: Look): void;
}

export function creatorScreen({
  look,
  unlocks,
  onChange,
  name,
  gender: firstGender,
  major: firstMajor,
}: CreatorConfig): Promise<{ name: string; look: Look; gender: Gender; major: MajorId }> {
  let gender = firstGender;
  let major = firstMajor;
  const host = $('#screens');
  host.innerHTML = '';
  const wrap = el('div', 'title-screen creator');
  const card = el('div', 'card creator-card');
  wrap.appendChild(card);
  host.appendChild(wrap);
  card.innerHTML = `<h2>Create your student</h2><div class="sub">Pick a look. You can change it later in the Journal wardrobe.</div>
    <div class="field">Gender</div><div id="c-gender"></div>
    <div class="field">Name</div><input class="txt" id="c-name" maxlength="14" value="${esc(name || defaultName(gender))}" aria-label="Name">
    <div class="field">Department</div><div id="c-major"></div><div class="sub" id="c-school"></div>
    <div class="field">Skin</div><div id="c-skin"></div><div class="field">Hair style</div><div id="c-hs"></div><div class="field">Hair colour</div><div id="c-hc"></div>
    <div class="field">Blazer</div><div id="c-bl"></div><div class="field">Backpack</div><div id="c-bg"></div><div class="field">Accessory</div><div id="c-ac"></div>
    <div class="btnrow crfoot"><button class="btn small" id="c-rand">🎲 Random</button><button class="btn primary" id="c-go">Start Year ▶</button></div>`;

  type ColourKey = 'skin' | 'hair' | 'blazer' | 'bag';
  const swatches = (id: string, colours: number[], key: ColourKey, locked?: (i: number) => boolean) => {
    const h = $(id, card);
    h.innerHTML = '';
    colours.forEach((c, i) => {
      const isLocked = locked?.(i) ?? false;
      const s = el('span', 'swatch' + (look[key] === c ? ' on' : '') + (isLocked ? ' lock' : ''));
      s.style.background = hexCss(c);
      s.onclick = () => {
        if (isLocked) return;
        look[key] = c;
        Sound.sfx('click');
        render();
        onChange(look);
      };
      h.appendChild(s);
    });
  };
  const chips = <T extends string>(
    id: string,
    options: { id: T; name: string; lock?: boolean }[],
    key: 'hairStyle' | 'acc',
  ) => {
    const h = $(id, card);
    h.innerHTML = '';
    for (const o of options) {
      const c = el(
        'span',
        'chipbtn ' + (o.lock ? 'locked' : 'clickable') + (look[key] === o.id ? ' on' : ''),
        (o.lock ? '🔒 ' : '') + o.name,
      );
      c.onclick = () => {
        if (o.lock) return;
        (look[key] as string) = o.id;
        Sound.sfx('click');
        render();
        onChange(look);
      };
      h.appendChild(c);
    }
  };
  // Picking a gender changes the default name; a name you typed yourself is left alone.
  const genderChips = () => {
    const h = $('#c-gender', card);
    h.innerHTML = '';
    for (const g of GENDERS) {
      const c = el('span', 'chipbtn clickable' + (gender === g.id ? ' on' : ''), g.name);
      c.dataset.gender = g.id;
      c.onclick = () => {
        const input = $<HTMLInputElement>('#c-name', card);
        const typed = input.value.trim();
        const untouched = !typed || GENDERS.some((o) => o.defaultName === typed);
        gender = g.id;
        if (untouched) input.value = defaultName(gender);
        Sound.sfx('click');
        genderChips();
      };
      h.appendChild(c);
    }
  };
  // The department decides which courses you take for all eight semesters.
  const majorChips = () => {
    const h = $('#c-major', card);
    h.innerHTML = '';
    for (const id of MAJOR_IDS) {
      const D = DEPARTMENTS[id];
      const c = el('span', 'chipbtn clickable' + (major === id ? ' on' : ''), `${D.icon} ${D.short}`);
      c.dataset.major = id;
      c.onclick = () => {
        major = id;
        Sound.sfx('click');
        majorChips();
      };
      h.appendChild(c);
    }
    $('#c-school', card).textContent = `Department of ${DEPARTMENTS[major].school}`;
  };
  const capital = (s: string) => s[0].toUpperCase() + s.slice(1);
  const render = () => {
    swatches('#c-skin', SKINS, 'skin');
    swatches('#c-hc', HAIR_COLORS, 'hair', (i) => !unlocks.hair.includes(i));
    swatches('#c-bl', BLAZERS, 'blazer', (i) => !unlocks.blazer.includes(i));
    swatches('#c-bg', BAGS, 'bag', (i) => !unlocks.bag.includes(i));
    chips(
      '#c-hs',
      HAIR_STYLES.map((h) => ({ id: h, name: capital(h) })),
      'hairStyle',
    );
    chips(
      '#c-ac',
      ACCESSORIES.map((a) => ({ id: a, name: capital(a), lock: !unlocks.acc.includes(a) })),
      'acc',
    );
  };
  render();
  genderChips();
  majorChips();
  onChange(look);
  const nameInput = $<HTMLInputElement>('#c-name', card);
  // Clicking the untouched default selects it, so typing replaces it.
  nameInput.onclick = () => {
    if (nameInput.value === defaultName(gender)) nameInput.select();
  };

  return new Promise((resolve) => {
    const pickFrom = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
    $('#c-rand', card).onclick = () => {
      look.skin = pickFrom(SKINS);
      look.hairStyle = pickFrom(HAIR_STYLES);
      look.hair = pickFrom(HAIR_COLORS.filter((_, i) => unlocks.hair.includes(i)));
      look.blazer = pickFrom(BLAZERS.filter((_, i) => unlocks.blazer.includes(i)));
      look.bag = pickFrom(BAGS.filter((_, i) => unlocks.bag.includes(i)));
      look.acc = pickFrom<Accessory>(unlocks.acc);
      Sound.sfx('whoosh');
      render();
      onChange(look);
    };
    $('#c-go', card).onclick = () => {
      const n = nameInput.value.trim() || defaultName(gender);
      Sound.sfx('ok');
      resolve({ name: n, look, gender, major });
    };
    wireSfx(card);
  });
}
