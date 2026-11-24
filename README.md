# Last Bell High

A 3D high-school life game that runs in the browser: classes, tests, clubs, friends and finals boss fights
across three school terms. Built with **Vite + TypeScript + Three.js**, deployed as a static site.

```bash
npm install
npm run dev        # dev server with hot reload (add ?debug to the URL to expose window.__game)
npm test           # unit tests (Vitest)
npm run typecheck  # strict TypeScript
npm run build      # typecheck + production build into dist/
npm run format     # Prettier
```

Deploy: import the repo in Vercel (the `vercel.json` already sets the Vite framework, build command and
security headers) or run `vercel` from this folder.

## Layout

| Path | What lives there |
|---|---|
| `src/core/` | Pure rules and content, no DOM / WebGL: `types.ts` (the whole save shape), `state.ts` (calendar, perks, grades, rank, quests, saves), `data.ts` + `bank.ts` + `npcs.ts` (content tables), `questions.ts` (math generator + question bank) |
| `src/world/` | Pure campus data: `layout.ts` (buildings, zones, spawn points), `lighting.ts` (time-of-day / weather), `collision.ts` |
| `src/render/` | Three.js: `view.ts` (renderer, sky, fog, sun + shadows), `campus.ts` (merged static geometry + animated props), `batch.ts` (geometry merging), `characters.ts`, `parts.ts` |
| `src/ui/` | DOM overlays: `ui.ts` (promise-based dialogs, menus, results), `hud.ts`, `screens.ts` (title, settings, creator) |
| `src/minigames/` | `quiz.ts` (classes, tests, finals boss) and the three club games: `rhythm.ts`, `dodge.ts`, `lab.ts` |
| `src/game.ts` | The controller: day / period flow, every activity, rewards, events, endings |
| `src/scene.ts`, `src/input.ts`, `src/main.ts` | Live 3D scene, input handling, boot and title flow |
| `tests/` | Vitest suites for the rules layer and the world geometry |

Everything under `src/core/` and `src/world/` is independent of the browser, so it is covered by tests that run in
plain Node. Saves use the same `localStorage` keys as the original no-build version and are validated / back-filled on load
(`migrateSave`).
