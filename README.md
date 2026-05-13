# Prima Data Portal v4

Production-grade rebuild on the agreed stack: **Next.js + Tailwind / NestJS / Supabase Postgres / Supabase Storage / built-in JWT+MFA (Auth0-ready)**.

## Quick start

```bash
# 1. Backend
cd backend
cp .env.example .env       # fill in Supabase + JWT secrets (see docs/SETUP.md)
npm install
npm run prisma:migrate
npm run seed
npm run start:dev          # http://localhost:3001

# 2. Frontend (in a second terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                # http://localhost:3000
```

Default credentials after seed:
- Admin: `admin@primaresearch.com` / `Admin@Prima2026!`
- Client: `alpha@alphacapital.com` / `Client@2026!`

## Documentation
- `docs/SETUP.md` — step-by-step environment configuration
- `docs/TESTING.md` — manual test checklist for every feature
- `docs/MIGRATION.md` — how to swap to Auth0 + AWS S3 for production
- `docs/SECURITY.md` — security posture, what's done, what's pending

## Stack
- Frontend: Next.js 14 (App Router) + Tailwind CSS + TypeScript
- Backend: NestJS + TypeScript + Prisma
- Database: Supabase Postgres (PostgreSQL 15)
- Storage: Supabase Storage (S3-compatible) with presigned URLs
- Auth: JWT access + refresh tokens, TOTP MFA, Argon2id password hashing
- Hosting target: VPS (deployment notes in `docs/MIGRATION.md`)
