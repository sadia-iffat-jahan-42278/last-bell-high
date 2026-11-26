// Entry point: boot, title / new-game / menu flows and the interact action.
import './style.css';
import { Sound } from './audio/sound';
import { COURSES, FINALS, NPCS, SUBJECTS } from './core/data';
import { PEOPLE } from './core/people';
import * as St from './core/state';
import {
  beginDay,
  buildingInteractions,
  game,
  refreshHud,
  resume,
  save,
  talkPerson,
  talkTo,
  petCat,
} from './game';
import * as GameApi from './game';
import { Input } from './input';
import { openJournal } from './journal';
import { Scene3D } from './scene';
import { $, esc } from './ui/dom';
import { hud } from './ui/hud';
import { creatorScreen, helpScreen, settingsScreen, titleScreen } from './ui/screens';
import { ui } from './ui/ui';

let scene: Scene3D;
let input: Input;
/** True while an async action (menu, journal, door interaction) owns the player. */
let busyAction = false;

const canAct = (): boolean => scene.mode === 'play' && !ui.isBusy() && !busyAction;

function applySettings(meta = game.meta): void {
  Sound.setVolumes(meta.settings.music, meta.settings.sfx);
  scene.view.setQuality(meta.settings.quality);
  St.saveMeta(meta);
}

function toggleMute(): void {
  game.muted = !game.muted;
  Sound.setMuted(game.muted);
  refreshHud();
}

/** Run `fn` as the player's current exclusive action. */
async function exclusive(fn: () => Promise<void>): Promise<void> {
  if (busyAction) return;
  busyAction = true;
  try {
    await fn();
  } finally {
    busyAction = false;
  }
}

const openJournalSafe = () => exclusive(() => openJournal());

function openMenu(): Promise<void> {
  return exclusive(async () => {
    for (;;) {
      const i = await ui.choice({
        title: '☰ Menu',
        options: [
          { icon: '▶️', label: 'Resume' },
          { icon: '💾', label: 'Save Game', sub: 'Progress also saves automatically' },
          { icon: '⚙️', label: 'Settings' },
          { icon: '❓', label: 'How to Play' },
          { icon: '🏠', label: 'Quit to Title' },
        ],
        cancel: false,
      });
      if (i === 0 || i < 0) break;
      if (i === 1) {
        save();
        ui.toast('💾 Game saved', 'good');
      } else if (i === 2) await settingsScreen(game.meta, applySettings);
      else if (i === 3) await helpScreen();
      else if (
        i === 4 &&
        (await ui.confirm('Your progress is saved. Return to the title screen?', 'Quit', 'Stay'))
      ) {
        save();
        game.s = null;
        scene.mode = 'title';
        hud.hide();
        void ui.fade(false);
        scene.setPeriod(2, true);
        void titleFlow();
        break;
      }
    }
  });
}

/** The thing the player is standing next to: enter a door, talk to a friend or pet a cat. */
async function interact(): Promise<void> {
  const t = scene.target;
  if (!t || !canAct()) return;
  if (t.kind !== 'npc' && t.kind !== 'person' && t.kind !== 'cat' && !t.info.enabled) {
    ui.toast(t.info.why || 'Not available right now.', 'bad');
    Sound.sfx('wrong');
    return;
  }
  busyAction = true;
  try {
    if (t.kind === 'building') {
      Sound.sfx('door');
      await t.info.run();
    } else if (t.kind === 'npc') {
      scene.npcActor(t.id).c.wave(1.2);
      await talkTo(t.id);
    } else if (t.kind === 'person') await talkPerson(t.id);
    else if (t.kind === 'cat') await petCat(t.i);
    else {
      // Inside a classroom: sit at your seat, talk to the professor or leave by the door.
      if (t.kind === 'exit') Sound.sfx('door');
      await t.info.run();
    }
  } catch (err) {
    console.error(err);
    ui.toast('Something went wrong: ' + (err instanceof Error ? err.message : String(err)), 'bad', 6000);
    ui.clearScreens();
  } finally {
    busyAction = false;
    refreshHud();
    save();
  }
}

/* ======================= title / new game flow ======================= */
async function titleFlow(autoNew = false): Promise<void> {
  scene.mode = 'title';
  hud.hide();
  Sound.init();
  Sound.startMusic('explore');
  if (autoNew) {
    await newGameFlow();
    return;
  }
  for (;;) {
    const sv = St.loadGame();
    const choice = await titleScreen({
      hasSave: !!sv,
      saveInfo: sv ? `· ${esc(sv.name)} · Day ${sv.day + 1}` : '',
    });
    if (choice === 'help') await helpScreen();
    else if (choice === 'settings') await settingsScreen(game.meta, applySettings);
    else if (choice === 'continue' && sv) {
      await continueFlow(sv);
      return;
    } else if (choice === 'new') {
      if (
        sv &&
        !(await ui.confirm('Starting a new game will overwrite your saved progress.', 'Start New', 'Cancel'))
      )
        continue;
      await newGameFlow();
      return;
    }
  }
}

async function continueFlow(sv: NonNullable<ReturnType<typeof St.loadGame>>): Promise<void> {
  await exclusive(async () => {
    game.s = sv;
    ui.portraits[sv.name] = { emoji: '🙂', color: '#4aa8ff' };
    scene.playerChar.setLook(sv.look);
    ui.clearScreens();
    hud.show();
    scene.mode = 'play';
    Sound.init();
    await ui.fade(true, '📓 Loading…');
    await resume();
  });
}

async function newGameFlow(): Promise<void> {
  scene.mode = 'creator';
  const meta = game.meta;
  const look = St.defaultLook();
  Sound.init();
  Sound.startMusic('explore');
  scene.playerChar.setLook(look);
  scene.setPeriod(2, true);
  const res = await creatorScreen({
    look,
    name: St.defaultName('female'),
    gender: 'female',
    major: 'cse',
    unlocks: {
      hair: [0, 1, 2, 3],
      blazer: [0, 1, 2, 3],
      bag: [0, 1, 2, 3],
      acc: ['none', 'glasses', ...meta.unlockedAcc],
    },
    onChange: (l) => scene.playerChar.setLook(l),
  });
  await exclusive(async () => {
    const s = St.newState(res.name, res.look, meta, res.gender, res.major);
    game.s = s;
    ui.portraits[s.name] = { emoji: '🙂', color: '#4aa8ff' };
    ui.clearScreens();
    hud.show();
    scene.mode = 'play';
    scene.playerChar.setLook(s.look);
    St.saveGame(s);
    await beginDay(true);
  });
}

/* ======================= boot ======================= */
function boot(): void {
  const canvas = $<HTMLCanvasElement>('#gl');
  input = new Input(canvas, {
    canAct,
    onInteract: () => void interact(),
    onJournal: () => void openJournalSafe(),
    onMute: toggleMute,
    onMenu: () => void openMenu(),
  });
  try {
    scene = new Scene3D(canvas, input, () => ui.isBusy() || busyAction);
  } catch (e) {
    document.body.innerHTML = `<div class="fatal">😢 This game needs WebGL.<br><small>${esc(e instanceof Error ? e.message : e)}</small></div>`;
    return;
  }

  Object.assign(ui.portraits, {
    'Dean Hale': { emoji: '🧑‍🏫', color: '#8a6bff' },
    'Campus Security': { emoji: '🧍', color: '#ff6b6b' },
    'Registrar Clerk': { emoji: '🧑‍💼', color: '#7ec8a0' },
    'Café Manager': { emoji: '👩‍🍳', color: '#ff9a3c' },
    'Chef Marco': { emoji: '👨‍🍳', color: '#ff9a3c' },
    'Club Coordinator': { emoji: '📋', color: '#ff7a59' },
    'Guest Speaker': { emoji: '🧑‍🚀', color: '#4aa8ff' },
    'Club Captain': { emoji: '📣', color: '#ff7a59' },
    You: { emoji: '🙂', color: '#4aa8ff' },
  });
  const roleColour = { friend: '#4aa8ff', student: '#4aa8ff', professor: '#9b6bff', staff: '#ff9a3c' };
  for (const p of Object.values(PEOPLE)) ui.portraits[p.name] = { emoji: p.emoji, color: roleColour[p.role] };
  for (const N of Object.values(NPCS)) ui.portraits[N.name] = { emoji: N.emoji, color: N.color };
  for (const F of FINALS) ui.portraits[F.name] = { emoji: F.emoji, color: F.color };
  for (const c of Object.values(COURSES))
    ui.portraits[c.prof] ??= { emoji: '🧑‍🏫', color: SUBJECTS[c.area].color };

  game.scene = scene;
  game.onTitle = (newGamePlus) => {
    scene.mode = 'title';
    hud.hide();
    ui.clearScreens();
    void ui.fade(false);
    void titleFlow(newGamePlus);
  };
  hud.bind({
    onJournal: () => canAct() && void openJournalSafe(),
    onMute: toggleMute,
    onMenu: () => canAct() && void openMenu(),
  });
  ui.onPrompt = () => {
    if (canAct()) void interact();
  };
  applySettings(game.meta);
  // Most browsers hold audio back until the player interacts, so resume it on the first click, tap or key press.
  for (const type of ['pointerdown', 'pointerup', 'keydown']) {
    addEventListener(type, () => Sound.init(), { capture: true });
  }
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  scene.setPeriod(2, true);
  scene.mode = 'title';
  void titleFlow();

  if (import.meta.env.DEV || location.search.includes('debug')) {
    (window as unknown as { __game: unknown }).__game = {
      game,
      St,
      Data: { COURSES },
      Game: GameApi,
      interactions: buildingInteractions,
      ui,
      scene,
      busy: () => ({ action: busyAction, ui: ui.isBusy(), mode: scene.mode }),
    };
  }
}

try {
  boot();
} catch (e) {
  console.error(e);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<pre class="fatal-log">Failed to start: ${esc(e instanceof Error ? (e.stack ?? e.message) : e)}</pre>`,
  );
}
