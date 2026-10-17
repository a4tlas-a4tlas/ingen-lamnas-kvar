# Ingen lämnas kvar

*Vi lämnade dalen i skymningen. Framför oss låg vägen.*

A melancholic roguelite card game in Swedish. You are **Eden**, the Oath that holds a group of fleeing animals together. There's no fighting, only hiding, carrying, comforting, and sometimes sacrificing. When a promise breaks, the story is rewritten.

The first playable chapter is **Vägen om natten** (the road at night): get five animals across a night road before dawn.

- Design: [DESIGN.md](DESIGN.md)
- Play: GitHub Pages (published automatically from `main`)

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # engine tests (Vitest)
npm run test:e2e   # browser smoke test (Playwright)
npm run build      # production build to dist/
```

The game logic is a pure, deterministic engine (`src/engine/step.ts`): `step(state, action) → { state, events }` with a seeded RNG. The UI (`src/ui`) only renders state and plays back events. Content (cards, verses, the cast, Swedish text) lives in `src/data`.
