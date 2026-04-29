# AI Literacy Website

An interactive website that explains AI literacy through small mini-games and hands-on examples.

Course: Design in Educational Technology, ETH FS26.

## Stack

- Vite + React 19 + TypeScript
- ESLint
- Deployed on Vercel (every PR gets a preview URL)

## Getting started

Requires Node 20.19+ (see `.nvmrc`). With nvm:

```bash
nvm use      # picks up .nvmrc
npm install
npm run dev  # http://localhost:5173
```

Other scripts:

```bash
npm run build      # type-check + production build
npm run preview    # serve the built bundle locally
npm run lint       # ESLint
npm run typecheck  # TS only, no emit
```

## Project structure

```
src/
  main.tsx           # entry point
  App.tsx            # root component
  assets/            # static assets bundled by Vite
public/              # files served as-is from the root
```

As the site grows, suggested layout:

```
src/
  components/        # shared UI
  games/             # one folder per mini-game
  pages/             # top-level routes
  lib/               # utilities, hooks
```

## Deployment

`main` auto-deploys to production. Every PR gets a preview deployment via Vercel.
