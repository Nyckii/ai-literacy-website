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

## How we collaborate

We work on branches and merge through pull requests so five people can work in parallel without stepping on each other.

1. Pick a card from the [Project board](../../projects) and assign yourself.
2. Branch off `main`: `git checkout -b feat/<short-name>` (or `fix/...`, `chore/...`).
3. Commit, push, open a PR back into `main`.
4. Vercel posts a preview URL on the PR — share it for feedback.
5. One review approval before merging. Squash-merge to keep history tidy.

Keep PRs small and focused — one mini-game or one feature at a time.

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
