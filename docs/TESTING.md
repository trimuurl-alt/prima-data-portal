# Testing Guide — Prima Data Portal v4

A manual test checklist covering every feature. Work through this end-to-end after first setup, and again whenever changes are deployed.

## Setup before testing

1. Backend running on http://localhost:3001
2. Frontend running on http://localhost:3000
3. Database seeded (`npm run seed`)
4. `EMAIL_LOG_TO_CONSOLE=true` so you can copy invite/reset links from the backend terminal

You'll need 2 browsers (or 1 normal window + 1 incognito) to test admin and client flows side by side.

---

## 1. Authentication

### 1.1 Admin login
- [ ] Go to http://localhost:3000 → redirected to `/login`
- [ ] Sign in with `admin@primaresearch.com` / `Admin@Prima2026!`
- [ ] Redirected to `/admin` dashboard
- [ ] Top-left shows admin name; sidebar shows admin nav (Dashboard, Datasets, Uploads, Users, Access, Audit log)

### 1.2 Wrong password
- [ ] Sign out, return to login
- [ ] Enter the admin email with wrong password → `Invalid email or password`
- [ ] In admin terminal, audit log records `LOGIN_FAILURE`

### 1.3 Client login
- [ ] In a separate browser, sign in as `alpha@alphacapital.com` / `Client@2026!`
- [ ] Redirected to `/portal`
- [ ] Sidebar shows only client nav (Datasets, My downloads)
- [ ] Trying to navigate to `/admin` directly redirects back to `/portal`

### 1.4 Session refresh
- [ ] After signing in, leave the page open for 16 minutes (access token TTL is 15m)
- [ ] Click around — you should remain signed in (refresh happens silently)

### 1.5 Sign out
- [ ] Click "Sign out" in the sidebar
- [ ] Redirected to login
- [ ] Audit log shows `LOGOUT`
- [ ] Pressing back-button does not restore the session

---

## 2. Multi-factor authentication (MFA)

### 2.1 Set up MFA
- [ ] Sign in as admin → click name → "Account settings" → 2FA tab
- [ ] Click "Set up 2FA" → QR code appears
- [ ] Scan with Google Authenticator (or any TOTP app)
- [ ] Enter the 6-digit code → "Verify and enable"
- [ ] Banner now shows "Two-factor authentication is enabled"
- [ ] Audit log records `MFA_ENABLED`

### 2.2 Login with MFA
- [ ] Sign out
- [ ] Sign in with email + password → MFA code field appears
- [ ] Enter wrong code → error, field stays visible
- [ ] Enter correct 6-digit code from your app → signed in

### 2.3 Disable MFA
- [ ] Account settings → 2FA → "Disable 2FA" → confirm
- [ ] Banner now shows disabled
- [ ] Audit log records `MFA_DISABLED`
- [ ] Next login does NOT prompt for MFA code

---

## 3. User management (admin)

### 3.1 Invite via email
- [ ] Admin → Users → "Invite via email"
- [ ] Email: `test-invite@example.com`, Name: `Test Invite User`, Role: Client
- [ ] Submit
- [ ] In the backend terminal, find the email block — copy the activation link
- [ ] Paste link into a private window
- [ ] Set a strong password (10+ chars, upper, lower, number)
- [ ] Redirected to login with "Account activated" banner
- [ ] Sign in successfully

### 3.2 Add user directly
- [ ] Admin → Users → "Add user directly"
- [ ] Fill in email, name, password, role: Client
- [ ] User appears in the list with status `active`

### 3.3 Disable / restore
- [ ] Click "Revoke" next to a user → status becomes `disabled`
- [ ] Try to sign in as that user → fails
- [ ] Click "Restore" → status returns to `active`, user can sign in
- [ ] Audit log shows `USER_DISABLED` and `USER_RESTORED`

### 3.4 Last-admin guard
- [ ] Try to disable the only active admin → blocked with `Cannot revoke the only active admin`
- [ ] Try to delete your own account while signed in → blocked

### 3.5 Delete user
- [ ] Click "Delete" next to a test user → confirm
- [ ] User disappears
- [ ] Audit log records `USER_DELETED`

---

## 4. Password reset

### 4.1 Self-service reset
- [ ] Sign out → "Forgot password?" → enter your email → submit
- [ ] Backend terminal logs the reset email — copy the link
- [ ] Open it → set a new password
- [ ] Redirected to login with "Password reset successful"
- [ ] Sign in with new password
- [ ] Try old password — fails
- [ ] All previous sessions are signed out (test in second browser if you were signed in there)
- [ ] Audit log records `PASSWORD_RESET_REQUESTED` and `PASSWORD_RESET_COMPLETED`

### 4.2 Expired/invalid token
- [ ] Click an old reset link or modify the token → `Invalid or expired token`

### 4.3 Change password (authenticated)
- [ ] Account settings → Password tab
- [ ] Wrong current password → fails
- [ ] Correct current + new password (10+ chars) → success
- [ ] Audit log records `PASSWORD_CHANGED`

---

## 5. Dataset management (admin)

### 5.1 Create dataset
- [ ] Admin → Datasets → "New dataset"
- [ ] Name: `Test Dataset`, Category: `Education`, Coverage: `2026`, Description: any text
- [ ] Slug auto-fills as `test-dataset`
- [ ] Save → appears in list with status `draft`, 0 versions, 0 clients

### 5.2 Try to publish without a file
- [ ] Click "Publish" on the new dataset
- [ ] Blocked: `Cannot publish a dataset without an uploaded file`

### 5.3 Upload a file
- [ ] Click the dataset name to open detail
- [ ] "Upload new version"
- [ ] Version: `v1.0`, choose any small file (CSV, XLSX, PDF, etc.)
- [ ] Watch the 3-stage progress: requesting URL → uploading → finalising
- [ ] Modal closes; version appears in version history with size and timestamp
- [ ] Reload — file persists
- [ ] In Supabase dashboard → Storage → `prima-datasets` bucket, you can see the uploaded file

### 5.4 Publish
- [ ] Datasets list → "Publish" the dataset → status becomes `published`
- [ ] Audit log records `DATASET_PUBLISHED`

### 5.5 Upload a second version
- [ ] Open dataset → "Upload new version" → Version: `v1.1`, different file, add a changelog
- [ ] Both versions appear in history
- [ ] The newer one is marked `(current)`

### 5.6 Archive
- [ ] Click "Archive" on a published dataset → status becomes `archived`
- [ ] Client (in other browser) no longer sees it on `/portal`

### 5.7 Delete dataset
- [ ] Delete a test dataset → confirm
- [ ] Dataset disappears, files are removed from storage (verify in Supabase Storage)
- [ ] Audit log records `DATASET_DELETED`

---

## 6. Access control

### 6.1 Grant access
- [ ] Admin → open a published dataset → "Client access" panel
- [ ] Use the dropdown to grant access to a client
- [ ] Client appears in the list
- [ ] In the client browser, refresh `/portal` → dataset is now visible

### 6.2 Revoke access
- [ ] Click "Revoke" next to the client
- [ ] In the client browser, refresh `/portal` → dataset is gone
- [ ] If client tries to access the dataset URL directly → 403/404

### 6.3 Access list endpoint
- [ ] Admin → Users → user list shows correct dataset count column

---

## 7. Client experience

### 7.1 Browse
- [ ] Sign in as client → `/portal`
- [ ] See only published datasets they have access to
- [ ] Search filters work
- [ ] Click a dataset → opens detail page

### 7.2 Download
- [ ] Click "Download latest" on the dataset detail page
- [ ] Browser starts downloading the file
- [ ] In My downloads, the download is recorded with timestamp
- [ ] Audit log (admin view) shows `DATASET_DOWNLOADED` with the client as actor

### 7.3 Download a specific version
- [ ] Click "Download" next to a non-current version → that specific version downloads

### 7.4 Direct URL access without grant
- [ ] As client, find a dataset ID you don't have access to
- [ ] Visit `/portal/datasets/<that-id>` directly
- [ ] Get a 403 / "No access" error — the page does NOT render the dataset

---

## 8. Audit log

### 8.1 View
- [ ] Admin → Audit log → see chronological list of every event from the testing so far
- [ ] Each row shows: time, action, actor, target, IP

### 8.2 Filter
- [ ] Filter by `LOGIN_FAILURE` → only failed login attempts
- [ ] Filter by `DATASET_DOWNLOADED` → only downloads
- [ ] Pagination works (Previous/Next)

### 8.3 Non-admin access
- [ ] Sign in as a Client → try `/admin/audit` URL directly → redirected away

---

## 9. Role-based access (negative tests)

### 9.1 Client trying admin endpoints
- [ ] Sign in as client
- [ ] Open browser dev tools console
- [ ] Run: `fetch('/api/v1/users', { headers: { Authorization: 'Bearer ' + document.cookie.split('access_token=')[1].split(';')[0] } }).then(r=>r.status)`
- [ ] Returns 403

### 9.2 Disabled user
- [ ] Sign in as a client in browser A
- [ ] In browser B (admin), disable that client
- [ ] In browser A, refresh — next API call fails, user is signed out
- [ ] User cannot sign in again until restored

### 9.3 Token after password change
- [ ] Sign in as a user in browser A
- [ ] In browser B (or via admin update with newPassword), change that user's password
- [ ] In browser A, next API call fails (refresh tokens revoked)

---

## 10. API surface (Swagger)

- [ ] http://localhost:3001/api/docs loads
- [ ] All endpoints listed with request/response schemas
- [ ] Bearer auth button works for testing protected routes

---

## What "all green" looks like

When every box above is checked, you have verified:
- Authentication (password + MFA)
- Token refresh and rotation
- Account lifecycle (invite, activate, disable, restore, delete)
- Password reset and change
- Dataset CRUD with version history
- Direct-to-storage uploads via presigned URLs
- Time-limited download URLs
- Per-dataset access grant/revoke
- Role-based access enforcement on every endpoint
- Complete audit trail
- Last-admin and self-revoke guards

If any test fails, the audit log is your first stop — every action is recorded with actor, IP, and metadata.
