import { describe, expect, it } from 'vitest';
import { COURSES, DEPARTMENTS, NPCS } from '../src/core/data';
import {
  FRIEND_PEOPLE,
  PEOPLE,
  PERSON_IDS,
  PROFESSORS,
  STAFF,
  STUDENTS,
  TONES,
  moodFor,
  pickStudents,
  professorId,
  studentsOf,
  COLD_AT,
  RELATION_CHANGE,
  RELATION_LEVELS,
  WARM_AT,
  relationPoints,
  relationshipLabel,
  replyOptions,
} from '../src/core/people';
import * as St from '../src/core/state';
import { MAJOR_IDS, NPC_IDS, type GameState } from '../src/core/types';
import { mulberry32 } from '../src/core/util';
import { resolveCollisions } from '../src/world/collision';
import { STAFF_SPOTS } from '../src/world/layout';
import { buildCampusGeometry } from '../src/render/campus';

const fresh = (): GameState => St.newState('Tester', St.defaultLook());

describe('gender and default names', () => {
  it('offers female and male, each with its own default name', () => {
    expect(St.GENDERS.map((g) => g.id)).toEqual(['female', 'male']);
    expect(new Set(St.GENDERS.map((g) => g.defaultName)).size).toBe(2);
  });

  it('names a new student after their gender when no name is typed, and keeps a typed one', () => {
    for (const g of St.GENDERS) {
      const s = St.newState('', St.defaultLook(), St.defaultMeta(), g.id);
      expect(s.name).toBe(g.defaultName);
      expect(s.gender).toBe(g.id);
    }
    expect(St.newState('Mina', St.defaultLook(), St.defaultMeta(), 'male').name).toBe('Mina');
  });

  it('never gives the player the name of someone in the cast by default', () => {
    const names = new Set(PERSON_IDS.map((id) => PEOPLE[id].name));
    for (const g of St.GENDERS) expect(names.has(g.defaultName), g.defaultName).toBe(false);
  });
});

describe('the fixed cast', () => {
  it('is exactly 87 people: 16 friends, 40 classmates, 23 professors and 8 staff', () => {
    expect(FRIEND_PEOPLE.length).toBe(16);
    expect(STUDENTS.length).toBe(40);
    expect(PROFESSORS.length).toBe(23);
    expect(STAFF.length).toBe(8);
    expect(PERSON_IDS.length).toBe(87);
    expect(FRIEND_PEOPLE.map((p) => p.id)).toEqual([...NPC_IDS]);
  });

  it('has unique ids and names', () => {
    expect(new Set(PERSON_IDS).size).toBe(PERSON_IDS.length);
    expect(new Set(PERSON_IDS.map((id) => PEOPLE[id].name)).size).toBe(PERSON_IDS.length);
  });

  it('includes every professor who teaches a course, and no professor who teaches none', () => {
    const teaching = new Set(Object.values(COURSES).map((c) => c.prof));
    for (const name of teaching) expect(professorId(name), name).not.toBeNull();
    expect(PROFESSORS.map((p) => p.name).sort()).toEqual([...teaching].sort());
  });

  it('gives everyone a well-defined personality', () => {
    for (const id of PERSON_IDS) {
      const p = PEOPLE[id];
      const P = p.personality;
      expect(P.type, p.name).toMatch(/^The /);
      expect(P.traits.length, p.name).toBe(3);
      expect(P.about.length, p.name).toBeGreaterThan(20);
      expect(p.opener.length, p.name).toBeGreaterThan(5);
      expect(P.likes.length, p.name).toBeGreaterThanOrEqual(1);
      expect(P.dislikes.length, p.name).toBeGreaterThanOrEqual(1);
      for (const t of [...P.likes, ...P.dislikes]) expect(TONES, `${p.name}: ${t}`).toContain(t);
      for (const t of P.likes) expect(P.dislikes, `${p.name} both likes and dislikes ${t}`).not.toContain(t);
    }
  });

  it('assigns every student and friend a department, with eight classmates in each major', () => {
    for (const m of MAJOR_IDS) expect(studentsOf(m).length, m).toBe(8);
    for (const x of [...FRIEND_PEOPLE, ...STUDENTS]) {
      expect(MAJOR_IDS, x.name).toContain(x.dept);
      expect(x.title, x.name).toContain(`${DEPARTMENTS[x.dept!].short} student`);
    }
    for (const id of NPC_IDS) expect(PEOPLE[id].dept).toBe(NPCS[id].major);
    for (const m of MAJOR_IDS)
      expect(
        FRIEND_PEOPLE.some((f) => f.dept === m),
        m,
      ).toBe(true);
  });

  it('assigns every professor the department whose courses they teach', () => {
    for (const c of Object.values(COURSES)) {
      const prof = PEOPLE[professorId(c.prof)!];
      expect(prof.dept, `${c.prof} teaching ${c.name}`).toBe(c.area);
      expect(prof.title).toBe(`${DEPARTMENTS[c.area].short} professor`);
    }
  });

  it('fills a class only with students of the departments that take it', () => {
    for (const id of pickStudents(mulberry32(2), 40, ['eee'])) expect(PEOPLE[id].dept).toBe('eee');
    expect(pickStudents(mulberry32(2), 40, ['eee']).length).toBe(8);
    expect(pickStudents(mulberry32(2), 40, ['cse', 'phy']).length).toBe(16);
  });

  it('is who the rankings are made of', () => {
    expect(St.classmates().map((c) => c.name)).toEqual(STUDENTS.map((p) => p.name));
  });

  it('draws background characters from the classmates without repeating any', () => {
    const a = pickStudents(mulberry32(4), 16);
    expect(new Set(a).size).toBe(16);
    for (const id of a) expect(PEOPLE[id].role).toBe('student');
    expect(pickStudents(mulberry32(4), 100).length).toBe(40);
  });
});

describe('relationship', () => {
  it('starts neutral with everyone, as the only score', () => {
    const s = fresh();
    for (const id of PERSON_IDS) {
      const b = St.bondOf(s, id);
      expect(b.rel, id).toBe(0);
      expect(Object.keys(b), id).not.toContain('interaction');
    }
  });

  it('goes both ways and stays between -100 and +100', () => {
    const s = fresh();
    expect(St.addRel(s, 'p_zhao', -30)).toBe(-30);
    expect(St.bondOf(s, 'p_zhao').rel).toBe(-30);
    St.addRel(s, 'p_zhao', -500);
    expect(St.bondOf(s, 'p_zhao').rel).toBe(-100);
    St.addRel(s, 'p_zhao', 900);
    expect(St.bondOf(s, 'p_zhao').rel).toBe(100);
    St.addRel(s, 'maya', -15);
    expect(s.friends.maya.rel).toBe(-15);
  });

  it('only ever changes in multiples of 5', () => {
    expect([0, 1, 4, 7.4, 7.5, 12, 12.5, 15, -1, -8, -12.5].map(St.relStep)).toEqual([
      0, 5, 5, 5, 10, 10, 15, 15, -5, -10, -15,
    ]);
    // whatever the amount, the Charisma level and the perk
    for (let cha = 1; cha <= 30; cha++) {
      for (const perk of [false, true]) {
        const s = fresh();
        s.stats.cha = cha;
        if (perk) s.perks.push('social');
        for (const v of [1, 3, 5, 10, 15, 22.7, -4, -10, -20]) {
          const change = St.addRel(s, 's_ben', v);
          expect(Math.abs(change % St.REL_STEP), `cha ${cha} perk ${perk} value ${v}`).toBe(0);
          expect(Math.abs(s.people.s_ben.rel % St.REL_STEP)).toBe(0);
        }
      }
    }
  });

  it('is written in multiples of 5 for every reply and story choice', () => {
    for (const v of Object.values(RELATION_CHANGE)) expect(Math.abs(v % St.REL_STEP)).toBe(0);
    for (const [id, N] of Object.entries(NPCS)) {
      for (const o of N.beats.flatMap((b) => b.options)) expect((o.fx.rel ?? 0) % St.REL_STEP, id).toBe(0);
    }
  });

  it('moves odd scores from older saves to the nearest step', () => {
    const old = JSON.parse(JSON.stringify(fresh()));
    old.friends.maya.rel = 8.32;
    old.friends.kai.rel = -12.5;
    old.people = { s_ben: { rel: 2.08, talked: 1 } };
    const back = St.migrateSave(old)!;
    expect([back.friends.maya.rel, back.friends.kai.rel, back.people.s_ben.rel]).toEqual([10, -15, 0]);
  });

  it('makes the same reply please one person and annoy another', () => {
    expect(moodFor(PEOPLE.s_ben, 'humour')).toBe('liked');
    expect(moodFor(PEOPLE.p_sorensen, 'humour')).toBe('disliked');
    expect(moodFor(PEOPLE.p_sorensen, 'honest')).toBe('liked');
    expect(moodFor(PEOPLE.s_ben, 'dismissive')).toBe('rude');
    const s = fresh();
    expect(St.converse(s, 's_ben', 'humour').relation).toBeGreaterThan(0);
    expect(St.converse(s, 'p_sorensen', 'humour').relation).toBeLessThan(0);
  });

  it('offers four replies: three different tones and one brush-off', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const r = replyOptions(mulberry32(seed));
      expect(r.length).toBe(4);
      expect(new Set(r.map((x) => x.tone)).size).toBe(4);
      expect(r.filter((x) => x.tone === 'dismissive').length).toBe(1);
      for (const o of r) expect(o.text.length).toBeGreaterThan(3);
    }
  });

  it('has eleven levels, one every 20 points', () => {
    expect(RELATION_LEVELS.map((l) => l.at)).toEqual([-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100]);
    expect(new Set(RELATION_LEVELS.map((l) => l.name)).size).toBe(11);
  });

  it('reaches each level on hitting its number, counting away from zero', () => {
    const cases: [number, string][] = [
      [-100, 'Nemesis'],
      [-99, 'Hostile'],
      [-80, 'Hostile'],
      [-79, 'Resentful'],
      [-60, 'Resentful'],
      [-59, 'Annoyed'],
      [-40, 'Annoyed'],
      [-39, 'Wary'],
      [-20, 'Wary'],
      [-19, 'Neutral'],
      [0, 'Neutral'],
      [19, 'Neutral'],
      [20, 'Friendly'],
      [39, 'Friendly'],
      [40, 'Trusted'],
      [59, 'Trusted'],
      [60, 'Close'],
      [79, 'Close'],
      [80, 'Loyal'],
      [99, 'Loyal'],
      [100, 'Devoted'],
    ];
    for (const [points, name] of cases) expect(relationshipLabel(points).name, String(points)).toBe(name);
  });

  it('judges levels on the rounded number the player sees', () => {
    expect(relationPoints(19.6)).toBe(20);
    expect(relationPoints(-19.5)).toBe(-20);
    expect(relationshipLabel(19.6).name).toBe('Friendly');
    expect(relationshipLabel(19.4).name).toBe('Neutral');
    expect(relationshipLabel(-19.5).name).toBe('Wary');
  });

  it('lines the cut-offs and story scenes up with the levels', () => {
    expect(relationshipLabel(WARM_AT).name).toBe('Friendly');
    expect(relationshipLabel(COLD_AT).name).toBe('Wary');
    for (const [id, N] of Object.entries(NPCS))
      expect(
        N.beats.map((b) => b.at),
        id,
      ).toEqual([20, 40, 60]);
  });

  it('survive saving, with gender and department', () => {
    const s = St.newState('Tester', St.defaultLook(), St.defaultMeta(), 'male', 'eee');
    St.converse(s, 'p_osei', 'honest');
    const back = St.migrateSave(JSON.parse(JSON.stringify(s)))!;
    expect(back.gender).toBe('male');
    expect(back.major).toBe('eee');
    expect(back.people.p_osei).toEqual(s.people.p_osei);
  });

  it('drop the removed interaction points from older saves', () => {
    const s = fresh();
    St.converse(s, 'p_osei', 'honest');
    const old = JSON.parse(JSON.stringify(s));
    old.friends.maya.interaction = 40;
    old.people.p_osei.interaction = 10;
    const back = St.migrateSave(old)!;
    expect(back.friends.maya).toEqual(s.friends.maya);
    expect(back.people.p_osei).toEqual(s.people.p_osei);
  });

  it('replace a missing or no longer offered gender or department with the default', () => {
    const old = JSON.parse(JSON.stringify(fresh()));
    delete old.people;
    old.gender = 'unknown';
    old.major = 'econ';
    const up = St.migrateSave(old)!;
    expect(up.gender).toBe('female');
    expect(up.major).toBe('cse');
    expect(up.people).toEqual({});
  });
});

describe('staff on campus', () => {
  it('stand in clear spots you can walk up to, and are real members of the cast', () => {
    const { colliders } = buildCampusGeometry();
    for (const spot of STAFF_SPOTS) {
      expect(PEOPLE[spot.id]?.role, spot.id).toBe('staff');
      const p = { x: spot.x, z: spot.z };
      resolveCollisions(colliders, p, 0.45);
      expect(Math.hypot(p.x - spot.x, p.z - spot.z), spot.id).toBeLessThan(0.3);
    }
  });
});
