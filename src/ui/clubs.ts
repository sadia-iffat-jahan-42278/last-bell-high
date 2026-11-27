// Club registration: one screen where the player ticks one or two clubs and confirms once.
import { CLUBS, CLUB_MAX } from '../core/data';
import { CLUB_IDS, type ClubId } from '../core/types';
import { $, el } from './dom';
import { ui } from './ui';

export interface ClubPickerConfig {
  /** Semester number, counting from 1. */
  semester: number;
  /** The player's current level in each club. */
  levels: Record<ClubId, number>;
}

/** Let the player choose between one and `CLUB_MAX` clubs. Joining is mandatory, so there is no cancel. */
export function pickClubs({ semester, levels }: ClubPickerConfig): Promise<ClubId[]> {
  const selected = new Set<ClubId>();
  const card = el(
    'div',
    'card clubpick',
    `<h2>📋 Club Registration</h2>
    <div class="clubhead"><span class="sub">Semester ${semester} · Pick one or two clubs</span><span class="clubcount" aria-live="polite"></span></div>
    <div class="clubgrid"></div>
    <div class="clubfoot"><span class="sub">You can’t change clubs until next semester.</span><button class="btn primary clubgo"></button></div>`,
  );
  const grid = $('.clubgrid', card);
  const count = $('.clubcount', card);
  const go = $<HTMLButtonElement>('.clubgo', card);

  return new Promise((resolve) => {
    const cards = new Map<ClubId, HTMLButtonElement>();
    const refresh = () => {
      const full = selected.size >= CLUB_MAX;
      for (const [id, b] of cards) {
        const on = selected.has(id);
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('picked', on);
        b.classList.toggle('full', full && !on);
      }
      count.textContent = `${selected.size} of ${CLUB_MAX} selected`;
      go.disabled = selected.size === 0;
      go.textContent =
        selected.size === 0 ? 'Pick a Club' : `Join ${selected.size} Club${selected.size > 1 ? 's' : ''} ▶`;
    };
    const toggle = (id: ClubId) => {
      if (!selected.delete(id)) {
        if (selected.size >= CLUB_MAX) {
          ui.toast('Deselect a club first', 'bad', 2200);
          return;
        }
        selected.add(id);
      }
      refresh();
    };
    const confirm = () => {
      if (!selected.size) return;
      off();
      ov.close();
      resolve([...selected]);
    };

    CLUB_IDS.forEach((id, i) => {
      const C = CLUBS[id];
      const b = el(
        'button',
        'clubcard',
        `<span class="ico">${C.icon}</span><span class="name">${C.name}</span><span class="mark"></span><span class="desc">${C.short}</span><span class="meta"><span>Trains ${C.stat.toUpperCase()} · ${C.stat2.toUpperCase()}</span><span>Level ${levels[id]}</span></span>`,
      );
      b.dataset.club = id;
      b.title = `Press ${i + 1}`;
      // A mouse click should not leave focus on the card, so that Enter still confirms. Tab focus works as usual.
      b.onmousedown = (e) => e.preventDefault();
      b.onclick = () => toggle(id);
      cards.set(id, b);
      grid.appendChild(b);
    });
    go.onclick = confirm;
    refresh();
    const ov = ui.overlay(card);
    // Start focus inside the dialog, so Tab goes to the clubs and not to the HUD buttons behind it.
    card.tabIndex = -1;
    card.focus();
    const off = ui.pushKeys((e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= CLUB_IDS.length) {
        toggle(CLUB_IDS[n - 1]);
        return true;
      }
      // Enter on a card reached with Tab toggles that card (the browser's own behaviour); otherwise it confirms.
      if (e.key === 'Enter' && !(e.target as HTMLElement).classList?.contains('clubcard')) {
        confirm();
        return true;
      }
      return false;
    });
  });
}
