# Setup Guide — Prima Data Portal v4

A step-by-step walkthrough for getting the project running on Windows (no Docker required).

## Prerequisites

1. **Node.js 20 LTS** — https://nodejs.org/
2. **A Supabase account** — https://supabase.com/ (free tier is sufficient)
3. **An authenticator app** for testing MFA — Google Authenticator, Authy, Microsoft Authenticator, or 1Password
4. **A Resend account** (optional, for real emails) — https://resend.com/ (free tier: 3,000 emails/month)

## Step 1 — Create a Supabase project

1. Sign in at https://supabase.com → **New Project**
2. Fill in:
   - Name: `prima-data-portal`
   - **Database password**: click *Generate a password*, then **save it immediately** (you can't recover it later)
   - Region: closest to you (e.g. London for UK)
   - Plan: **Free**
3. Wait ~2 minutes for the project to provision

## Step 2 — Get database connection strings

1. In your Supabase project, click **Connect** at the top of the dashboard
2. Choose the **ORMs** tab → **Prisma**
3. Copy the two URLs shown. Replace `[YOUR-PASSWORD]` with the database password from step 1.

You'll have:
- A **transaction pooler** URL on port `6543` → goes into `DATABASE_URL`
- A **session pooler / direct** URL on port `5432` → goes into `DIRECT_URL`

## Step 3 — Set up Supabase Storage

1. In your Supabase project, go to **Storage** (left sidebar)
2. Click **New bucket** → name it exactly `prima-datasets` → **Private** → Create
3. Go to **Project Settings** → **Storage** → look for **S3 Connection**
4. Note the **Endpoint** URL (looks like `https://YOUR-REF.supabase.co/storage/v1/s3`)
5. Click **New access key** under **S3 Access Keys** → **Generate** → save the **Access Key ID** and **Secret Access Key** — you'll only see the secret once.

## Step 4 — Generate JWT secrets

Open PowerShell or Command Prompt and run this command twice (you need two different secrets):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```
 
You'll get two long random strings. Save them — they go into `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

## Step 5 — Configure backend `.env`

```bash
cd backend
cp .env.example .env
```

Open `.env` in your editor and fill in:

```dotenv
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# From step 2
DATABASE_URL="postgresql://postgres.xxxxxx:YourPassword@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxxxx:YourPassword@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"

# From step 4
JWT_ACCESS_SECRET=<first generated string>
JWT_REFRESH_SECRET=<second generated string>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# From step 3
S3_REGION=eu-west-2
S3_BUCKET=prima-datasets
S3_ACCESS_KEY_ID=<your S3 access key>
S3_SECRET_ACCESS_KEY=<your S3 secret>
S3_ENDPOINT=https://YOUR-REF.supabase.co/storage/v1/s3
S3_PRESIGN_EXPIRES_SECONDS=300

# Email — leave blank for now, console mode is enabled
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Prima Data Portal <no-reply@example.com>"
EMAIL_LOG_TO_CONSOLE=true

# Seed defaults — change before any real deployment
SEED_ADMIN_EMAIL=admin@primaresearch.com
SEED_ADMIN_PASSWORD=Admin@Prima2026!
SEED_ADMIN_NAME=Admin User
```

## Step 6 — Install and migrate

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

When asked for a migration name, type something like `init` and press Enter. This creates all the tables in your Supabase database. You can verify by going to **Table Editor** in the Supabase dashboard.

```bash
npm run seed
```

This creates the initial admin, sample data manager, sample client, and three draft datasets.

## Step 7 — Start backend

```bash
npm run start:dev
```

You should see:
```
🚀 Backend running at http://localhost:3001/api/v1
📘 API docs at http://localhost:3001/api/docs
```

Leave this terminal open.

## Step 8 — Configure and start frontend

In a **new terminal**:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Login credentials

After seed:
- **Admin**: `admin@primaresearch.com` / `Admin@Prima2026!`
- **Data Manager**: `datamanager@primaresearch.com` / `DataMgr@2026!`
- **Client**: `alpha@alphacapital.com` / `Client@2026!`

⚠ Change the admin password immediately after first login.

## Optional — Configure real emails (Resend)

Once you want invite links and password resets to actually send emails:

1. Sign up at https://resend.com (free)
2. Go to **API Keys** → **Create API Key** → copy it (starts with `re_`)
3. Update `.env`:
   ```dotenv
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USER=resend
   SMTP_PASS=re_your_api_key_here
   SMTP_FROM="Prima Data Portal <onboarding@resend.dev>"
   EMAIL_LOG_TO_CONSOLE=false
   ```
4. Restart the backend.

The free tier gives 3,000 emails/month, which is plenty for development and small client lists.

## Common Windows issues

**`prisma migrate` hangs or times out** — Supabase pooler can be slow on first connection. Try again, it usually works on the second attempt.

**Connection refused on port 6543** — your firewall might block the pooler port. Try the direct URL (port 5432) for `DATABASE_URL` as a fallback.

**Special characters in your DB password** — if your generated password contains `#`, `@`, `:`, `/`, or `?`, regenerate it without them in Supabase project settings → Database → Reset password.

**Use Windows Terminal or PowerShell** — not the legacy Command Prompt. Some npm scripts behave better there.
