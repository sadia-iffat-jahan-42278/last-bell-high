// Journal: stats, subjects, friends, items, wardrobe and collection.
import { Sound } from './audio/sound';
import { ACCESSORIES, BAGS, BLAZERS, HAIR_COLORS, HAIR_STYLES, SKINS } from './render/characters';
import {
  ACC_LOCK,
  ACC_PRICE,
  ACHIEVEMENTS,
  BUILDING_LABEL,
  CLUBS,
  COLOR_PRICES,
  COURSES,
  CURRICULUM,
  ITEMS,
  NPCS,
  PERKS,
  ROOM_KIND_NAME,
  SUBJECTS,
  SUBJECT_IDS,
  TERMS,
  YEAR_NAMES,
  gradeOf,
  xpForLevel,
} from './core/data';
import * as St from './core/state';
import {
  NPC_IDS,
  type Accessory,
  type ClubId,
  type GameState,
  type HairStyle,
  type ItemId,
  type NpcId,
  type StatId,
} from './core/types';
import { hexCss } from './core/util';
import { game, refreshHud, relationText, save } from './game';
import { $, el, esc } from './ui/dom';
import { ui } from './ui/ui';

type TabId = 'me' | 'courses' | 'subj' | 'friends' | 'items' | 'wardrobe' | 'collect';
const TABS: [TabId, string][] = [
  ['me', '🙂 Me'],
  ['courses', '🎓 Courses'],
  ['subj', '📚 Subjects'],
  ['friends', '💖 Friends'],
  ['items', '🎒 Items'],
  ['wardrobe', '👕 Wardrobe'],
  ['collect', '⭐ Collection'],
];

const STAT_INFO: [StatId, string, string, string, string][] = [
  ['int', 'Intelligence', '🧠', 'Hints & tougher tests', '#4aa8ff'],
  ['foc', 'Focus', '🎯', '+0.35s per question', '#9b6bff'],
  ['sta', 'Stamina', '💪', 'Cheaper energy costs', '#ff7a59'],
  ['cha', 'Charisma', '😄', 'Friends & shop discounts', '#ff6bd6'],
  ['cre', 'Creativity', '🎨', 'Rhythm & lab bonuses', '#2fd3a0'],
];

const meter = (v: number, max: number, color: string): string =>
  `<div class="meter"><div style="width:${Math.min(100, (v / max) * 100)}%;--c:${color}"></div></div>`;

type ColourKind = 'hair' | 'blazer' | 'bag';
const capital = (s: string): string => s[0].toUpperCase() + s.slice(1);

export function openJournal(startTab: TabId = 'me'): Promise<void> {
  const s = game.s;
  if (!s) return Promise.resolve();
  let tab = startTab;
  const card = el('div', 'card journal');
  const ov = ui.overlay(card);

  return new Promise((resolve) => {
    const close = () => {
      off();
      ov.close();
      resolve();
    };
    const off = ui.pushKeys((e) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'j') {
        close();
        return true;
      }
      return false;
    });

    const render = () => {
      card.innerHTML = `<h2>📓 ${esc(s.name)}’s Journal</h2><div class="tabs">${TABS.map(
        ([id, n]) => `<button class="tab ${id === tab ? 'on' : ''}" data-t="${id}">${n}</button>`,
      ).join(
        '',
      )}<span class="grow"></span><button class="tab" data-close="1">✖ Close</button></div><div id="jbody"></div>`;
      card.querySelectorAll<HTMLElement>('[data-t]').forEach((b) => {
        b.onclick = () => {
          tab = b.dataset.t as TabId;
          Sound.sfx('click');
          render();
        };
      });
      $('[data-close]', card).onclick = close;
      VIEWS[tab]($('#jbody', card));
    };

    const VIEWS: Record<TabId, (b: HTMLElement) => void> = {
      me(b) {
        const rk = St.rankOf(s, St.term(s));
        b.innerHTML = `<div class="grid2"><div class="box"><h4>Level ${s.level}</h4>
          <div class="statrow"><span class="nm">XP</span>${meter(s.xp, xpForLevel(s.level), '#9b6bff')}<b class="auto">${s.xp}/${xpForLevel(s.level)}</b></div>
          <div class="statrow"><span class="nm">⚡ Energy</span>${meter(s.energy, 100, '#2fd3a0')}<b>${Math.round(s.energy)}</b></div>
          <div class="statrow"><span class="nm">😵 Stress</span>${meter(s.stress, 100, '#ff6b6b')}<b>${Math.round(s.stress)}</b></div>
          <div class="statrow"><span class="nm">😇 Rep</span>${meter(s.rep, 100, '#ffb300')}<b>${Math.round(s.rep)}</b></div>
          <div class="statrow"><span class="nm">🪙 Coins</span><span class="strong grow">${s.coins}</span></div>
          <div class="statrow"><span class="nm">🎓 Year</span><span class="strong grow">${YEAR_NAMES[St.yearOf(s) - 1]} · semester ${St.term(s) + 1} of ${TERMS}</span></div>
          <div class="statrow"><span class="nm">🏆 Rank</span><span class="strong grow">${rk ? `#${rk.rank} of ${rk.total} (${Math.round(rk.score)}% · GPA ${St.gpaOf(rk.score).toFixed(2)})` : 'No grades yet'}</span></div></div>
          <div class="box"><h4>Stats</h4>${STAT_INFO.map(
            ([k, n, i, d, c]) =>
              `<div class="statrow" title="${d}"><span class="nm">${i} ${n}</span>${meter((s.stats[k] % 1) * 100, 100, c)}<b>${St.stat(s, k)}</b></div><div class="statnote">${d}</div>`,
          ).join('')}</div></div>
        <div class="box spaced"><h4>Perks (${s.perks.length}/${Object.keys(PERKS).length})</h4>${
          s.perks.length
            ? s.perks
                .map(
                  (p) =>
                    `<span class="badge">${PERKS[p].icon} <span><b>${PERKS[p].name}</b><br><small>${PERKS[p].desc}</small></span></span>`,
                )
                .join('')
            : '<span class="muted">Level up to choose perks!</span>'
        }</div>`;
      },

      courses(b) {
        const t = St.term(s);
        const today = St.timetable(s);
        const meets = (id: string) =>
          today.some((x, i) => x === id || (x === 'TEST' && St.testCourse(s) === id && i >= 0))
            ? ' · 📍 today'
            : '';
        const rows = CURRICULUM[t]
          .map((id) => {
            const c = COURSES[id];
            const sc = St.courseScore(s, t, id);
            const grade = sc === null ? '—' : `${gradeOf(sc / 100).letter} · ${Math.round(sc)}%`;
            return `<div class="statrow"><span class="nm" style="width:auto;flex:1">${SUBJECTS[c.area].icon} <b>${c.name}</b> <small>${c.code} · ${ROOM_KIND_NAME[c.kind]} ${c.room} (${BUILDING_LABEL[c.building]}, floor ${c.floor}) · ${c.prof}${meets(id)}${St.testCourse(s) === id ? ' · 📝 midterm' : ''}</small></span><b class="wide">${grade}</b></div>`;
          })
          .join('');
        const history = Array.from({ length: t }, (_, i) => {
          const rep = s.termReports.find((r) => r.term === i);
          return `<span class="badge">Sem ${i + 1} · ${rep ? `${Math.round(rep.score)}% · GPA ${St.gpaOf(rep.score).toFixed(2)} · #${rep.rank ?? '—'}` : '—'}</span>`;
        }).join('');
        b.innerHTML = `<div class="box"><h4>Semester ${t + 1} of ${TERMS} · ${YEAR_NAMES[St.yearOf(s) - 1]} year · ${CURRICULUM[t].length} courses</h4>${rows}</div>
          <div class="box spaced"><h4>Transcript</h4>${history || '<span class="muted">Your first semester is still in progress.</span>'}</div>`;
      },

      subj(b) {
        const subjects = SUBJECT_IDS.map((id) => {
          const S = SUBJECTS[id];
          const m = s.mastery[id];
          const termGrades = Array.from({ length: TERMS }, (_, t) => {
            const scores = CURRICULUM[t]
              .filter((c) => COURSES[c].area === id)
              .map((c) => St.courseScore(s, t, c))
              .filter((v): v is number => v !== null);
            return scores.length
              ? gradeOf(scores.reduce((a, v) => a + v, 0) / scores.length / 100).letter
              : '—';
          })
            .slice(0, St.term(s) + 1)
            .join(' · ');
          return `<div class="box"><h4>${S.icon} ${S.name}</h4><div class="statrow"><span class="nm">Mastery Lv ${St.masteryLevel(s, id)}</span>${meter(m, 100, S.color)}<b>${Math.floor(m)}</b></div><div class="note1">Semester grades: ${termGrades}</div><div class="note2">+${(m / 22).toFixed(1)}s per question · ${Math.round(Math.min(60, m / 5))}% extra hint chance</div></div>`;
        }).join('');
        const clubs = (Object.entries(CLUBS) as [ClubId, (typeof CLUBS)[ClubId]][])
          .map(
            ([id, C]) =>
              `<div class="statrow"><span class="nm">${C.icon} ${C.name.replace(' Club', '')}${St.isMember(s, id) ? ' ✅' : ''}</span>${meter(St.clubProgress(s.clubs[id].xp) * 100, 100, C.color)}<b class="wide">Lv ${St.clubLevel(s.clubs[id].xp)}</b></div>`,
          )
          .join('');
        b.innerHTML = `<div class="grid2">${subjects}</div><div class="box spaced"><h4>Clubs</h4>${clubs}<div class="note2">Semester ${St.term(s) + 1}: ${
          St.members(s)
            .map(
              (id) =>
                `${CLUBS[id].icon} ${CLUBS[id].name} (${St.sessionsOf(s, id)} session${St.sessionsOf(s, id) === 1 ? '' : 's'})`,
            )
            .join(' · ') || 'not registered yet'
        }. Joining is mandatory: one or two clubs each semester, and you must attend.</div></div>`;
      },

      friends(b) {
        const card = (id: NpcId): string => {
          const N = NPCS[id];
          const f = s.friends[id];
          const hearts = Math.floor(f.rel / 20);
          const next = N.beats[f.story];
          return `<div class="box" style="border-color:${N.color}"><h4>${N.emoji} ${N.name} · ${N.role}</h4><div class="bio"><b>${N.major}</b> · ${relationText(s, id)}<br>${N.bio}</div><div class="hearts5">${'❤️'.repeat(hearts)}${'🤍'.repeat(5 - hearts)} <small>${Math.round(f.rel)}/100</small></div>
              <div class="story">Story: ${f.story}/3 ${next ? `· next at ${next.at}` : '· complete'}</div>${N.perks
                .map(
                  (p) =>
                    `<div class="perkline" style="opacity:${f.story >= p.need ? 1 : 0.45}">${f.story >= p.need ? '✅' : '🔒'} ${p.text}</div>`,
                )
                .join('')}</div>`;
        };
        b.innerHTML = [1, 2, 3, 4]
          .map(
            (y) =>
              `<h4 class="spaced">${y === St.yearOf(s) ? '🤝' : y > St.yearOf(s) ? '🎓' : '🌱'} ${YEAR_NAMES[y - 1]} students${y === St.yearOf(s) ? ' (your year)' : y > St.yearOf(s) ? ' (above you)' : ' (below you)'}</h4><div class="grid2">${NPC_IDS.filter(
                (id) => NPCS[id].year === y,
              )
                .map(card)
                .join('')}</div>`,
          )
          .join('');
      },

      items(b) {
        const keys = (Object.keys(ITEMS) as ItemId[]).filter((k) => (s.items[k] ?? 0) > 0);
        b.innerHTML = `<div class="box">${
          keys.length
            ? keys
                .map(
                  (k) =>
                    `<div class="itemrow"><span class="ico">${ITEMS[k].icon}</span><span class="grow">${ITEMS[k].name} <b>×${s.items[k]}</b><small>${ITEMS[k].use}</small></span>${
                      ITEMS[k].consumable
                        ? `<button class="btn small good" data-use="${k}">Use</button>`
                        : '<small class="bold">bring to tests</small>'
                    }</div>`,
                )
                .join('')
            : '<div class="muted">Your bag is empty. Visit the canteen shop!</div>'
        }</div>`;
        b.querySelectorAll<HTMLElement>('[data-use]').forEach((x) => {
          x.onclick = () => {
            const k = x.dataset.use as ItemId;
            if (!s.items[k]) return;
            s.items[k] = (s.items[k] ?? 1) - 1;
            if (k === 'drink') St.addEnergy(s, 35);
            else {
              St.addEnergy(s, 15);
              St.addStress(s, -8);
            }
            Sound.sfx('ok');
            ui.toast(`${ITEMS[k].icon} Used ${ITEMS[k].name}`, 'good');
            refreshHud();
            save();
            render();
          };
        });
      },

      wardrobe(b) {
        wardrobe(b, s, render);
      },

      collect(b) {
        const trophies =
          s.showcase.map((x) => `${CLUBS[x.club].icon} T${x.term + 1}: ${x.place}`).join(' · ') || 'None yet';
        b.innerHTML = `<div class="grid2"><div class="box"><h4>Campus secrets</h4><div class="big">⭐ Gold stars: ${s.stars.length} / 10</div><div class="big tight">🐱 Cats met: ${s.cats.length} / 3</div><div class="hint">Stars unlock a cap (3), headphones (6) and a crown (10).</div></div>
          <div class="box"><h4>Showcase results</h4><div class="bold">${trophies}</div><h4 class="spaced">Streaks</h4><div class="bold">🔥 Quest streak: ${s.questStreak} days</div><div class="bold tight">✅ Lectures attended: ${s.totals.classes}</div></div></div>
          <div class="box spaced"><h4>Achievements (${Object.keys(s.ach).length}/${ACHIEVEMENTS.length})</h4>${ACHIEVEMENTS.map(
            (a) =>
              `<span class="badge ${s.ach[a.id] ? '' : 'locked'}" title="${a.desc}">${a.icon} <span><b>${a.name}</b><br><small>${a.desc}</small></span></span>`,
          ).join('')}</div>`;
      },
    };
    render();
  });
}

/** Wardrobe tab: change hair, colours and accessories; buy locked options with coins. */
function wardrobe(b: HTMLElement, s: GameState, rerender: () => void): void {
  const look = s.look;
  const unlocked = s.unlocks;
  const price = (kind: ColourKind, i: number): number | undefined => COLOR_PRICES[kind][i];
  const swatches = (
    colours: number[],
    key: 'skin' | 'hair' | 'blazer' | 'bag',
    kind: 'skin' | ColourKind,
  ): string =>
    colours
      .map((c, i) => {
        const owned = kind === 'skin' || unlocked[kind].includes(i);
        const cost = kind === 'skin' ? undefined : price(kind, i);
        return `<span class="swatch ${look[key] === c ? 'on' : ''} ${owned ? '' : 'lock'}" data-k="${key}" data-kind="${kind}" data-i="${i}" style="background:${hexCss(c)}">${owned ? '' : `<small>🪙${cost}</small>`}</span>`;
      })
      .join('');
  b.innerHTML = `<div class="box"><h4>Hair style</h4>${HAIR_STYLES.map((h) => `<span class="chipbtn clickable ${look.hairStyle === h ? 'on' : ''}" data-hs="${h}">${capital(h)}</span>`).join('')}
    <h4 class="spaced">Skin</h4>${swatches(SKINS, 'skin', 'skin')}<h4 class="spaced">Hair colour</h4>${swatches(HAIR_COLORS, 'hair', 'hair')}<h4 class="spaced">Blazer</h4>${swatches(BLAZERS, 'blazer', 'blazer')}<h4 class="spaced">Backpack</h4>${swatches(BAGS, 'bag', 'bag')}
    <h4 class="spaced">Accessory</h4>${ACCESSORIES.map((a) => {
      const owned = unlocked.acc.includes(a);
      const hint = ACC_PRICE[a] ? '🪙' + ACC_PRICE[a] : (ACC_LOCK[a] ?? '');
      return `<span class="chipbtn clickable ${look.acc === a ? 'on' : ''}" data-ac="${a}" style="opacity:${owned ? 1 : 0.6}">${owned ? '' : '🔒 '}${capital(a)}${owned ? '' : ` <small>${hint}</small>`}</span>`;
    }).join('')}</div>`;

  const apply = () => {
    game.scene.setPlayerLook(look);
    save();
    rerender();
  };
  const buy = async (what: string, cost: number): Promise<boolean> => {
    if (s.coins < cost) {
      ui.toast('Not enough coins', 'bad');
      return false;
    }
    if (!(await ui.confirm(`Buy ${what} for 🪙 ${cost}?`, 'Buy', 'Cancel', 'Wardrobe'))) {
      rerender();
      return false;
    }
    s.coins -= cost;
    Sound.sfx('coin');
    refreshHud();
    return true;
  };

  b.querySelectorAll<HTMLElement>('[data-hs]').forEach((x) => {
    x.onclick = () => {
      look.hairStyle = x.dataset.hs as HairStyle;
      Sound.sfx('click');
      apply();
    };
  });
  const palettes: Record<'skin' | ColourKind, number[]> = {
    skin: SKINS,
    hair: HAIR_COLORS,
    blazer: BLAZERS,
    bag: BAGS,
  };
  b.querySelectorAll<HTMLElement>('.swatch').forEach((x) => {
    x.onclick = async () => {
      const kind = x.dataset.kind as 'skin' | ColourKind;
      const i = Number(x.dataset.i);
      const key = x.dataset.k as 'skin' | 'hair' | 'blazer' | 'bag';
      if (kind !== 'skin' && !unlocked[kind].includes(i)) {
        const cost = price(kind, i);
        if (cost === undefined || !(await buy('this colour', cost))) return;
        unlocked[kind].push(i);
      }
      look[key] = palettes[kind][i];
      Sound.sfx('click');
      apply();
    };
  });
  b.querySelectorAll<HTMLElement>('[data-ac]').forEach((x) => {
    x.onclick = async () => {
      const a = x.dataset.ac as Accessory;
      if (!unlocked.acc.includes(a)) {
        const cost = ACC_PRICE[a];
        if (!cost) {
          ui.toast(ACC_LOCK[a] ?? 'Locked', 'bad');
          return;
        }
        if (!(await buy(`the ${a}`, cost))) return;
        unlocked.acc.push(a);
      }
      look.acc = a;
      Sound.sfx('click');
      apply();
    };
  });
}
