// The live 3D scene: player, friends, crowd, props, camera, labels and minimap.
import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  type MeshLambertMaterial,
} from 'three';
import {
  CLUBS,
  DEPARTMENTS,
  EVENING_PERIOD,
  EXAM_HALL,
  NPCS,
  PERIODS,
  SUBJECTS,
  YEAR_NAMES,
  courseInRoom,
  roomCode,
  SLOTS_PER_FLOOR,
} from './core/data';
import * as St from './core/state';
import {
  CLUB_IDS,
  type ClubId,
  type Look,
  type NpcId,
  type PersonId,
  type Weather,
  type ZoneId,
} from './core/types';
import { mulberry32 } from './core/util';
import {
  buildingInteractions,
  canteenInteractions,
  canteenSeat,
  changeFloor,
  classroomSpec,
  clubhouseInteractions,
  clubRoomInteractions,
  collectStar,
  floorInteractions,
  floorWord,
  game,
  objectiveTarget,
  roomInteractions,
  type CanteenSpec,
  type ClubSpec,
  type FloorSpec,
  type Interaction,
  type RoomSpec,
  type SceneHooks,
} from './game';
import type { Input } from './input';
import { createCampus, type Campus } from './render/campus';
import { Character, NPC_LOOKS, personLook, professorLook, randomLook, staffLook } from './render/characters';
import { SH, part, setColor } from './render/parts';
import { CLUB_COLOUR } from './render/clubhouse';
import { PEOPLE, pickStudents, professorId, relationPoints } from './core/people';
import { floorVariant } from './render/departments';
import {
  classKey,
  createRooms,
  floorKey,
  type InteriorKind,
  type Person,
  type RoomInterior,
} from './render/rooms';
import { GameView, type CameraRig } from './render/view';
import { $, $maybe, el } from './ui/dom';
import { hud } from './ui/hud';
import { resolveCollisions } from './world/collision';
import {
  BUILDINGS,
  CATS,
  BOUNDS,
  CROWD_POINTS,
  GATE,
  GATHERING_SPOTS,
  ROOF_STAIRS,
  STAFF_SPOTS,
  START,
  STARS,
  ZONES,
} from './world/layout';
import { lightAt } from './world/lighting';
import {
  headCount,
  newWanderer,
  randInt,
  randomSpot,
  separate,
  shuffle,
  stepWanderer,
  type Busyness,
  type Keep,
  type WanderArea,
  type Wanderer,
} from './world/wander';

export type Mode = 'boot' | 'title' | 'creator' | 'play';

export type Target =
  | { kind: 'building'; id: ZoneId; info: Interaction }
  | { kind: 'npc'; id: NpcId }
  | { kind: 'person'; id: PersonId }
  | { kind: 'cat'; i: number }
  | {
      kind: 'seat' | 'exit' | 'prof' | 'order' | 'store' | 'vending' | 'door' | 'desk' | 'play';
      info: Interaction;
    };

/** The classroom (or the canteen) the player is currently inside. */
interface ActiveRoom {
  spec: RoomSpec | CanteenSpec | ClubSpec | FloorSpec;
  interior: RoomInterior;
  seated: boolean;
  /** Canteen only: dining seats taken by diners and friends. */
  occupied: Set<number>;
  /** Canteen only: friends sitting at the tables, with the seat each one took. */
  guests: { id: NpcId; seat: number }[];
}

const isCanteen = (r: ActiveRoom | null): boolean => r?.spec.kind === 'canteen';
const isClub = (r: ActiveRoom | null): boolean => !!r && !!r.interior.club;
const isFloor = (r: ActiveRoom | null): boolean => !!r && !!r.interior.floor;
const isMemberOf = (c: ClubId): boolean => !!game.s && St.isMember(game.s, c);

/** Interior camera: a steep, close follow view kept inside the room so walls never block it. */
const ROOM_PITCH = 0.85;
const ROOM_DIST = 6.5;
const CLASSMATES = 16;
/** The most students who can be out on campus at once. */
const CROWD = 14;
/** Someone walking stops, and turns to you, when you come this close. */
const ATTEND = 2.4;
/** ...and waits this many seconds for you to say something before carrying on, unless you are facing a prompt for them. */
const PATIENCE = 8;

interface NpcActor {
  id: NpcId;
  c: Character;
  x: number;
  z: number;
  greeted: boolean;
  /** Floor height (stage, bleachers) when the friend is indoors. */
  y: number;
}
/** A character who is walking about at the moment. */
interface Walker {
  c: Character;
  w: Wanderer;
  area: WanderArea;
  /** Pose while standing still (or all the time, for dancers). */
  idle: 'none' | 'dance' | 'play';
  /** Set for friends, so their name tag, map dot and prompt follow them. */
  npc?: NpcActor;
  /** Set for staff with a fixed role outdoors. */
  staff?: { id: PersonId; x: number; z: number };
  floorY?: (x: number, z: number) => number;
  attend: number;
  /** How long the player has been standing next to them. */
  waited: number;
  /** The way they face while standing and nobody is near (the professor faces the class). */
  rest?: number;
}
interface WalkOptions {
  speed?: number;
  idle?: Walker['idle'];
  npc?: NpcActor;
  staff?: Walker['staff'];
  floorY?: Walker['floorY'];
  attend?: number;
  pause?: [number, number];
  rest?: number;
  /** Start here instead of somewhere random. */
  at?: { x: number; z: number };
}
interface StarActor {
  root: Group;
  core: Mesh;
  core2: Mesh;
  glow: Mesh;
  phase: number;
}
interface CatActor {
  root: Group;
  body: Mesh;
  tail: Mesh;
  i: number;
  x: number;
  z: number;
}

const PERIOD_HOURS = [...PERIODS.map((p) => p.hour), 21.5];
/** Fixed bright "classroom lighting" used indoors regardless of the hour or weather. */
const INDOOR_HOUR = 13;
const RING_ZONES: ZoneId[] = [
  'hum',
  'math',
  'cse',
  'eee',
  'phy',
  'chem',
  'library',
  'canteen',
  'club',
  'roof',
  'gate',
  'notice',
];
const CAT_COLORS = [0xe0883a, 0x8a8f9a, 0x2c2c34];
const RAIN_DROPS = 420;

const LABEL_DEFS: { id: ZoneId; text: string; x: number; z: number; y: number }[] = [
  ...BUILDINGS.map((b) => ({
    id: b.id as ZoneId,
    text: `${b.icon} ${b.name}`,
    x: b.door.x,
    z: b.door.z,
    y: b.door.h + 2.9,
  })),
  { id: 'roof', text: '🌤️ Rooftop', x: ROOF_STAIRS.x, z: ROOF_STAIRS.door.z, y: 6 },
  { id: 'gate', text: '🏠 Home', x: GATE.x, z: 50, y: 5.6 },
  { id: 'notice', text: '📌 Notice Board', x: -8, z: -21, y: 3.4 },
];

const ROOM_LABEL_IDS = [
  'room_prof',
  'room_exit',
  'room_seat',
  'room_store',
  'room_vend',
  'room_desk',
  'room_play',
  'room_name',
  'room_floor',
  'room_up',
  'room_down',
  ...[0, 1, 2, 3, 4, 5].map((i) => 'room_fd_' + i),
  ...CLUB_IDS.map((c) => 'room_door_' + c),
];
const cssHex = (n: number) => '#' + n.toString(16).padStart(6, '0');

export class Scene3D implements SceneHooks {
  mode: Mode = 'boot';
  /** The thing the player is standing next to (door, friend, cat), if any. */
  target: Target | null = null;
  readonly view: GameView;
  readonly playerChar: Character;
  readonly player = { x: START.x, z: START.z };

  private readonly campus: Campus;
  private readonly npcs = {} as Record<NpcId, NpcActor>;
  /** Background students out on campus. */
  private readonly crowd: Character[] = [];
  /** Who is walking about outside, and in the room the player is in. */
  private readonly outdoorWalkers = new Map<Character, Walker>();
  private readonly indoorWalkers = new Map<Character, Walker>();
  private readonly stars: StarActor[] = [];
  private readonly cats: CatActor[] = [];
  private readonly rings = {} as Record<ZoneId, Mesh>;
  private readonly beacon: Mesh;
  private readonly rooms: Record<InteriorKind, RoomInterior>;
  private readonly staff: Character[] = [];
  /** The meal tray the player carries around the canteen. */
  private readonly tray = new Group();
  private readonly trayFood: Mesh;
  private trayOn = false;
  private readonly professor: Character;
  private readonly classmates: Character[] = [];
  /** Which member of the cast each background character is being right now. */
  private readonly who = new Map<Character, PersonId>();
  /** Staff standing about on campus. */
  private readonly outdoor: { id: PersonId; c: Character; x: number; z: number }[] = [];
  private readonly seatRing: Mesh;
  private readonly exitRing: Mesh;
  /** Set while the player is inside a classroom. */
  private room: ActiveRoom | null = null;
  /** Current floor height under the player (stages are raised). */
  private playerY = 0;
  /** Set while a change of floor is under way, so the stairs do not fire twice. */
  private stairLock = false;
  private readonly rain: LineSegments;
  private readonly rainData = new Float32Array(RAIN_DROPS * 3);
  private readonly rainPos = new Float32Array(RAIN_DROPS * 2 * 3);
  private readonly labels = new Map<string, HTMLElement>();
  private readonly cam: CameraRig = { eye: [0, 20, 40], target: [0, 0, 0] };
  private camTarget: [number, number, number] = [0, 1.4, START.z];
  private vel: [number, number] = [0, 0];
  private time = 0;
  private lastFrame = performance.now();
  private minimapTimer = 0;
  private readonly tod = { hour: 14, target: 14 };
  private weather: Weather = 'sunny';
  private rainAmount = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly input: Input,
    private readonly isBlocked: () => boolean,
  ) {
    this.view = new GameView(canvas);
    this.campus = createCampus();
    this.view.scene.add(this.campus.group);

    this.playerChar = new Character(St.defaultLook());
    this.view.scene.add(this.playerChar.root);

    for (const id of Object.keys(NPC_LOOKS) as NpcId[]) {
      const c = new Character(NPC_LOOKS[id]);
      c.root.visible = false;
      this.npcs[id] = { id, c, x: 0, z: 0, greeted: false, y: 0 };
      this.view.scene.add(c.root);
    }
    this.rooms = createRooms();
    for (const r of Object.values(this.rooms)) this.view.scene.add(r.group);
    this.professor = new Character(professorLook('Professor'));
    this.professor.root.visible = false;
    this.view.scene.add(this.professor.root);
    for (let i = 0; i < CLASSMATES; i++) {
      const c = new Character(randomLook(mulberry32(300 + i)));
      c.root.visible = false;
      this.classmates.push(c);
      this.view.scene.add(c.root);
    }
    for (let i = 0; i < 3; i++) {
      const c = new Character(staffLook(i));
      c.root.visible = false;
      this.staff.push(c);
      this.view.scene.add(c.root);
    }
    this.trayFood = part(SH.sph, { p: [0, 0.1, 0], s: [0.14, 0.09, 0.14], t: 0xe0a020 });
    this.tray.add(
      part(SH.box, { p: [0, 0.02, 0], s: [0.72, 0.04, 0.5], t: 0x8e949c }),
      part(SH.box, { p: [0, 0.06, 0], s: [0.34, 0.03, 0.34], t: 0xffffff }),
      part(SH.box, { p: [0.25, 0.1, -0.1], s: [0.09, 0.12, 0.09], t: 0x4aa8ff }),
      this.trayFood,
    );
    this.tray.visible = false;
    this.view.scene.add(this.tray);
    this.seatRing = part(SH.ring, { p: [0, 0.12, 0], s: [0.9, 1, 0.9], t: 0xffc933, alpha: 0.9, add: true });
    this.exitRing = part(SH.ring, { p: [0, 0.12, 0], s: [1.1, 1, 1.1], t: 0x2fd3a0, alpha: 0.8, add: true });
    this.seatRing.visible = false;
    this.exitRing.visible = false;
    this.view.scene.add(this.seatRing, this.exitRing);

    const rng = mulberry32(5);
    for (let i = 0; i < CROWD; i++) {
      const c = new Character(randomLook(rng));
      c.root.visible = false;
      this.crowd.push(c);
      this.view.scene.add(c.root);
    }
    for (const spot of STAFF_SPOTS) {
      const look = spot.id === 'x_dean' ? professorLook(PEOPLE[spot.id].name) : personLook(spot.id);
      const c = new Character(look);
      c.root.visible = false;
      c.root.position.set(spot.x, 0, spot.z);
      this.outdoor.push({ id: spot.id, c, x: spot.x, z: spot.z });
      this.view.scene.add(c.root);
    }
    this.buildStars();
    this.buildCats();
    for (const id of RING_ZONES) {
      const z = ZONES[id];
      const ring = part(SH.ring, {
        p: [z.x, 0.14, z.z],
        s: [1.6, 1, 1.6],
        t: 0x2fd3a0,
        alpha: 0.5,
        add: true,
      });
      this.rings[id] = ring;
      this.view.scene.add(ring);
    }
    this.beacon = part(SH.cyl, { s: [0.5, 30, 0.5], t: 0xffe27a, alpha: 0.28, add: true, emi: 1 });
    this.beacon.visible = false;
    this.view.scene.add(this.beacon);

    const rainGeo = new BufferGeometry();
    rainGeo.setAttribute('position', new BufferAttribute(this.rainPos, 3).setUsage(DynamicDrawUsage));
    for (let i = 0; i < RAIN_DROPS; i++) {
      this.rainData[i * 3] = (Math.random() - 0.5) * 70;
      this.rainData[i * 3 + 1] = Math.random() * 28;
      this.rainData[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    this.rain = new LineSegments(
      rainGeo,
      new LineBasicMaterial({ color: 0x8cb2f2, transparent: true, opacity: 0.5, fog: false }),
    );
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.view.scene.add(this.rain);

    this.setPeriod(2, true);
    requestAnimationFrame((t) => this.frame(t));
  }

  /* ======================= SceneHooks (used by the rules layer) ======================= */
  setPeriod(p: number, instant = false): void {
    this.leaveRoom();
    this.tod.target = PERIOD_HOURS[p];
    if (instant) this.tod.hour = this.tod.target;
    this.placeActors(p, true);
  }

  /** Show everyone who is out on campus. `reset` (a new period) decides afresh who that is and where. */
  private placeActors(p: number, reset: boolean): void {
    if (reset) this.populateCampus(p);
    for (const n of Object.values(this.npcs)) {
      const a = this.outdoorWalkers.get(n.c);
      n.c.root.visible = !!a && !this.room;
      if (!a) continue;
      this.settle(a);
      n.greeted = false;
    }
    for (const c of this.crowd) c.root.visible = this.outdoorWalkers.has(c) && !this.room;
  }

  /** How full the campus is in period `p`. */
  private busyness(p: number): Busyness {
    if (p >= EVENING_PERIOD) return 'late';
    const s = game.s;
    return !s || St.isFreeKind(St.periodKind(s)) ? 'busy' : 'quiet';
  }

  /** A random number of students, the friends who are around, and the staff, all somewhere new. */
  private populateCampus(p: number): void {
    const walkers = this.outdoorWalkers;
    walkers.clear();
    const rng = Math.random;
    const campus: WanderArea = {
      colliders: this.campus.colliders,
      bounds: BOUNDS,
      body: 0.45,
      // nobody loiters in a doorway or where the player appears
      avoid: [...Object.values(ZONES).map((z) => ({ x: z.x, z: z.z, r: 2.6 })), { ...START, r: 3.5 }],
    };
    const places = [...GATHERING_SPOTS, ...CROWD_POINTS];
    const near = ([x, z]: [number, number], radius: number): WanderArea => ({
      ...campus,
      home: { x, z },
      radius,
    });

    for (const n of Object.values(this.npcs)) {
      if (!this.friendOutside(n.id)) continue;
      // friends stay around one part of campus for the whole period
      const place = places[Math.floor(rng() * places.length)];
      this.walk(walkers, n.c, near(place, 6), { npc: n });
    }
    const count = headCount('campus', this.busyness(p), rng);
    const students = pickStudents(rng, count);
    this.crowd.forEach((c, i) => {
      if (i >= students.length) return;
      this.cast(c, students[i]);
      // many start in the popular places, the rest anywhere at all
      const place = places[Math.floor(rng() * places.length)];
      const at = rng() < 0.6 ? randomSpot(near(place, 4), rng, this.positions(walkers)) : null;
      this.walk(walkers, c, campus, { at: at ?? undefined });
    });
    STAFF_SPOTS.forEach((spot, i) => {
      const o = this.outdoor[i];
      this.walk(walkers, o.c, near([spot.x, spot.z], spot.r), { staff: o, speed: 1.1, pause: [2, 8] });
    });
  }

  private friendOutside(id: NpcId): boolean {
    const s = game.s;
    if (!s) return false;
    return St.isFreeKind(St.periodKind(s)) && s.period < EVENING_PERIOD && St.npcPresent(s, id);
  }

  private positions(walkers: Map<Character, Walker>): { x: number; z: number }[] {
    return [...walkers.values()].map((a) => a.w);
  }

  /** Set a character walking about `area`, starting somewhere random in it. */
  private walk(walkers: Map<Character, Walker>, c: Character, area: WanderArea, o: WalkOptions = {}): void {
    const rng = Math.random;
    const at = o.at ??
      randomSpot(area, rng, this.positions(walkers), 1.1) ??
      area.home ?? { x: this.player.x, z: this.player.z };
    const a: Walker = {
      c,
      w: newWanderer(at, o.speed ?? 1.2 + rng() * 0.8, rng, o.pause),
      area,
      idle: o.idle ?? 'none',
      npc: o.npc,
      staff: o.staff,
      floorY: o.floorY,
      attend: o.attend ?? ATTEND,
      waited: 0,
      rest: o.rest,
    };
    walkers.set(c, a);
    c.setSeated(false);
    c.setActivity(a.idle);
    c.yaw = o.rest ?? rng() * Math.PI * 2;
    c.root.rotation.y = c.yaw;
    c.root.visible = true;
    this.settle(a);
  }

  /** Put a walker's model (and whatever follows it) where the walker is. */
  private settle(a: Walker): void {
    const { x, z } = a.w;
    const y = a.floorY?.(x, z) ?? 0;
    a.c.root.position.set(x, y, z);
    if (a.npc) {
      a.npc.x = x;
      a.npc.z = z;
      a.npc.y = y;
    }
    if (a.staff) {
      a.staff.x = x;
      a.staff.z = z;
    }
  }

  /** Is the current prompt about this person? */
  private isTarget(a: Walker): boolean {
    const t = this.target;
    if (t?.kind === 'npc') return t.id === a.npc?.id;
    if (t?.kind === 'prof') return a.c === this.professor;
    return t?.kind === 'person' && t.id === (a.staff?.id ?? this.who.get(a.c));
  }

  /** Move everyone who is on their feet: stroll, stop to talk to the player, and get out of each other's way. */
  private moveWalkers(walkers: Map<Character, Walker>, dt: number): void {
    const { player, time } = this;
    const active = [...walkers.values()].filter((a) => a.c.root.visible);
    // while a conversation or menu is open, whoever stopped for you stays put
    const talking = this.isBlocked();
    const speeds = active.map((a) => {
      if (!talking) {
        const near = this.mode === 'play' && Math.hypot(player.x - a.w.x, player.z - a.w.z) < a.attend;
        a.waited = near ? a.waited + dt : 0;
        a.w.held = near && (a.waited < PATIENCE || this.isTarget(a));
      }
      return stepWanderer(a.w, a.area, Math.random, dt);
    });
    separate(active);
    active.forEach((a, i) => {
      this.settle(a);
      const dx = player.x - a.w.x;
      const dz = player.z - a.w.z;
      const d = Math.hypot(dx, dz);
      const speed = speeds[i];
      if (speed > 0) a.c.faceDir(a.w.tx - a.w.x, a.w.tz - a.w.z, dt, 8);
      else if (this.mode === 'play' && d < (a.w.held ? a.attend : 4)) a.c.faceDir(dx, dz, dt, 5);
      else if (a.rest !== undefined) a.c.faceDir(Math.sin(a.rest), Math.cos(a.rest), dt, 4);
      if (a.npc && d < 6 && !a.npc.greeted && this.mode === 'play') {
        a.npc.greeted = true;
        a.c.wave(1.4);
      }
      // dancers keep dancing as they drift about
      a.c.update(dt, a.idle === 'dance' ? 0 : speed * 2.2, time + i);
    });
  }

  setWeather(w: Weather): void {
    this.weather = w;
  }
  teleportToStart(): void {
    this.leaveRoom();
    this.player.x = START.x;
    this.player.z = START.z;
    this.vel = [0, 0];
    this.input.camYaw = 0;
    this.camTarget = [this.player.x, 1.4, this.player.z];
  }

  /* ---------------- classrooms ---------------- */
  /** Walk into a classroom: the player appears at its door and the professor and classmates take their places. */
  enterRoom(spec: RoomSpec): void {
    this.leaveRoom();
    const interior = this.rooms[classKey(spec.building, spec.kind)];
    this.room = { spec, interior, seated: false, occupied: new Set(), guests: [] };
    interior.group.visible = true;
    this.player.x = interior.spawn.x;
    this.player.z = interior.spawn.z;
    this.vel = [0, 0];
    this.input.camYaw = 0;
    this.camTarget = [this.player.x, 1.2, this.player.z];
    this.playerChar.setSeated(false);
    this.playerChar.yaw = 0;

    // keep people from stopping by the door or on the player's chair
    const mine = interior.seats[interior.playerSeat];
    const avoid: Keep[] = [
      { ...interior.door, r: 2.2 },
      { ...interior.spawn, r: 2.2 },
      { x: mine.x, z: mine.z, r: 1.4 },
    ];
    const area: WanderArea = { colliders: interior.colliders, bounds: interior.bounds, body: 0.36, avoid };
    const rng = Math.random;

    // the professor paces about at the front
    this.professor.setLook(professorLook(spec.prof));
    const pp = interior.prof;
    this.walk(
      this.indoorWalkers,
      this.professor,
      { ...area, home: pp, radius: 2.2 },
      { at: pp, speed: 0.8, pause: [2, 7], rest: pp.yaw },
    );

    // A different number of students each time: some already seated, a few still on their feet.
    const free = shuffle(
      interior.seats.map((_, i) => i).filter((i) => i !== interior.playerSeat),
      rng,
    );
    const standing = headCount('latecomers', 'busy', rng);
    const students = pickStudents(rng, this.classmates.length, spec.majors);
    const most = Math.max(
      0,
      Math.min(students.length - standing, CLASSMATES - standing, Math.round(free.length * 0.9)),
    );
    const seated = randInt(rng, Math.min(most, Math.round(free.length * 0.35)), most);
    this.classmates.forEach((c, i) => {
      if (i >= Math.min(seated + standing, students.length)) {
        c.root.visible = false;
        return;
      }
      this.cast(c, students[i]);
      if (i < seated) {
        this.room!.occupied.add(free[i]);
        this.seatAt(c, interior.seats[free[i]]);
      } else this.walk(this.indoorWalkers, c, area);
    });
    this.hideOutdoorPeople();
    this.seatRing.visible = true;
    this.exitRing.visible = true;
    const seat = interior.seats[interior.playerSeat];
    this.seatRing.position.set(seat.x, 0.12, seat.z);
    this.exitRing.position.set(interior.door.x, 0.12, interior.door.z);
  }

  /** Walk into the canteen: staff behind the counter, diners and friends at the tables. */
  enterCanteen(spec: CanteenSpec): void {
    this.leaveRoom();
    const interior = this.rooms.canteen;
    const room: ActiveRoom = { spec, interior, seated: false, occupied: new Set(), guests: [] };
    this.room = room;
    interior.group.visible = true;
    this.player.x = interior.spawn.x;
    this.player.z = interior.spawn.z;
    this.vel = [0, 0];
    this.input.camYaw = 0;
    this.camTarget = [this.player.x, 1.2, this.player.z];
    this.playerChar.setSeated(false);
    this.playerChar.yaw = Math.PI; // walk in facing the counter (towards -z)
    this.playerChar.root.rotation.y = Math.PI;
    this.professor.root.visible = false;
    this.seatRing.visible = false;
    this.exitRing.visible = true;
    this.exitRing.position.set(interior.door.x, 0.12, interior.door.z);

    this.hideOutdoorPeople();
    const extras = interior.extras;
    const rng = Math.random;
    // the kitchen staff move about behind the counter, each on their own stretch
    this.staff.forEach((c, i) => {
      const p = extras?.staff[i];
      c.root.visible = !!p;
      if (!p) return;
      const reach = [1.6, 1.0, 0.8][i] ?? 1;
      this.walk(
        this.indoorWalkers,
        c,
        {
          colliders: [],
          bounds: { x0: p.x - reach, x1: p.x + reach, z0: p.z - 0.35, z1: p.z + 0.35 },
        },
        { at: p, speed: 0.9, pause: [1.5, 6], attend: 4, rest: p.yaw },
      );
      if (i > 0) this.who.set(c, i === 1 ? 'x_manager' : 'x_cook');
    });

    const avoid: Keep[] = [
      { ...interior.door, r: 2.2 },
      { ...interior.spawn, r: 2.2 },
      ...(extras
        ? [
            { ...extras.order, r: 2 },
            { ...extras.store, r: 1.6 },
            { ...extras.vending, r: 1.6 },
          ]
        : []),
    ];
    const area: WanderArea = { colliders: interior.colliders, bounds: interior.bounds, body: 0.36, avoid };

    // Friends take seats first; then a random crowd, some eating and some walking about.
    const busy: Busyness = spec.mealtime
      ? 'busy'
      : this.busyness(game.s?.period ?? 0) === 'late'
        ? 'late'
        : 'quiet';
    const free = shuffle(
      interior.seats.map((_, i) => i),
      rng,
    );
    for (const id of spec.guests) {
      const idx = free.pop();
      if (idx === undefined) break;
      const seat = interior.seats[idx];
      const n = this.npcs[id];
      room.occupied.add(idx);
      room.guests.push({ id, seat: idx });
      n.x = seat.x;
      n.z = seat.z;
      n.y = 0;
      n.greeted = true;
      this.seatAt(n.c, seat);
    }
    const walking = headCount('canteenWalkers', busy, rng);
    const diners = Math.min(this.classmates.length - walking, free.length, headCount('diners', busy, rng));
    const students = pickStudents(rng, this.classmates.length);
    this.classmates.forEach((c, i) => {
      if (i >= diners + walking) {
        c.root.visible = false;
        return;
      }
      this.cast(c, students[i]);
      if (i < diners) {
        room.occupied.add(free[i]);
        this.seatAt(c, interior.seats[free[i]]);
      } else this.walk(this.indoorWalkers, c, area);
    });
  }

  private seatAt(c: Character, seat: { x: number; z: number; yaw: number }, y = 0): void {
    c.setSeated(true);
    c.root.position.set(seat.x, y, seat.z);
    c.yaw = seat.yaw;
    c.root.rotation.y = seat.yaw;
    c.root.visible = true;
  }

  private hideOutdoorPeople(): void {
    for (const n of Object.values(this.npcs)) n.c.root.visible = false;
    for (const c of this.crowd) c.root.visible = false;
    for (const o of this.outdoor) o.c.root.visible = false;
  }

  /** Walk into a department building's corridor: the lobby, a floor with its stairs and classroom doors. */
  enterFloor(spec: FloorSpec): void {
    this.leaveRoom();
    const interior = this.rooms[floorKey(spec.building, floorVariant(spec.floor))];
    const fx = interior.floor;
    if (!fx) return;
    const room: ActiveRoom = { spec, interior, seated: false, occupied: new Set(), guests: [] };
    this.room = room;
    this.stairLock = false;
    interior.group.visible = true;
    const a = spec.arrive;
    const at =
      a === 'entrance'
        ? fx.arrive.entrance
        : a === 'up'
          ? fx.arrive.fromBelow
          : a === 'down'
            ? fx.arrive.fromAbove
            : fx.arrive.door[a.door];
    const yaw =
      a === 'entrance' ? -Math.PI / 2 : a === 'up' || a === 'down' ? Math.PI / 2 : a.door < 3 ? 0 : Math.PI;
    this.player.x = at.x;
    this.player.z = at.z;
    this.playerY = 0;
    this.vel = [0, 0];
    this.input.camYaw = 0;
    this.camTarget = [at.x, 1.2, at.z];
    this.playerChar.setSeated(false);
    this.playerChar.setActivity('none');
    this.playerChar.yaw = yaw;
    this.playerChar.root.rotation.y = yaw;
    this.playerChar.root.position.set(at.x, 0, at.z);
    this.professor.root.visible = false;
    this.seatRing.visible = false;
    this.exitRing.visible = fx.variant === 'ground';
    this.exitRing.position.set(interior.door.x, 0.12, interior.door.z);
    for (const c of this.staff) c.root.visible = false;
    this.hideOutdoorPeople();

    // friends, students and sometimes a professor stroll along the corridor
    const area: WanderArea = {
      colliders: interior.colliders,
      bounds: fx.walk,
      body: 0.4,
      avoid: [
        { ...at, r: 2.6 },
        ...(fx.variant === 'ground' ? [{ ...interior.door, r: 2.2 }] : []),
        ...fx.doors.map((d) => ({ ...d, r: 1.7 })),
        ...(fx.directory ? [{ ...fx.directory, r: 1.8 }] : []),
      ],
    };
    for (const id of spec.guests) {
      const n = this.npcs[id];
      n.greeted = true;
      this.walk(this.indoorWalkers, n.c, area, { npc: n });
      room.guests.push({ id, seat: -1 });
    }
    const pid = spec.professor ? professorId(spec.professor) : null;
    if (spec.professor && pid) {
      this.professor.setLook(professorLook(spec.professor));
      this.who.set(this.professor, pid);
      this.walk(this.indoorWalkers, this.professor, area, { speed: 1.1 });
    }
    const rng = Math.random;
    const count = headCount('corridor', this.busyness(game.s?.period ?? 0), rng);
    const students = pickStudents(rng, this.classmates.length);
    this.classmates.forEach((c, i) => {
      if (i >= count) {
        c.root.visible = false;
        return;
      }
      this.cast(c, students[i]);
      this.walk(this.indoorWalkers, c, area);
    });
  }

  /** Walk into the Club House lobby or one of the five club rooms, and fill it with people. */
  enterClub(spec: ClubSpec): void {
    this.leaveRoom();
    const interior = this.rooms[spec.kind];
    const ex = interior.club;
    if (!ex) return;
    const room: ActiveRoom = { spec, interior, seated: false, occupied: new Set(), guests: [] };
    this.room = room;
    interior.group.visible = true;
    // arrive at the entrance, or in front of the door you just came out of
    const back = spec.kind === 'clubhall' && spec.from ? ex.arrive?.[spec.from] : undefined;
    const at = back ?? interior.spawn;
    this.player.x = at.x;
    this.player.z = at.z;
    this.playerY = 0;
    this.vel = [0, 0];
    this.input.camYaw = 0;
    this.camTarget = [this.player.x, 1.2, this.player.z];
    this.playerChar.setSeated(false);
    this.playerChar.setActivity('none');
    this.playerChar.yaw = back ? 0 : Math.PI;
    this.playerChar.root.rotation.y = this.playerChar.yaw;
    this.playerChar.root.position.set(at.x, 0, at.z);
    this.professor.root.visible = false;
    this.seatRing.visible = false;
    this.exitRing.visible = true;
    this.exitRing.position.set(interior.door.x, 0.12, interior.door.z);
    for (const c of this.staff) c.root.visible = false;
    this.hideOutdoorPeople();

    const rng = Math.random;
    const floorY = ex.floorY;
    const avoid: Keep[] = [
      { ...at, r: 2.2 },
      { ...interior.door, r: 2.2 },
      ...(ex.desk ? [{ ...ex.desk, r: 1.8 }] : []),
      ...(ex.play ? [{ x: ex.play.x, z: ex.play.z, r: 1.6 }] : []),
      ...(ex.doors ?? []).map((d) => ({ ...d.at, r: 1.5 })),
    ];
    const area: WanderArea = { colliders: interior.colliders, bounds: interior.bounds, body: 0.36, avoid };
    // strollers stay on whichever level (floor or stage) they start on
    const level = (y: number): WanderArea['ok'] =>
      floorY ? (x, z) => Math.abs(floorY(x, z) - y) < 0.05 : undefined;

    if (ex.registrar) {
      const p = ex.registrar;
      this.walk(
        this.indoorWalkers,
        this.staff[0],
        { colliders: interior.colliders, bounds: interior.bounds, body: 0.36, home: p, radius: 1.3 },
        { at: p, speed: 0.8, pause: [2, 7], rest: p.yaw },
      );
    }

    /** Fill one of the room's places: people sit where there is a seat, and move about otherwise. */
    const fill = (c: Character, p: Person, npc?: NpcActor): void => {
      if (p.pose === 'sit' || p.pose === 'playSit') {
        this.seatAt(c, p, p.y ?? 0);
        c.setActivity(p.pose === 'playSit' ? 'play' : 'none');
        if (npc) {
          npc.x = p.x;
          npc.z = p.z;
          npc.y = p.y ?? 0;
        }
        return;
      }
      if (p.pose === 'stand') {
        this.walk(this.indoorWalkers, c, { ...area, ok: level(0) }, { npc, floorY });
        return;
      }
      // dancers, players and musicians move around their own part of the room
      const sport = spec.kind === 'sports';
      const patch: WanderArea = {
        ...area,
        home: p,
        radius: sport ? 4.5 : p.pose === 'dance' ? 1.8 : 0.8,
        ok: level(p.y ?? 0),
      };
      this.walk(this.indoorWalkers, c, patch, {
        npc,
        floorY,
        idle: p.pose,
        speed: sport ? 2.4 + rng() : 0.7,
        pause: sport ? [0.3, 2] : [1, 4],
        at: randomSpot(patch, rng, this.positions(this.indoorWalkers)) ?? p,
      });
    };

    // Friends first, then a random share of the club's students, then a few people just passing through.
    const free = shuffle(ex.people, rng);
    for (const id of spec.guests) {
      const p = free.pop();
      if (!p) break;
      const n = this.npcs[id];
      n.greeted = true;
      fill(n.c, p, n);
      room.guests.push({ id, seat: -1 });
    }
    const tint = ex.club ? CLUB_COLOUR[ex.club] : undefined;
    const late = this.busyness(game.s?.period ?? 0) === 'late';
    const share = (late ? 0.1 : 0.4) + rng() * 0.5;
    const places = free.slice(0, Math.min(this.classmates.length, Math.round(free.length * share)));
    const visitors = Math.min(
      this.classmates.length - places.length,
      headCount('clubVisitors', late ? 'late' : 'busy', rng),
    );
    const students = pickStudents(rng, this.classmates.length);
    // the Club Captain is always somewhere in the lobby
    const captain = spec.kind === 'clubhall';
    const total = Math.min(this.classmates.length, places.length + visitors + (captain ? 1 : 0));
    this.classmates.forEach((c, i) => {
      if (i >= total) {
        c.root.visible = false;
        return;
      }
      const id = captain && i === 0 ? 'x_captain' : students[i];
      this.cast(c, id, tint !== undefined && i % 4 !== 3 ? tint : undefined);
      const place = captain && i === 0 ? undefined : places[i - (captain ? 1 : 0)];
      if (place) fill(c, place);
      else this.walk(this.indoorWalkers, c, { ...area, ok: level(0) }, { floorY });
    });
  }

  /** Stand (or sit) at the activity spot of a club room: the player cannot wander off while playing. */
  takePlace(): void {
    const r = this.room;
    const pl = r?.interior.club?.play;
    if (!r || !pl) return;
    r.seated = true;
    this.player.x = pl.x;
    this.player.z = pl.z;
    this.playerY = pl.y ?? 0;
    this.vel = [0, 0];
    this.playerChar.setSeated(!!pl.sit);
    this.playerChar.yaw = pl.yaw;
    this.playerChar.root.rotation.y = pl.yaw;
    this.playerChar.root.position.set(pl.x, this.playerY, pl.z);
    this.seatRing.visible = false;
  }

  /** Dress a background character as a particular person: the same face every time you meet them. */
  private cast(c: Character, id: PersonId, blazer?: number): void {
    const look = personLook(id);
    if (blazer !== undefined) look.blazer = blazer;
    c.setLook(look);
    this.who.set(c, id);
  }

  /** Show (colour) or hide (null) the tray the player carries. */
  setTray(colour: number | null): void {
    this.trayOn = colour !== null;
    this.tray.visible = this.trayOn && !!this.room;
    if (colour !== null) setColor(this.trayFood, colour);
  }

  /** Sit at dining seat `index`; returns the friends close enough to share the meal. */
  sitAt(index: number): NpcId[] {
    const r = this.room;
    if (!r) return [];
    const seat = r.interior.seats[index];
    r.seated = true;
    this.player.x = seat.x;
    this.player.z = seat.z;
    this.vel = [0, 0];
    this.playerChar.setSeated(true);
    this.playerChar.yaw = seat.yaw;
    this.playerChar.root.rotation.y = seat.yaw;
    this.playerChar.root.position.set(seat.x, 0, seat.z);
    this.seatRing.visible = false;
    return r.guests
      .filter((g) => Math.hypot(r.interior.seats[g.seat].x - seat.x, r.interior.seats[g.seat].z - seat.z) < 3)
      .map((g) => g.id);
  }

  /** Public alias used by the rules layer when the player leaves by the door. */
  exitRoom(): void {
    const r = this.room;
    this.leaveRoom();
    if (r) this.placeActors(game.s?.period ?? 0, false);
  }

  /** Stand the player back outside the building the room belongs to. */
  private leaveRoom(): void {
    const r = this.room;
    if (!r) return;
    r.interior.group.visible = false;
    this.room = null;
    this.indoorWalkers.clear();
    this.professor.root.visible = false;
    this.professor.setActivity('none');
    for (const c of this.classmates) c.root.visible = false;
    for (const c of this.staff) {
      c.root.visible = false;
      c.setActivity('none');
      c.setSeated(false);
    }
    this.tray.visible = false;
    // Friends who were sitting in the canteen stand up again; `placeActors` puts them back outside.
    for (const g of r.guests) {
      const n = this.npcs[g.id];
      n.c.setSeated(false);
      n.c.setActivity('none');
      n.y = 0;
      n.c.root.visible = false;
    }
    for (const c of this.classmates) {
      c.setActivity('none');
      c.setSeated(false);
    }
    this.playerY = 0;
    this.playerChar.setActivity('none');
    this.seatRing.visible = false;
    this.exitRing.visible = false;
    this.playerChar.setSeated(false);
    const z = ZONES[r.spec.building];
    this.player.x = z.x;
    this.player.z = z.z;
    this.vel = [0, 0];
    this.input.camYaw = 0;
    this.camTarget = [this.player.x, 1.4, this.player.z];
    this.playerChar.root.position.set(this.player.x, 0, this.player.z);
  }

  /** Move the player onto their chair and sit down facing the board. */
  sitDown(): void {
    const r = this.room;
    if (!r) return;
    const seat = r.interior.seats[r.interior.playerSeat];
    r.seated = true;
    this.player.x = seat.x;
    this.player.z = seat.z;
    this.vel = [0, 0];
    this.playerChar.setSeated(true);
    this.playerChar.yaw = seat.yaw;
    this.playerChar.root.rotation.y = seat.yaw;
    this.seatRing.visible = false;
    this.seatLatecomers(r);
  }

  /** Once the lecture starts, students still on their feet take the nearest free chairs. */
  private seatLatecomers(r: ActiveRoom): void {
    const seats = r.interior.seats;
    for (const c of this.classmates) {
      const a = this.indoorWalkers.get(c);
      if (!a) continue;
      let best = -1;
      let bestD = Infinity;
      seats.forEach((s, i) => {
        if (i === r.interior.playerSeat || r.occupied.has(i)) return;
        const d = Math.hypot(s.x - a.w.x, s.z - a.w.z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best < 0) continue;
      r.occupied.add(best);
      this.indoorWalkers.delete(c);
      this.seatAt(c, seats[best]);
    }
  }

  refreshCollectibles(): void {
    const s = game.s;
    this.stars.forEach((n, i) => {
      n.root.visible = !s || !s.stars.includes(i);
    });
    this.beacon.visible = !!s && s.revealedStar >= 0;
    if (s && this.beacon.visible)
      this.beacon.position.set(STARS[s.revealedStar][0], 15, STARS[s.revealedStar][1]);
  }
  getPlayerPos(): { x: number; z: number } {
    return { x: this.player.x, z: this.player.z };
  }
  setPlayerLook(look: Look): void {
    this.playerChar.setLook(look);
  }

  /** The player-controlled character plus each friend, for debugging and tests. */
  npcActor(id: NpcId): NpcActor {
    return this.npcs[id];
  }

  /* ======================= construction helpers ======================= */
  private buildStars(): void {
    STARS.forEach(([x, z], i) => {
      const root = new Group();
      root.position.set(x, 0, z);
      const core = part(SH.fsph, { p: [0, 1.4, 0], s: [0.5, 0.5, 0.5], t: 0xffc933, emi: 0.9 });
      const core2 = part(SH.fsph, { p: [0, 1.4, 0], s: [0.8, 0.22, 0.8], t: 0xffe27a, emi: 0.9 });
      const glow = part(SH.disc, { p: [0, 0.1, 0], s: [1.1, 1, 1.1], t: 0xffd34a, alpha: 0.4, add: true });
      root.add(core, core2, glow);
      this.view.scene.add(root);
      this.stars.push({ root, core, core2, glow, phase: i * 0.9 });
    });
  }

  private buildCats(): void {
    CATS.forEach(([x, z], i) => {
      const root = new Group();
      root.position.set(x, 0, z);
      root.rotation.order = 'YXZ';
      const color = CAT_COLORS[i];
      const body = part(SH.box, { p: [0, 0.32, 0], s: [0.36, 0.34, 0.7], t: color });
      const head = part(SH.sph, { p: [0, 0.52, 0.42], s: [0.2, 0.18, 0.18], t: color });
      const tail = part(SH.box, { p: [0, 0.5, -0.45], s: [0.07, 0.07, 0.4], t: color, r: [0.7, 0, 0] });
      root.add(body, head, tail);
      for (const sx of [-1, 1]) {
        root.add(part(SH.cone, { p: [sx * 0.11, 0.7, 0.4], s: [0.06, 0.12, 0.06], t: color }));
        root.add(part(SH.sph, { p: [sx * 0.07, 0.55, 0.57], s: [0.03, 0.035, 0.02], t: 0x111111 }));
      }
      this.view.scene.add(root);
      this.cats.push({ root, body, tail, i, x, z });
    });
  }

  /* ======================= frame loop ======================= */
  private frame(now: number): void {
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.time += dt;
    try {
      this.update(dt);
      const L = lightAt(this.tod.hour, this.weather);
      this.campus.update(dt, this.time, L);
      this.updateRain(dt);
      this.animate(dt);
      // Indoors: bright, steady classroom lighting whatever the weather or time of day.
      this.view.applyLight(
        this.room ? lightAt(INDOOR_HOUR, 'sunny') : L,
        this.mode === 'title' ? { x: 0, z: 6 } : this.player,
      );
      this.view.render(this.cam);
      this.updateLabels();
      this.minimapTimer += dt;
      if (this.minimapTimer > 0.08) {
        this.minimapTimer = 0;
        this.drawMinimap();
      }
    } catch (e) {
      console.error(e);
    }
  }

  private update(dt: number): void {
    const { input, player, cam } = this;
    this.tod.hour += (this.tod.target - this.tod.hour) * Math.min(1, dt * 0.9);
    const s = game.s;

    if (this.mode === 'title') {
      const a = this.time * 0.08;
      cam.target = [0, 3, 6];
      cam.eye = [Math.sin(a) * 52, 22 + Math.sin(this.time * 0.2) * 3, 6 + Math.cos(a) * 52];
      this.playerChar.root.visible = false;
      return;
    }
    if (this.mode === 'creator') {
      const pc = this.playerChar;
      pc.root.visible = true;
      player.x = START.x;
      player.z = START.z;
      pc.root.position.set(player.x, 0, player.z);
      pc.yaw = 0.4 + Math.sin(this.time * 0.6) * 0.5;
      pc.root.rotation.y = pc.yaw;
      pc.update(dt, 0, this.time);
      cam.target = [player.x - 1.2, 1.5, player.z];
      cam.eye = [player.x - 1.2, 2.4, player.z + 6.2];
      return;
    }

    this.playerChar.root.visible = true;
    const blocked = this.isBlocked();
    if (this.room) {
      this.updateRoom(dt, blocked);
      return;
    }
    const { keys, joy } = input;
    let ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x;
    let iy = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) + joy.y;
    if (blocked) {
      ix = 0;
      iy = 0;
    } else {
      if (keys.q) input.camYaw += dt * 1.8;
      if (keys.z) input.camYaw -= dt * 1.8;
    }
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
    const run = keys.shift ? 1.55 : 1;
    const joyMag = Math.hypot(joy.x, joy.y);
    const speed = 6.4 * run * (joyMag > 0 ? Math.min(1, Math.hypot(ix, iy) * 1.1) : 1);
    const yaw = input.camYaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const tvx = (rx * ix + fx * iy) * speed;
    const tvz = (rz * ix + fz * iy) * speed;
    this.vel[0] += (tvx - this.vel[0]) * Math.min(1, dt * 12);
    this.vel[1] += (tvz - this.vel[1]) * Math.min(1, dt * 12);
    player.x += this.vel[0] * dt;
    player.z += this.vel[1] * dt;
    resolveCollisions(this.campus.colliders, player, 0.48);
    const spd = Math.hypot(this.vel[0], this.vel[1]);
    if (spd > 0.4) this.playerChar.faceDir(this.vel[0], this.vel[1], dt);
    this.playerChar.root.position.set(player.x, 0, player.z);
    this.playerChar.update(dt, spd, this.time);

    // follow camera
    const ct = this.camTarget;
    ct[0] += (player.x - ct[0]) * Math.min(1, dt * 9);
    ct[2] += (player.z - ct[2]) * Math.min(1, dt * 9);
    ct[1] = 1.5;
    const cp = Math.cos(input.camPitch);
    cam.target = [ct[0], ct[1], ct[2]];
    cam.eye = [
      ct[0] + Math.sin(yaw) * cp * input.camDist,
      Math.max(0.8, ct[1] + Math.sin(input.camPitch) * input.camDist),
      ct[2] + Math.cos(yaw) * cp * input.camDist,
    ];
    if (!s) return;

    this.updateTarget(blocked);
    if (!blocked && this.mode === 'play') {
      STARS.forEach(([x, z], i) => {
        if (!s.stars.includes(i) && Math.hypot(player.x - x, player.z - z) < 1.5) {
          collectStar(i).catch(console.error);
        }
      });
    }
  }

  /** Player movement, camera and prompts while inside a classroom. */
  private updateRoom(dt: number, blocked: boolean): void {
    const room = this.room;
    if (!room) return;
    const { input, player, cam } = this;
    const { keys, joy } = input;
    const { interior } = room;
    let yaw = input.camYaw;
    if (room.seated || blocked || this.stairLock) {
      this.vel[0] *= 0.6;
      this.vel[1] *= 0.6;
    } else {
      if (keys.q) input.camYaw += dt * 1.8;
      if (keys.z) input.camYaw -= dt * 1.8;
      yaw = input.camYaw;
      let ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x;
      let iy = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) + joy.y;
      const len = Math.hypot(ix, iy);
      if (len > 1) {
        ix /= len;
        iy /= len;
      }
      const speed = 4.6 * (keys.shift ? 1.4 : 1);
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);
      this.vel[0] += ((rx * ix + fx * iy) * speed - this.vel[0]) * Math.min(1, dt * 12);
      this.vel[1] += ((rz * ix + fz * iy) * speed - this.vel[1]) * Math.min(1, dt * 12);
      player.x += this.vel[0] * dt;
      player.z += this.vel[1] * dt;
      resolveCollisions(interior.colliders, player, 0.42, interior.bounds);
    }
    const spd = Math.hypot(this.vel[0], this.vel[1]);
    // Stages and platforms raise the floor under the player.
    if (!room.seated) {
      const fy = (interior.club?.floorY ?? interior.floor?.floorY)?.(player.x, player.z) ?? 0;
      this.playerY += (fy - this.playerY) * Math.min(1, dt * 14);
    }
    if (!room.seated && spd > 0.4) this.playerChar.faceDir(this.vel[0], this.vel[1], dt);
    this.playerChar.root.position.set(player.x, this.playerY, player.z);

    // Walking to the end of a flight of stairs takes you to the next floor.
    if (isFloor(room) && !this.stairLock && !blocked) {
      const fx = interior.floor!;
      const fy = fx.floorY(player.x, player.z);
      const dir = fx.up && fy > 3.85 ? 1 : fx.down && fy < -3.85 ? -1 : 0;
      if (dir) {
        this.stairLock = true;
        changeFloor(dir as 1 | -1)
          .catch(console.error)
          .finally(() => {
            if (this.room === room) this.stairLock = false;
          });
      }
    }
    this.playerChar.update(dt, room.seated ? 0 : spd, this.time);

    const ct = this.camTarget;
    ct[0] += (player.x - ct[0]) * Math.min(1, dt * 9);
    ct[2] += (player.z - ct[2]) * Math.min(1, dt * 9);
    ct[1] = 1.2 + this.playerY;
    const cp = Math.cos(ROOM_PITCH);
    cam.target = [ct[0], ct[1], ct[2]];
    // Keep the eye inside the room (it is above the wall tops, so the view is never blocked).
    const b = interior.bounds;
    cam.eye = [
      Math.max(b.x0, Math.min(b.x1, ct[0] + Math.sin(yaw) * cp * ROOM_DIST)),
      ct[1] + Math.sin(ROOM_PITCH) * ROOM_DIST,
      Math.max(b.z0, Math.min(b.z1, ct[2] + Math.cos(yaw) * cp * ROOM_DIST)),
    ];

    // The meal tray rides in front of the player, or sits on the table once they are seated.
    if (isCanteen(room) && this.trayOn) {
      // Carried at the side, so the camera behind the player can still see it; on the table once seated.
      const yawT = this.playerChar.yaw;
      const reach = room.seated ? 0.95 : 0.7;
      const side = room.seated ? 0 : 0.42;
      this.tray.position.set(
        player.x + Math.sin(yawT) * reach + Math.cos(yawT) * side,
        room.seated ? 0.8 : 1.0,
        player.z + Math.cos(yawT) * reach - Math.sin(yawT) * side,
      );
      this.tray.rotation.y = yawT;
      this.tray.scale.setScalar(room.seated ? 1 : 1.2);
      this.tray.visible = true;
    }

    // What can the player use here?
    let best: Target | null = null;
    let bestRatio = Infinity;
    const consider = (t: Target, x: number, z: number, r: number) => {
      const d = Math.hypot(player.x - x, player.z - z);
      if (d < r && d / r < bestRatio) {
        bestRatio = d / r;
        best = t;
      }
    };
    if (isFloor(room)) {
      const fx = interior.floor!;
      const spec = room.spec as FloorSpec;
      if (!room.seated) {
        const inter = floorInteractions(spec.building, spec.floor);
        if (fx.variant === 'ground')
          consider({ kind: 'exit', info: inter.exit }, interior.door.x, interior.door.z, 1.9);
        fx.doors.forEach((d, i) => consider({ kind: 'door', info: inter.doors[i] }, d.x, d.z, 1.9));
        if (fx.directory)
          consider({ kind: 'desk', info: inter.directory }, fx.directory.x, fx.directory.z, 2.2);
        for (const g of room.guests) {
          const n = this.npcs[g.id];
          consider({ kind: 'npc', id: g.id }, n.x, n.z, 2.2);
        }
      }
    } else if (isClub(room)) {
      const cx = interior.club!;
      if (!room.seated) {
        if (room.spec.kind === 'clubhall') {
          const inter = clubhouseInteractions();
          consider({ kind: 'exit', info: inter.exit }, interior.door.x, interior.door.z, 1.9);
          for (const dr of cx.doors ?? [])
            consider({ kind: 'door', info: inter.doors[dr.club] }, dr.at.x, dr.at.z, 2.1);
          if (cx.desk) consider({ kind: 'desk', info: inter.desk }, cx.desk.x, cx.desk.z, 2.3);
        } else if (cx.club) {
          const inter = clubRoomInteractions(cx.club);
          consider({ kind: 'exit', info: inter.exit }, interior.door.x, interior.door.z, 1.9);
          if (cx.play) consider({ kind: 'play', info: inter.play }, cx.play.x, cx.play.z, 2.2);
        }
        for (const g of room.guests) {
          const n = this.npcs[g.id];
          consider({ kind: 'npc', id: g.id }, n.x, n.z, 2.2);
        }
      }
    } else if (isCanteen(room)) {
      const ex = interior.extras;
      if (!room.seated && ex) {
        const inter = canteenInteractions();
        consider({ kind: 'exit', info: inter.exit }, interior.door.x, interior.door.z, 1.9);
        consider({ kind: 'order', info: inter.order }, ex.order.x, ex.order.z, 2.6);
        consider({ kind: 'store', info: inter.store }, ex.store.x, ex.store.z, 2.3);
        consider({ kind: 'vending', info: inter.vending }, ex.vending.x, ex.vending.z, 2.2);
        // the nearest empty dining seat
        let seatIdx = -1;
        let seatD = 1.7;
        interior.seats.forEach((st, i) => {
          if (room.occupied.has(i)) return;
          const d = Math.hypot(player.x - st.x, player.z - st.z);
          if (d < seatD) {
            seatD = d;
            seatIdx = i;
          }
        });
        if (seatIdx >= 0) {
          const st = interior.seats[seatIdx];
          const info = canteenSeat(seatIdx);
          consider({ kind: 'seat', info }, st.x, st.z, 1.7);
          this.seatRing.visible = info.enabled;
          this.seatRing.position.set(st.x, 0.5, st.z);
        } else this.seatRing.visible = false;
        for (const g of room.guests) {
          const n = this.npcs[g.id];
          consider({ kind: 'npc', id: g.id }, n.x, n.z, 2.2);
        }
      }
    } else {
      const inter = roomInteractions();
      if (!room.seated) {
        const seat = interior.seats[interior.playerSeat];
        consider({ kind: 'seat', info: inter.seat }, seat.x, seat.z, 2.2);
        consider({ kind: 'exit', info: inter.exit }, interior.door.x, interior.door.z, 1.9);
        const at = this.professor.root.position;
        consider({ kind: 'prof', info: inter.prof }, at.x, at.z, 2.6);
      }
    }
    if (!room.seated) {
      const reach = isFloor(room) ? 1.8 : isCanteen(room) || isClub(room) ? 1.5 : 1.1;
      const talkable = isFloor(room) ? [...this.classmates, this.professor] : this.classmates;
      for (const c of talkable) {
        const id = this.who.get(c);
        if (id && c.root.visible)
          consider({ kind: 'person', id }, c.root.position.x, c.root.position.z, reach);
      }
      const ex = interior.extras;
      if (isCanteen(room) && ex) {
        // you speak to the kitchen staff across the counter, wherever along it they are
        consider({ kind: 'person', id: 'x_manager' }, this.staff[1].root.position.x, ex.order.z, 1.8);
        consider({ kind: 'person', id: 'x_cook' }, this.staff[2].root.position.x, ex.order.z, 1.8);
      }
    }
    this.target = blocked ? null : best;
    const t = this.target as Target | null;
    if (!t) hud.setPrompt(null);
    else if (t.kind === 'npc') this.npcPrompt(t.id);
    else if (t.kind === 'person') this.personPrompt(t.id);
    else if (t.kind !== 'cat' && t.kind !== 'building')
      hud.setPrompt({ text: t.info.label, enabled: t.info.enabled, why: t.info.enabled ? '' : t.info.why });
  }

  private personPrompt(id: PersonId): void {
    const p = PEOPLE[id];
    hud.setPrompt({ text: `Talk to ${p.name} (${p.title})`, enabled: true });
  }

  /** The "Talk to …" prompt for a friend, with how they relate to the player's year. */
  private npcPrompt(id: NpcId): void {
    const N = NPCS[id];
    const s = game.s;
    const rel = s ? St.relationTo(s, id) : 'peer';
    const tag = rel === 'senior' ? '🎓 Above You' : rel === 'junior' ? '🌱 Below You' : '🤝 Your Year';
    const who = `${DEPARTMENTS[N.major].short} ${YEAR_NAMES[N.year - 1]}`;
    hud.setPrompt({ text: `Talk to ${N.name} (${who}, ${tag})`, enabled: true });
  }

  /** Pick the nearest interactable (relative to its radius) and show its prompt. */
  private updateTarget(blocked: boolean): void {
    const { player } = this;
    const interactions = buildingInteractions();
    let best: Target | null = null;
    let bestRatio = Infinity;
    const consider = (t: Target, x: number, z: number, r: number) => {
      const d = Math.hypot(player.x - x, player.z - z);
      if (d < r && d / r < bestRatio) {
        bestRatio = d / r;
        best = t;
      }
    };
    for (const id of Object.keys(interactions) as ZoneId[]) {
      const z = ZONES[id];
      consider({ kind: 'building', id, info: interactions[id] }, z.x, z.z, id === 'hum' ? 3.6 : 2.9);
    }
    for (const n of Object.values(this.npcs))
      if (n.c.root.visible) consider({ kind: 'npc', id: n.id }, n.x, n.z, 2.4);
    for (const c of this.crowd) {
      const id = this.who.get(c);
      if (id && c.root.visible) consider({ kind: 'person', id }, c.root.position.x, c.root.position.z, 2.0);
    }
    for (const o of this.outdoor) if (o.c.root.visible) consider({ kind: 'person', id: o.id }, o.x, o.z, 2.2);
    for (const c of this.cats) consider({ kind: 'cat', i: c.i }, c.x, c.z, 2.2);
    this.target = blocked ? null : best;
    const t = this.target as Target | null;
    if (!t || blocked) {
      hud.setPrompt(null);
    } else if (t.kind === 'building') {
      hud.setPrompt({ text: t.info.label, enabled: t.info.enabled, why: t.info.enabled ? '' : t.info.why });
    } else if (t.kind === 'npc') {
      this.npcPrompt(t.id);
    } else if (t.kind === 'person') {
      this.personPrompt(t.id);
    } else if (t.kind === 'cat') {
      hud.setPrompt({ text: 'Pet the Cat', enabled: true });
    }
  }

  private animate(dt: number): void {
    const s = game.s;
    const { time, player } = this;
    for (const n of this.stars) {
      n.core.rotation.y = time * 2 + n.phase;
      n.core.position.y = 1.4 + Math.sin(time * 2 + n.phase) * 0.15;
      n.core2.rotation.y = -time * 1.5;
      n.core2.position.y = n.core.position.y;
      (n.glow.material as MeshLambertMaterial).opacity = 0.3 + Math.sin(time * 3 + n.phase) * 0.12;
    }
    if (this.beacon.visible)
      (this.beacon.material as MeshLambertMaterial).opacity = 0.2 + Math.sin(time * 4) * 0.08;

    for (const c of this.cats) {
      c.tail.rotation.y = Math.sin(time * 2 + c.i) * 0.5;
      c.body.scale.y = 0.34 + Math.sin(time * 2.2 + c.i) * 0.012;
      if (Math.hypot(player.x - c.x, player.z - c.z) < 7) {
        const a = Math.atan2(player.x - c.x, player.z - c.z);
        let df = a - c.root.rotation.y;
        while (df > Math.PI) df -= Math.PI * 2;
        while (df < -Math.PI) df += Math.PI * 2;
        c.root.rotation.y += df * Math.min(1, dt * 3);
      }
    }

    for (const o of this.outdoor)
      o.c.root.visible = this.mode === 'play' && !this.room && !!s && s.period < EVENING_PERIOD;

    const walkers = this.room ? this.indoorWalkers : this.outdoorWalkers;
    this.moveWalkers(walkers, dt);

    // friends who are sitting down still turn to look and wave
    for (const n of Object.values(this.npcs)) {
      if (!n.c.root.visible || walkers.has(n.c)) continue;
      n.c.root.position.set(n.x, n.y, n.z);
      const dx = player.x - n.x;
      const dz = player.z - n.z;
      const d = Math.hypot(dx, dz);
      if (d < 6 && !n.greeted && this.mode === 'play') {
        n.greeted = true;
        n.c.wave(1.4);
      }
      n.c.update(dt, 0, time + n.x);
    }

    if (this.room) {
      for (const c of this.classmates)
        if (c.root.visible && !walkers.has(c)) c.update(dt, 0, time + c.root.position.x);
      const pulse = 1 + Math.sin(time * 4) * 0.12;
      this.seatRing.scale.set(0.9 * pulse, 1, 0.9 * pulse);
      this.exitRing.scale.set(1.1 * pulse, 1, 1.1 * pulse);
    }

    // door rings: gold = objective, green = usable, grey = closed
    if (s && this.mode === 'play' && !this.room) {
      const interactions = buildingInteractions();
      const goal = objectiveTarget(s);
      for (const id of RING_ZONES) {
        const ring = this.rings[id];
        const on = interactions[id]?.enabled;
        const isGoal = goal === id;
        const pulse = 1 + Math.sin(time * 3 + id.length) * 0.08;
        ring.visible = true;
        ring.scale.set(1.6 * pulse, 1, 1.6 * pulse);
        const mat = ring.material as MeshLambertMaterial;
        setColor(ring, isGoal ? 0xffc933 : on ? 0x2fd3a0 : 0x888888);
        mat.opacity = isGoal ? 0.95 : on ? 0.7 : 0.25;
      }
    } else for (const id of RING_ZONES) this.rings[id].visible = false;
  }

  private updateRain(dt: number): void {
    const want = this.weather === 'rain' && !this.room ? 1 : 0;
    this.rainAmount += (want - this.rainAmount) * Math.min(1, dt * 1.5);
    this.rain.visible = this.rainAmount > 0.05;
    if (!this.rain.visible) return;
    const d = this.rainData;
    const b = this.rainPos;
    const [cx, , cz] = this.cam.eye;
    const count = Math.floor(RAIN_DROPS * this.rainAmount);
    let o = 0;
    for (let i = 0; i < count; i++) {
      d[i * 3 + 1] -= dt * 30;
      if (d[i * 3 + 1] < 0) {
        d[i * 3 + 1] = 26 + Math.random() * 4;
        d[i * 3] = (Math.random() - 0.5) * 70;
        d[i * 3 + 2] = (Math.random() - 0.5) * 70;
      }
      const x = cx + d[i * 3];
      const y = d[i * 3 + 1];
      const z = cz + d[i * 3 + 2];
      b[o++] = x;
      b[o++] = y;
      b[o++] = z;
      b[o++] = x + 0.18;
      b[o++] = y - 1.1;
      b[o++] = z;
    }
    const geo = this.rain.geometry;
    geo.setDrawRange(0, count * 2);
    geo.getAttribute('position').needsUpdate = true;
  }

  /* ======================= labels & minimap ======================= */
  private label(id: string, cls = ''): HTMLElement {
    let e = this.labels.get(id);
    if (!e) {
      e = el('div', 'wlabel ' + cls);
      $('#labels').appendChild(e);
      this.labels.set(id, e);
    }
    return e;
  }

  private updateRoomLabels(): void {
    const room = this.room;
    const show = this.mode === 'play' && !!room;
    const defs: { id: string; text: string; x: number; y: number; z: number; cls: string }[] = [];
    if (room && isCanteen(room) && room.interior.extras) {
      const { interior } = room;
      const ex = interior.extras!;
      defs.push(
        { id: 'room_exit', text: '🚪 Exit', x: interior.door.x, y: 3.1, z: interior.door.z + 0.4, cls: '' },
        {
          id: 'room_prof',
          text: '🍛 Hot-food counter',
          x: ex.order.x,
          y: 2.5,
          z: ex.staff[0].z,
          cls: 'quest',
        },
        { id: 'room_store', text: '🛒 Campus store', x: ex.store.x + 1.4, y: 2.4, z: ex.store.z, cls: '' },
        {
          id: 'room_vend',
          text: '🥤 Vending machines',
          x: ex.vending.x - 1.2,
          y: 2.3,
          z: ex.vending.z,
          cls: '',
        },
      );
    } else if (room && isFloor(room)) {
      const { interior } = room;
      const fx = interior.floor!;
      const spec = room.spec as FloorSpec;
      const D = DEPARTMENTS[spec.building];
      const now = game.s ? classroomSpec(game.s) : null;
      const major = game.s?.major ?? 'cse';
      const sem = game.s ? St.term(game.s) : 0;
      fx.doors.forEach((d, i) => {
        const c = courseInRoom(spec.building, spec.floor, i, major, sem);
        const exam =
          spec.building === EXAM_HALL.building && spec.floor === EXAM_HALL.floor && i === EXAM_HALL.slot;
        const mine = !!now && now.building === spec.building && now.floor === spec.floor && now.slot === i;
        defs.push({
          id: 'room_fd_' + i,
          text: c
            ? `${c.room} ${c.majors.includes(major) ? SUBJECTS[c.area].icon : '▫️'} ${c.name}`
            : exam
              ? `${EXAM_HALL.room} 🏛️ ${EXAM_HALL.name}`
              : i === SLOTS_PER_FLOOR - 1
                ? '🔒 Staff room'
                : `${roomCode(spec.building, spec.floor, i)} · free`,
          x: d.x,
          y: 3.9,
          z: d.z + (i < 3 ? -1.9 : 1.9),
          cls: mine ? 'quest' : '',
        });
      });
      defs.push({
        id: 'room_floor',
        text: `${D.icon} ${D.hall} · ${floorWord(spec.floor)}`,
        x: fx.stairSign.x,
        y: 3.7,
        z: fx.stairSign.z,
        cls: 'npc',
      });
      if (fx.up)
        defs.push({
          id: 'room_up',
          text: '⬆️ Stairs up',
          x: fx.stairSign.x + 3.4,
          y: 3.0,
          z: fx.stairSign.z + 2.6,
          cls: '',
        });
      if (fx.down)
        defs.push({
          id: 'room_down',
          text: '⬇️ Stairs down',
          x: fx.stairSign.x + 3.4,
          y: 3.0,
          z: fx.stairSign.z - 2.6,
          cls: '',
        });
      if (fx.variant === 'ground')
        defs.push({
          id: 'room_exit',
          text: '🚪 Exit',
          x: interior.door.x,
          y: 3.2,
          z: interior.door.z,
          cls: '',
        });
      if (fx.directory)
        defs.push({
          id: 'room_desk',
          text: '📋 Directory',
          x: fx.directory.x + 0.8,
          y: 2.8,
          z: fx.directory.z,
          cls: 'npc',
        });
    } else if (room && isClub(room)) {
      const { interior } = room;
      const cx = interior.club!;
      defs.push({
        id: 'room_exit',
        text: room.spec.kind === 'clubhall' ? '🚪 Exit to campus' : '🚪 Back to the lobby',
        x: interior.door.x,
        y: 3.1,
        z: interior.door.z + 0.4,
        cls: '',
      });
      if (room.spec.kind === 'clubhall') {
        for (const dr of cx.doors ?? []) {
          const C = CLUBS[dr.club];
          defs.push({
            id: 'room_door_' + dr.club,
            text: `${C.icon} ${C.name.replace(' Club', '')}`,
            x: dr.at.x,
            y: 3.7,
            z: dr.at.z - 1.7,
            cls: isMemberOf(dr.club) ? 'quest' : '',
          });
        }
        if (cx.desk)
          defs.push({
            id: 'room_desk',
            text: '📋 Club Registrar',
            x: cx.desk.x,
            y: 2.6,
            z: cx.desk.z - 2.4,
            cls: 'npc',
          });
      } else if (cx.play && !room.seated) {
        defs.push({
          id: 'room_play',
          text: `${CLUBS[cx.club!].icon} ${CLUBS[cx.club!].game}`,
          x: cx.play.x,
          y: (cx.play.y ?? 0) + 2.4,
          z: cx.play.z,
          cls: 'quest',
        });
      }
    } else if (room) {
      const { interior } = room;
      const spec = room.spec as RoomSpec;
      const seat = interior.seats[interior.playerSeat];
      defs.push(
        {
          id: 'room_prof',
          text: `🎓 ${spec.prof}`,
          x: this.professor.root.position.x,
          y: 2.5,
          z: this.professor.root.position.z,
          cls: 'npc',
        },
        { id: 'room_exit', text: '🚪 Exit', x: interior.door.x, y: 3.1, z: interior.door.z + 0.4, cls: '' },
      );
      if (!room.seated)
        defs.push({ id: 'room_seat', text: '💺 Your seat', x: seat.x, y: 1.9, z: seat.z, cls: 'quest' });
      defs.push({
        id: 'room_name',
        text: `${spec.room} · ${spec.sub.replace(/ · [A-Z]+ \d+$/, '')}`,
        x: interior.centre.x,
        y: 3.4,
        z: interior.centre.z - interior.size.d / 2 + 0.6,
        cls: 'quest',
      });
    }
    for (const id of ROOM_LABEL_IDS) {
      const e = this.label(id, id === 'room_prof' ? 'npc' : '');
      const d = defs.find((x) => x.id === id);
      const p = show && d ? this.view.project(d.x, d.y, d.z) : null;
      if (!p || !d) {
        e.style.display = 'none';
        continue;
      }
      e.style.display = '';
      e.className = 'wlabel ' + d.cls;
      e.textContent = d.text;
      e.style.left = p[0] + 'px';
      e.style.top = p[1] + 'px';
    }
  }

  private updateLabels(): void {
    const s = game.s;
    this.updateRoomLabels();
    const show = this.mode === 'play' && !this.room;
    const goal = s ? objectiveTarget(s) : null;
    const interactions = s ? buildingInteractions() : null;
    for (const d of LABEL_DEFS) {
      const e = this.label(d.id);
      const p =
        show && Math.hypot(d.x - this.player.x, d.z - this.player.z) < 62
          ? this.view.project(d.x, d.y, d.z)
          : null;
      if (!p) {
        e.style.display = 'none';
        continue;
      }
      e.style.display = '';
      const isGoal = goal === d.id;
      e.className = 'wlabel' + (isGoal ? ' quest' : '');
      e.textContent = (isGoal ? '▼ ' : '') + d.text;
      e.style.left = p[0] + 'px';
      e.style.top = p[1] + 'px';
      if (interactions && !interactions[d.id].enabled) e.classList.add('closed');
    }
    for (const o of this.outdoor) {
      const e = this.label('staff_' + o.id, 'npc');
      const near = o.c.root.visible && Math.hypot(o.x - this.player.x, o.z - this.player.z) < 20;
      const p = near ? this.view.project(o.x, 2.55, o.z) : null;
      if (!p) {
        e.style.display = 'none';
        continue;
      }
      e.style.display = '';
      e.textContent = `${PEOPLE[o.id].emoji} ${PEOPLE[o.id].name}`;
      e.style.left = p[0] + 'px';
      e.style.top = p[1] + 'px';
    }
    // Friends keep their name tags inside the canteen, where they sit at the tables.
    const showNpc =
      this.mode === 'play' && (!this.room || isCanteen(this.room) || isClub(this.room) || isFloor(this.room));
    for (const n of Object.values(this.npcs)) {
      const e = this.label('npc_' + n.id, 'npc');
      const N = NPCS[n.id];
      if (!showNpc || !n.c.root.visible || !s) {
        e.style.display = 'none';
        continue;
      }
      const p =
        Math.hypot(n.x - this.player.x, n.z - this.player.z) > 30
          ? null
          : this.view.project(n.x, n.y + (n.c.seated ? 2.1 : 2.55), n.z);
      if (!p) {
        e.style.display = 'none';
        continue;
      }
      const f = s.friends[n.id];
      const beat = N.beats[f.story];
      const ready = beat && relationPoints(f.rel) >= beat.at;
      e.style.display = '';
      e.style.setProperty('--c', N.color);
      e.textContent = `${ready ? '❗' : f.talked === s.day ? '' : '💬'} ${N.emoji} ${N.name} · ${YEAR_NAMES[N.year - 1]}`;
      e.style.left = p[0] + 'px';
      e.style.top = p[1] + 'px';
    }
  }

  private drawMinimap(): void {
    const c = $maybe<HTMLCanvasElement>('#minimap');
    if (!c) return;
    c.style.visibility = this.room ? 'hidden' : '';
    if (this.mode !== 'play' || this.room) return;
    const g = c.getContext('2d');
    if (!g) return;
    const W = c.width;
    const H = c.height;
    const mx = (x: number) => ((x + 52) / 104) * W;
    const mz = (z: number) => ((z + 48) / 100) * H;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#6fae5a';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#d9d2c3';
    const rect = (x0: number, x1: number, z0: number, z1: number) =>
      g.fillRect(mx(x0), mz(z0), mx(x1) - mx(x0), mz(z1) - mz(z0));
    rect(-4.5, 4.5, -24, 49);
    rect(-25, 25, -9.8, -6.2);
    rect(-25, -4.5, 12.2, 15.8);
    rect(4.5, 24, 24.2, 27.8);
    g.beginPath();
    g.arc(mx(0), mz(6), (14 / 104) * W, 0, 7);
    g.fill();
    g.fillStyle = '#5a9a4e';
    g.fillRect(mx(-44), mz(29), mx(-16) - mx(-44), mz(47) - mz(29));
    const s = game.s;
    const goal = s ? objectiveTarget(s) : null;
    for (const b of BUILDINGS) {
      g.fillStyle = cssHex(b.accent);
      g.fillRect(mx(b.cx - b.w / 2), mz(b.cz - b.d / 2), (b.w / 104) * W, (b.d / 100) * H);
      g.fillStyle = '#fff';
      g.font = '900 20px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(b.icon, mx(b.cx), mz(b.cz));
    }
    const z = goal ? ZONES[goal] : null;
    if (z) {
      g.strokeStyle = '#ffc933';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(mx(z.x), mz(z.z), 12 + Math.sin(this.time * 5) * 3, 0, 7);
      g.stroke();
    }
    if (s) {
      for (const n of Object.values(this.npcs)) {
        if (!n.c.root.visible) continue;
        g.fillStyle = NPCS[n.id].color;
        g.beginPath();
        g.arc(mx(n.x), mz(n.z), 6, 0, 7);
        g.fill();
        g.strokeStyle = '#fff';
        g.lineWidth = 2;
        g.stroke();
      }
      if (s.revealedStar >= 0) {
        const [x, zz] = STARS[s.revealedStar];
        g.fillStyle = '#ffd23a';
        g.font = '900 24px sans-serif';
        g.fillText('⭐', mx(x), mz(zz));
      }
    }
    g.save();
    g.translate(mx(this.player.x), mz(this.player.z));
    g.rotate(Math.atan2(Math.cos(this.playerChar.yaw), Math.sin(this.playerChar.yaw)));
    g.fillStyle = '#fff';
    g.strokeStyle = '#1b2142';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(11, 0);
    g.lineTo(-8, 8);
    g.lineTo(-4, 0);
    g.lineTo(-8, -8);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }
}
