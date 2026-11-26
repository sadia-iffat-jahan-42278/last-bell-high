import { describe, expect, it } from 'vitest';
import { COURSES, DEPARTMENTS, NPCS } from '../src/core/data';
import {
  FRIEND_PEOPLE,
  PEOPLE,
  PERSONALITY_AT,
  PERSON_IDS,
  PROFESSORS,
  STAFF,
  STUDENTS,
  TONES,
  interactionLevel,
  moodFor,
  pickStudents,
  professorId,
  studentsOf,
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

describe('interaction and relationship points', () => {
  it('start at zero with everyone, with the personality hidden', () => {
    const s = fresh();
    for (const id of PERSON_IDS) {
      const b = St.bondOf(s, id);
      expect(b.interaction, id).toBe(0);
      expect(b.rel, id).toBe(0);
      expect(St.knowsPersonality(s, id), id).toBe(false);
    }
  });

  it('interaction only ever goes up', () => {
    const s = fresh();
    expect(St.addInteraction(s, 's_ben', 10)).toBe(10);
    expect(St.addInteraction(s, 's_ben', -50)).toBe(0);
    expect(St.bondOf(s, 's_ben').interaction).toBe(10);
  });

  it('relationship goes both ways and stays between -100 and +100', () => {
    const s = fresh();
    expect(St.addRel(s, 'p_zhao', -30)).toBe(-30);
    expect(St.bondOf(s, 'p_zhao').rel).toBe(-30);
    St.addRel(s, 'p_zhao', -500);
    expect(St.bondOf(s, 'p_zhao').rel).toBe(-100);
    St.addRel(s, 'p_zhao', 900);
    expect(St.bondOf(s, 'p_zhao').rel).toBe(100);
    St.addRel(s, 'maya', -12);
    expect(s.friends.maya.rel).toBe(-12);
  });

  it('reveals the personality at the interaction threshold, however the conversations went', () => {
    const s = fresh();
    const id = 's_ivan'; // likes straight talk
    let unlocks = 0;
    for (let day = 0; day < 4; day++) {
      s.day = day;
      const out = St.converse(s, id, 'dismissive');
      expect(out.interaction).toBe(10);
      expect(out.relation).toBeLessThan(0);
      if (out.unlocked) unlocks++;
      expect(St.knowsPersonality(s, id)).toBe(St.bondOf(s, id).interaction >= PERSONALITY_AT);
    }
    expect(unlocks).toBe(1);
    expect(St.bondOf(s, id).rel).toBeLessThan(-30);
    expect(St.bondOf(s, id).interaction).toBe(40);
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

  it('names the levels and bands', () => {
    expect(interactionLevel(0).name).toBe('Stranger');
    expect(interactionLevel(PERSONALITY_AT).name).toBe('Familiar');
    expect(relationshipLabel(-80).name).toBe('Hostile');
    expect(relationshipLabel(0).name).toBe('Neutral');
    expect(relationshipLabel(90).name).toBe('Devoted');
  });

  it('survive saving, with gender and department', () => {
    const s = St.newState('Tester', St.defaultLook(), St.defaultMeta(), 'male', 'eee');
    St.converse(s, 'p_osei', 'honest');
    const back = St.migrateSave(JSON.parse(JSON.stringify(s)))!;
    expect(back.gender).toBe('male');
    expect(back.major).toBe('eee');
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
