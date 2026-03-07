# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LineCut is a peer-to-peer pickup app connecting people waiting in restaurant lines with hungry customers. Built with Next.js 16, React 19, Supabase, Tailwind CSS v4, and TypeScript. The project is in early stages — currently a landing page with Supabase auth infrastructure.

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint (flat config, `eslint.config.mjs`)
- `npm start` — Serve production build

## Architecture

- **App Router** (Next.js 16): All pages under `src/app/`
- **Path alias**: `@/*` maps to `./src/*`
- **React Compiler** enabled via `babel-plugin-react-compiler` + `reactCompiler: true` in `next.config.ts`
- **Supabase auth** uses the `@supabase/ssr` pattern with three client variants:
  - `src/lib/supabase/client.ts` — Browser client (client components)
  - `src/lib/supabase/server.ts` — Server client (server components/actions)
  - `src/lib/supabase/middleware.ts` — Middleware client (session refresh)
- **Middleware** (`src/middleware.ts`) refreshes Supabase auth sessions on every request (excludes static assets)
- **Environment variables**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.local.example`)
- **Styling**: Tailwind CSS v4 with PostCSS (`postcss.config.mjs`), utility-first classes
- **Design system**: See [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) for colors, typography, components, spacing, and brand voice. All UI work must follow this guide.
