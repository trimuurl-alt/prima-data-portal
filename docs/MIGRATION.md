# Migration to Production

How to take this local-development build to production. The architecture was designed so each piece can be swapped independently — Supabase Postgres → managed Postgres, Supabase Storage → AWS S3, custom JWT/MFA → Auth0 — without rewriting application code.

## What changes vs the local build

| Concern | Local build | Production |
|---|---|---|
| Database | Supabase Postgres free tier | Managed Postgres (RDS, Supabase Pro, or self-hosted) |
| Object storage | Supabase Storage | AWS S3 (or any S3-compatible: R2, Wasabi, DO Spaces) |
| Authentication | NestJS JWT + speakeasy MFA | Auth0 (or AWS Cognito) |
| Email | Resend free tier or console | Resend Pro / SES / Postmark |
| Hosting | localhost | VPS (DigitalOcean, Hetzner, Linode) behind nginx + TLS |
| Logs | Console | Centralised (Logtail, Datadog, CloudWatch) |
| Backups | Supabase auto | Daily Postgres + S3 versioning |

---

## 1. Database

### Option A — Stay on Supabase (simplest)
Upgrade to **Pro** plan (~$25/mo) for daily backups, 8GB DB, longer log retention. No code change required — just point `DATABASE_URL` and `DIRECT_URL` at the Pro project.

### Option B — Switch to AWS RDS
1. Provision RDS Postgres 15, single-AZ to start, smallest instance suitable for the load
2. Update `DATABASE_URL` to the RDS endpoint
3. Remove `DIRECT_URL` (only needed for poolers like Supabase) — or set it to the same value
4. Run `npm run prisma:migrate deploy` (note: `deploy`, not `dev`) on first connection
5. Take a manual snapshot before any major schema change

### Option C — Self-hosted Postgres
Same as RDS but you handle backups via `pg_dump` to S3 nightly. Not recommended unless you have ops experience.

---

## 2. Object storage — switch to AWS S3

The code uses the AWS SDK already, so the swap is config-only.

1. Create an S3 bucket: `primaresearch-datasets-prod` in `eu-west-2` (or your region)
2. Block public access (default), enable versioning, enable default encryption (SSE-S3 or SSE-KMS)
3. Create an IAM user `prima-portal-api` with this minimal policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:HeadObject"],
       "Resource": "arn:aws:s3:::primaresearch-datasets-prod/*"
     }]
   }
   ```
4. Generate access key/secret for the IAM user
5. Configure CORS on the bucket so the frontend can PUT directly:
   ```json
   [{
     "AllowedOrigins": ["https://portal.primaresearch.com"],
     "AllowedMethods": ["PUT","GET","HEAD"],
     "AllowedHeaders": ["*"],
     "MaxAgeSeconds": 300
   }]
   ```
6. Update `.env`:
   ```dotenv
   S3_REGION=eu-west-2
   S3_BUCKET=primaresearch-datasets-prod
   S3_ACCESS_KEY_ID=AKIA...
   S3_SECRET_ACCESS_KEY=...
   S3_ENDPOINT=          # leave blank — AWS uses default endpoints
   ```
7. Restart backend. Existing Supabase Storage files won't auto-migrate — see below.

### Migrating existing files (if any)

If you've uploaded files in dev that need to come along:
```bash
aws s3 sync \
  s3://supabase-old-bucket s3://primaresearch-datasets-prod \
  --endpoint-url https://YOUR-REF.supabase.co/storage/v1/s3 \
  --source-region eu-west-2
```
Then update each `DatasetVersion.fileKey` if the path scheme differs (it shouldn't — the code uses identical keys for both backends).

---

## 3. Authentication — switch to Auth0

Auth0 takes over login, MFA, password reset, account management. The custom code in `src/auth/auth.service.ts` and the related controllers can be replaced with a thin layer that:

1. Validates Auth0-issued JWTs (instead of issuing your own)
2. Provisions a `User` row in the database the first time someone authenticates (just-in-time)
3. Reads role from an Auth0 custom claim

### Steps

1. Create an Auth0 tenant and a *Regular Web Application*
2. Configure:
   - Allowed Callback URLs: `https://portal.primaresearch.com/api/auth/callback`
   - Allowed Logout URLs: `https://portal.primaresearch.com`
   - Enable MFA in *Security → Multi-factor Auth* (TOTP and/or WebAuthn)
3. Add a custom claim for role via an Auth0 Action (login flow):
   ```js
   exports.onExecutePostLogin = async (event, api) => {
     const ns = 'https://primaresearch.com/';
     api.idToken.setCustomClaim(`${ns}role`, event.user.app_metadata?.role || 'CLIENT');
     api.accessToken.setCustomClaim(`${ns}role`, event.user.app_metadata?.role || 'CLIENT');
   };
   ```
4. In the backend:
   - Install `jwks-rsa` and `passport-jwt`
   - Replace `JwtStrategy` to use Auth0's JWKS endpoint (`https://YOUR-TENANT.auth0.com/.well-known/jwks.json`)
   - On every request, look up the user by `sub` (Auth0 user_id) → upsert a `User` row keyed on Auth0 `sub` if first sign-in
5. Remove from the codebase (or keep behind a feature flag):
   - `src/auth/auth.service.ts` (login/refresh/MFA/reset methods)
   - `RefreshToken` model (Auth0 handles refresh)
   - Speakeasy/QR code dependencies
6. Update frontend to use `@auth0/nextjs-auth0` — it handles login, callback, logout, and silent refresh out of the box

### What you keep

- `users` module: still used for admin to manage roles, view list, disable accounts (sets a flag synced to Auth0 `app_metadata`)
- All `datasets`, `access`, `audit` modules: unchanged
- All UI: unchanged except the login page becomes a redirect to Auth0

### Cost

Auth0 free tier: 7,000 active users, basic MFA. The B2B Essentials plan (~$130/mo) adds organization features and is appropriate once the client list exceeds ~50.

---

## 4. Email — switch to Resend Pro or AWS SES

Already using nodemailer — just update `.env`:

```dotenv
SMTP_HOST=email-smtp.eu-west-2.amazonaws.com
SMTP_PORT=587
SMTP_USER=<SES SMTP username>
SMTP_PASS=<SES SMTP password>
SMTP_FROM="Prima Data Portal <portal@primaresearch.com>"
EMAIL_LOG_TO_CONSOLE=false
```

Verify the sender domain in SES (or Resend) and add SPF/DKIM/DMARC DNS records.

---

## 5. Hosting on a VPS

Recommended stack: **Hetzner CX22** (~€4/mo) or **DigitalOcean Basic Droplet** ($6/mo) running Ubuntu 24.04.

```
[ Cloudflare DNS ]
     │
     ▼
[ nginx — TLS terminator + reverse proxy ]
     │
     ├── /         → Next.js (port 3000)
     └── /api/v1   → NestJS  (port 3001)
```

### Provision

1. Create the VPS, set up an SSH key, lock down `ufw` to ports 22, 80, 443 only
2. Install Node 20, nginx, certbot:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx
   sudo npm i -g pm2
   ```
3. Create a deploy user, clone the repo, install both backend and frontend
4. Build:
   ```bash
   cd backend && npm ci && npm run build
   cd ../frontend && npm ci && npm run build
   ```
5. Configure `.env` files with production values (different JWT secrets, real S3, real DB)
6. Run with PM2:
   ```bash
   pm2 start dist/main.js --name prima-api --cwd backend
   pm2 start "npm start" --name prima-web --cwd frontend
   pm2 startup && pm2 save
   ```
7. Configure nginx (`/etc/nginx/sites-available/portal.primaresearch.com`):
   ```nginx
   server {
     server_name portal.primaresearch.com;

     location /api/ {
       proxy_pass http://localhost:3001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       client_max_body_size 100m;
     }
     location / {
       proxy_pass http://localhost:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```
8. `sudo certbot --nginx -d portal.primaresearch.com` → free Let's Encrypt cert + auto-renewal
9. Update Supabase/S3 CORS to allow `https://portal.primaresearch.com`
10. Update Auth0 callback URLs (if used)

### Pre-flight checks before going live

- [ ] All admin/seed passwords changed
- [ ] All `JWT_*_SECRET` values regenerated (different from dev)
- [ ] `NODE_ENV=production` set
- [ ] `EMAIL_LOG_TO_CONSOLE=false` and SMTP working
- [ ] Backups verified — take a test dump, restore to a scratch DB
- [ ] HTTPS enforced (no plain HTTP)
- [ ] Cookies set with `secure: true` and `sameSite: lax`
- [ ] Audit log dashboard reviewed — all events flow through correctly
- [ ] Run `docs/TESTING.md` end-to-end against the production URL

---

## 6. Observability

Minimum: ship logs to **Logtail** (free tier 1GB/mo) or **Datadog** for searchable history.

```bash
npm install @logtail/node @logtail/winston
```
Wire into NestJS's logger. Send the audit table to a separate sink (e.g. nightly export to S3 → Athena) for compliance retention.

Add **uptime monitoring** (UptimeRobot or BetterStack) hitting a `/api/v1/health` endpoint.

---

## 7. Backups

- **Database**: enable Supabase Pro daily backups, OR if on RDS, automated snapshots with 14-day retention
- **Object storage**: enable bucket versioning so accidental deletes are recoverable for 30 days
- **Test the restore**: at least once, restore to a scratch environment and verify the app still works against it. A backup you've never restored is not a backup.

---

## 8. Compliance loose ends

- **Privacy policy + DPA** — if storing personal data on EU citizens, add Anthropic-style boilerplate, signed DPA with subprocessors (Supabase, Auth0, AWS, Resend)
- **Data deletion** — admin "Delete user" already exists, but add a documented process for honouring DSAR/erasure requests within 30 days
- **Retention** — current build keeps audit events forever; for production, decide a retention period (e.g. 7 years for security events) and add a scheduled cleanup
- **Access reviews** — quarterly: export the user list and per-dataset access list, have a stakeholder sign off
