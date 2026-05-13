# Security Posture

How the v4 build maps to the requirements in the original spec, what's implemented, and what still needs production hardening.

## Requirements vs implementation

| Requirement | Status | Where |
|---|---|---|
| Role-based access control (Admin / Data Manager / Client) | ✅ Done | `JwtStrategy` re-checks user on every request; `RolesGuard` enforces per-route roles |
| Company-level data segregation | ✅ Done | `DatasetAccess` table — clients see only datasets explicitly granted to them; access re-checked on every download |
| Multi-factor authentication for admin | ✅ Done (TOTP) | `auth.service.ts` setupMfa/confirmMfa/disableMfa; QR-code enrolment; verified at login when enabled |
| Secure cloud storage and encrypted transport | ✅ Done | Files stored in S3-compatible bucket only; presigned URLs (5-min TTL); HTTPS enforced in production via nginx + Let's Encrypt |
| Full audit logs (sign-ins, downloads, uploads, permission changes, billing actions) | ✅ Done | `AuditEvent` table with 21 action types; every security-relevant action calls `audit.log()` |
| Backup and recovery procedures | ⚠ Documented, not provisioned | See `docs/MIGRATION.md` §7 — needs Supabase Pro or RDS automated snapshots |

## Application security controls

### Authentication
- **Password hashing**: bcrypt with cost factor 12
- **Password policy**: minimum 10 characters, must include uppercase, lowercase, and a digit, enforced at all entry points (invite acceptance, password reset, change password)
- **Access tokens**: short-lived JWT (15 min default), stored in cookies with `sameSite: lax`
- **Refresh tokens**: 7-day, stored hashed (SHA-256) in the database, rotated on every use, revocable per device
- **Token revocation**: changing password, disabling account, or admin update with newPassword revokes all active refresh tokens immediately
- **Account lockout**: not implemented — relies on rate limiting (10 req/sec, 200/min globally). Production should add per-account brute-force protection (e.g. exponential backoff after 5 failed attempts) — Auth0 handles this automatically if you migrate

### Authorisation
- **JWT validation re-fetches user state every request** — disabled accounts cannot use a still-valid access token
- **Roles guard** on every privileged endpoint
- **Dataset access** double-checked at the storage layer: getting a download URL re-runs the access query, so a stale UI cache cannot leak a file
- **Last-admin guard** prevents demoting/disabling/deleting the only active admin
- **Self-revoke guard** prevents users from disabling or deleting their own account

### Storage
- **Bucket is private** — no public read
- **All uploads go through presigned PUT URLs** with content-type pinned, valid for 5 minutes
- **All downloads go through presigned GET URLs**, 5-minute TTL, with `Content-Disposition: attachment; filename=...` so browsers download rather than display
- **No public file routes on the API** — there is no equivalent of v3's `/uploads` static directory
- **File keys are randomised**: `datasets/<slug>/<version>/<timestamp>-<safeFilename>`. Knowing a dataset slug doesn't let you guess a file URL.

### Input validation
- **Class-validator** on every DTO — invalid emails, weak passwords, malformed UUIDs are rejected before reaching the service layer
- **ValidationPipe** with `whitelist: true, forbidNonWhitelisted: true` — extra fields in request bodies are stripped, unknown ones throw
- **Slug validation**: `^[a-z0-9-]+$` only, prevents injection in storage paths

### Network
- **Helmet** for standard security headers (HSTS, X-Content-Type-Options, X-Frame-Options, etc.)
- **CORS**: locked to the configured `FRONTEND_URL`
- **Rate limiting**: global throttler (10/sec, 200/min) — applies to login as well

### Audit
- 21 action types covering authentication, account changes, dataset lifecycle, access changes, downloads
- Every event records: action, actor (FK to user), target (type + ID), arbitrary metadata JSON, IP, user-agent, timestamp
- **Audit failures cannot block primary operations** — the catch in `audit.log()` ensures a logging outage doesn't break logins
- Admin-only audit log view with action filter and pagination

## Issues fixed since v3

These were the security issues in the previous build, all resolved here:

| v3 issue | Resolution |
|---|---|
| In-memory SQLite (sql.js) saved to disk every 5 min | Real Postgres with transactional writes |
| Files stored on local disk, exposed via `/uploads` static route | S3-compatible storage, no public routes, presigned URLs only |
| MFA missing entirely | TOTP MFA implemented with QR enrolment |
| Demo fallback in `login.html` faked a successful login if API was down | No fallback exists; failed login returns a clean error |
| No password reset flow | Self-service reset via emailed token (1-hour TTL) |
| Single token, no refresh, 8-hour expiry | Short access (15m) + rotating refresh (7d), DB-backed and revocable |
| Inconsistent password minimum (6 vs 8 in different files) | Single 10-character minimum with complexity, validated everywhere |
| Version overwrite — no history | Real `DatasetVersion` table; every upload creates a row, current pointer is separate |

## What's intentionally not done

These are choices appropriate for a development build that should change before production:

- **No password complexity beyond the minimum** — no dictionary check, no compromised-password lookup. Auth0 / haveibeenpwned integration would add this.
- **No CAPTCHA on login** — relies on rate limiter only. Add reCAPTCHA or Cloudflare Turnstile in production.
- **No IP allowlisting per client** — could be added if a specific client requires it.
- **No WebAuthn / hardware keys** — TOTP is sufficient for the spec but WebAuthn is stronger. Auth0 supports it natively.
- **No session pinning to IP/UA** — refresh tokens are not bound to the IP they were issued from. This is the standard tradeoff (mobile users change networks); add binding only if your threat model demands it.
- **No email verification on initial admin/data-manager creation** — direct creation by an admin trusts the admin. The invite flow does require the user to set their own password from a one-time link.
- **Audit log retention is unlimited** — production should pick a retention period (likely 7 years for compliance) and add a cleanup job.
- **No real-time alerting on suspicious activity** — production should ship audit events to a SIEM and alert on patterns like 20 failed logins in an hour, downloads outside business hours, or new IP geographies per user.

## Threat model summary

| Threat | Mitigation |
|---|---|
| Credential stuffing | Rate limiting, MFA on admin accounts, audit alerts on bulk failures |
| Stolen access token | 15-minute TTL, immediate revocation when account disabled |
| Stolen refresh token | Rotated on every use, revocable, hashed at rest |
| SQL injection | Prisma ORM with parameterised queries throughout |
| File enumeration | Randomised key prefixes, no public bucket access, presigned URLs |
| Privilege escalation by client | Role checked from DB on every request, not from token alone |
| Insider misuse | Full audit trail, last-admin guard, separation of admin and data-manager roles |
| Email enumeration via reset | Reset endpoint returns 204 regardless of whether the email exists |
| File leakage via stale grant | Access re-checked on every download URL request |
| XSS / CSRF | React escapes output by default; CORS restricted; SameSite=lax cookies; helmet headers |

## Reporting a vulnerability

In production, designate `security@primaresearch.com` and document a 90-day disclosure window in a `SECURITY.txt` at the site root.
