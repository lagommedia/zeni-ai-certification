# Zeni Certification

A course certification platform built with Next.js (App Router), Prisma + SQLite, and shadcn/ui. Runs locally on port **5001**.

## Features

- **Notifications** — course updates, certificate alerts, reminders
- **Courses** — catalog, module-by-module lessons, progress tracking
- **Certificates** — auto-issued on course completion, printable
- **Settings** (admin only) — manage courses/modules, publish state, team roles
- **Analytics** (admin only) — team-wide completion stats

## Getting started

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

The app runs at [http://localhost:5001](http://localhost:5001).

## Demo accounts

Sign-in is a lightweight mock (no passwords) — pick an account on the login screen:

| Name | Email | Role |
|---|---|---|
| Ava Sinclair | admin@zeni.ai | Admin |
| Noah Patel | noah@zeni.ai | Member |
| Maya Chen | maya@zeni.ai | Member |

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **Prisma 7** + SQLite (via `@prisma/adapter-better-sqlite3`)
- **shadcn/ui** (Base UI primitives) + Tailwind CSS v4
- Session auth via a signed cookie (`src/lib/session.ts`) — role-gated routes enforced in `src/middleware.ts`

## Useful commands

```bash
npm run dev        # start dev server on :5001
npm run build       # production build
npm run db:seed     # reset & reseed the database
npx prisma studio    # browse the database
```
