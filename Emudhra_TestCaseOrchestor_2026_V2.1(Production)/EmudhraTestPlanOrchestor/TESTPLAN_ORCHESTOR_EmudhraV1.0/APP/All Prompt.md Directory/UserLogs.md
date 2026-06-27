# 🧠 SUPER PROMPT — Admin Command Center: Session Management & User Governance
**Project:** QA-Gen AI | eMudhra Admin Panel  
**Target:** VSCode + Claude Code Assistant (Development + Verification)  
**Scope:** Real-time session tracking, concurrent login control, force-logout, activity audit logging

---

## 📌 SYSTEM OVERVIEW

You are building the **Admin Command Center** for QA-Gen AI (eMudhra). This is an internal enterprise admin panel that governs all users of the platform. The panel lives at `/src/pages/admin.html` and is served locally at `127.0.0.1:3000`.

The Admin Panel has four top-level navigation sections:
- **User Management** (UM) — primary focus of this prompt
- **Token Dashboard** (TD)
- **Security Logs** (SL)
- **Help & Contact** (HP)
- **About Us** (AB)

### Top KPI Cards (always live-updating):
| Card | Metric | Description |
|------|--------|-------------|
| Registered Users | Count | Total workspace identities |
| Active Sessions | Count | Currently online users |
| Security Events | Count | Immutable audit records |
| Tokens Consumed | Number | Usage across all users |

---

## 🎯 CORE REQUIREMENTS TO BUILD & VERIFY

---

### REQUIREMENT 1 — Real-Time Data Population (No Junk Records)

**Rule:** The User Management table must ONLY show users who are actually registered in the system. No placeholder rows, no mock data, no empty ghost records.

**Fields to auto-populate per user row:**

| Column | Source | Behaviour |
|--------|--------|-----------|
| ROLE | Auth system | Internal / Administrator / Viewer |
| STATUS | Session state | ACTIVE (green) / IDLE (orange) / OFFLINE (grey) |
| PHONE | User profile | Fetched from registration data |
| LOCATION | IP Geolocation API | Auto-detected from active session IP; show `—` if not logged in |
| REGISTERED | DB timestamp | Date of account creation (DD/MM/YYYY) |
| SESSIONS | Live session store | Count of active sessions for this user |
| TOKENS | Token ledger | Cumulative tokens consumed by this user |
| LAST SEEN | Session log | Timestamp of last activity; show `Forced out` if admin kicked them |
| ACTION | UI controls | Eye (view) / Edit / Suspend / Delete |

**Verification checklist:**
- [ ] If a user has never logged in, LOCATION shows `—`
- [ ] If a user is logged out (no active session), SESSIONS shows `0`
- [ ] LAST SEEN is updated on every user action (API call, page load, button click)
- [ ] No row appears for a userId that doesn't exist in the users table
- [ ] KPI card "Active Sessions" exactly equals count of rows with STATUS = ACTIVE

---

### REQUIREMENT 2 — Concurrent Session Panel ("Concurrent Sessions")

**Location:** Right sidebar of the Admin Panel

**Rule:** The sidebar shows ONLY users who are **currently online** (have a valid, non-expired session token).

```
Concurrent Sessions
1 online

[R]  Rajdip          ● Active    [Force Logout]
     — ◆ —

[TG] Tushar Ghodke              Idle
     — ◆ —    Bengaluru
```

**Fields per concurrent session card:**
- Avatar initials (auto-generated from name)
- Full name
- Status badge: `Active` (green) | `Idle` (orange)
- Location (city from IP geolocation, only if logged in)
- **[Force Logout]** button — visible only on Active sessions or at admin's discretion

**Polling / Real-time mechanism:**
- Panel MUST refresh every **15 seconds** via WebSocket ping or polling heartbeat
- The count label "X online" must match the exact number of session cards shown

**Verification checklist:**
- [ ] A user who logs out disappears from the sidebar within 1 polling cycle
- [ ] `1 online` counter matches actual card count at all times
- [ ] A Force-Logged-Out user's card disappears immediately after admin action
- [ ] Idle users show no [Force Logout] button OR it is visually distinct from Active

---

### REQUIREMENT 3 — Force Logout (Admin Action)

**Trigger:** Admin clicks **[Force Logout]** on any session card in the Concurrent Sessions sidebar.

**Expected server-side behaviour:**
1. Immediately invalidate the target user's session token in the session store (Redis / DB)
2. Set a `force_logout_flag = true` for that `userId` in the session table
3. Write an immutable audit log entry (see Requirement 6)
4. The `LAST SEEN` column for that user in the table must now read **"Forced out"**
5. STATUS changes to **IDLE** immediately

**Expected client-side behaviour (target user's browser):**
- On the user's very next page load OR within the active heartbeat window (≤ 15 seconds), the frontend checks the session validity endpoint
- If `force_logout_flag = true` → the user is **automatically redirected to the login page**
- The login page shows a non-dismissible toast/banner:

```
⚠️  You have been logged out by an administrator.
    Please contact your workspace admin if this was unexpected.
```

**Verification checklist:**
- [ ] Force logout invalidates JWT / session cookie server-side immediately
- [ ] Target user sees the warning message on redirect, NOT a generic 401
- [ ] Admin panel shows "Forced out" in LAST SEEN within 1 polling cycle
- [ ] Audit log captures: admin userId, target userId, timestamp, IP, reason="Force Logout"
- [ ] Force logout of a user with 0 active sessions is gracefully ignored (no error thrown)

---

### REQUIREMENT 4 — Concurrent Login Conflict (Same Account, Two Browsers/Devices)

This is the **most critical UX flow**. When User A is already logged in and User B (or the same physical person on another device) tries to log in with the **same credentials**:

#### 4A — Warning Modal on Second Login Attempt

The login page (or auth handler) detects an existing active session for that `userId`.

Before completing the login, show a **blocking modal dialog**:

```
┌────────────────────────────────────────────────────┐
│  ⚠️  Account Already Active                        │
│                                                    │
│  This account is currently logged in from          │
│  another device or browser.                        │
│                                                    │
│  If you continue, the other session will be        │
│  automatically signed out.                         │
│                                                    │
│         [ Cancel ]      [ Yes, Log Me In ]         │
└────────────────────────────────────────────────────┘
```

**Button behaviour:**
- **Cancel** → Abort login. Stay on login page. No session is touched.
- **Yes, Log Me In** → Proceed to step 4B.

#### 4B — Session Takeover Flow

When the user clicks **Yes, Log Me In**:

1. **Server:** Invalidate ALL existing sessions for that `userId`
2. **Server:** Set `force_logout_flag = true` on all previous sessions
3. **Server:** Create a new session for the incoming login
4. **Previous user's browser:** On next heartbeat/page-load → redirect to login with message:

```
⚠️  Your session was ended because the same account
    was accessed from another device.
    If this wasn't you, please reset your password immediately.
```

5. **New user's browser:** Normal login → redirect to dashboard

**Verification checklist:**
- [ ] Modal appears BEFORE any session is created for the second login
- [ ] Cancel truly does nothing — no session token is issued
- [ ] "Yes" invalidates the old session server-side, not just client-side
- [ ] The displaced user sees the correct "accessed from another device" message
- [ ] Audit log entry is created for the session takeover (see Requirement 6)
- [ ] If the "same" user logs in on two tabs in the same browser with shared cookies, the flow is handled gracefully (treat as same session, no conflict modal)

---

### REQUIREMENT 5 — Session Heartbeat & Auto-Expiry

Every authenticated user's frontend must send a **heartbeat ping** to the server:
- Interval: every **30 seconds**
- Endpoint: `POST /api/session/heartbeat` with `{ sessionId, userId }`
- Server response:
  - `{ valid: true }` → continue normally
  - `{ valid: false, reason: "force_logout" }` → redirect to login with force-logout message
  - `{ valid: false, reason: "session_expired" }` → redirect to login with expiry message
  - `{ valid: false, reason: "concurrent_override" }` → redirect with "accessed from another device" message

**Session expiry rules:**
- Idle timeout: **30 minutes** of no heartbeat → session marked EXPIRED
- Absolute timeout: **8 hours** from login regardless of activity
- On expiry, STATUS changes to OFFLINE in the admin panel

**Verification checklist:**
- [ ] Heartbeat endpoint is authenticated (requires valid session token)
- [ ] Missing heartbeat for 30 min correctly expires session in DB
- [ ] Admin panel updates STATUS to OFFLINE after expiry (next polling cycle)
- [ ] User gets a friendly "session expired" page, not a raw 401 JSON

---

### REQUIREMENT 6 — Immutable Audit Log (Security Events)

Every significant action must be written to an **append-only audit log table** (`security_events`). No record in this table may be modified or deleted — only inserted.

#### Required log fields:

```json
{
  "event_id": "uuid-v4",
  "event_type": "LOGIN | LOGOUT | FORCE_LOGOUT | SESSION_TAKEOVER | SUSPEND_USER | INVITE_USER | TOKEN_UPDATE | HEARTBEAT_FAIL",
  "actor_user_id": "who performed the action",
  "actor_role": "Administrator | System",
  "target_user_id": "who was affected (null if self-action)",
  "session_id": "session identifier",
  "ip_address": "actor's IP",
  "user_agent": "browser/device string",
  "location": "city from geolocation",
  "timestamp": "ISO 8601 UTC",
  "metadata": {
    "reason": "optional free text",
    "previous_session_id": "for session takeover",
    "token_delta": "for token events"
  }
}
```

#### Events to log:

| Trigger | event_type | actor | target |
|---------|-----------|-------|--------|
| User logs in | LOGIN | user | self |
| User logs out | LOGOUT | user | self |
| Admin force-logs out user | FORCE_LOGOUT | admin | target user |
| Session takeover (concurrent login) | SESSION_TAKEOVER | system | displaced user |
| Admin suspends user | SUSPEND_USER | admin | target user |
| Admin invites user | INVITE_USER | admin | new user |
| Heartbeat fails 3x | HEARTBEAT_FAIL | system | user |
| Location auto-detected | LOCATION_DETECTED | system | user |

**Security Logs UI** (SL tab) must display these records in a paginated, read-only table — no edit, no delete buttons.

**Verification checklist:**
- [ ] INSERT-only constraint enforced at DB level (no UPDATE/DELETE permissions on this table for app user)
- [ ] Every force logout generates exactly 1 FORCE_LOGOUT entry
- [ ] Every session takeover generates exactly 1 SESSION_TAKEOVER entry for the displaced session
- [ ] KPI card "Security Events" count matches `SELECT COUNT(*) FROM security_events`
- [ ] Logs are searchable by event_type, userId, date range
- [ ] Logs are NOT deletable from the UI or API

---

### REQUIREMENT 7 — Location Auto-Detection

When a user logs in or sends a heartbeat, the server must:
1. Capture the request IP
2. Call an IP geolocation service (e.g., `ip-api.com`, `ipinfo.io`, or internal GeoIP DB)
3. Store `{ city, country, lat, lon }` in the session record
4. Surface `city` in:
   - User Management table → LOCATION column
   - Concurrent Sessions sidebar → below user name
   - Audit log → `location` field

**If geolocation fails or IP is private (127.x.x.x, 10.x.x.x, 192.168.x.x):**
- Show `—` in the UI (never show raw IP)
- Log `location: "local/private"` in audit

**Verification checklist:**
- [ ] Location updates on each new login (not cached from old session)
- [ ] Private/loopback IPs gracefully show `—`, no error thrown
- [ ] Location is never shown for a user who is not logged in

---

## 🏗️ ARCHITECTURE GUIDANCE

### Recommended Tech Stack:
```
Frontend:  Vanilla JS / HTML5 + existing QA-Gen AI styles
Backend:   Node.js (Express) or Python (FastAPI)
Session:   Redis (preferred) or DB-backed sessions with JWT
Database:  PostgreSQL or SQLite (for local dev)
Realtime:  WebSocket (socket.io) OR polling every 15s
Geo-IP:    ip-api.com (free) or ipinfo.io
```

### Key API Endpoints to Implement:

```
POST   /api/auth/login                → authenticate, check concurrent sessions
POST   /api/auth/logout               → invalidate own session
POST   /api/auth/logout/force         → admin: force-logout a userId
POST   /api/auth/login/confirm-takeover → user confirms session takeover
POST   /api/session/heartbeat         → keep-alive + validity check

GET    /api/admin/users               → paginated user list with live stats
GET    /api/admin/sessions/concurrent → list of currently active sessions
POST   /api/admin/users/:id/suspend   → suspend a user account

GET    /api/logs/security             → paginated audit log
GET    /api/stats/kpi                 → { registeredUsers, activeSessions, securityEvents, tokensConsumed }
```

---

## ✅ VERIFICATION TEST CASES (Claude should run these after building)

### Test Suite 1: Clean State
1. Fresh DB — User table is empty → table shows 0 rows, KPIs show 0
2. Invite user → row appears with REGISTERED date, STATUS = OFFLINE, LOCATION = `—`

### Test Suite 2: Login Flow
3. User A logs in → STATUS = ACTIVE, LOCATION = detected city, LAST SEEN = now, SESSIONS = 1
4. User A is idle for 31 minutes → STATUS changes to IDLE, SESSIONS stays 1
5. User A logs out normally → STATUS = OFFLINE, SESSIONS = 0, LOCATION = `—`

### Test Suite 3: Force Logout
6. Admin force-logs out active User A → LAST SEEN = "Forced out", STATUS = IDLE
7. User A refreshes browser within 15s → redirected to login with force-logout warning
8. Audit log contains exactly 1 FORCE_LOGOUT record with correct actor/target/timestamp

### Test Suite 4: Concurrent Login
9. User A logs in on Device 1 → active session established
10. User A tries to log in on Device 2 → modal appears BEFORE any session is created
11. User A clicks Cancel on Device 2 → Device 1 session is untouched, Device 2 stays on login page
12. User A clicks "Yes, Log Me In" on Device 2 → Device 2 gets new session, Device 1 gets invalidated
13. Device 1 refreshes → redirect to login with "accessed from another device" message
14. Audit log has 1 SESSION_TAKEOVER record

### Test Suite 5: No Junk Records
15. Delete a user from DB directly → their row disappears from admin table on next refresh
16. Corrupt/incomplete user record → row does NOT appear in the UI
17. KPI "Active Sessions" always equals the actual count of STATUS=ACTIVE rows

### Test Suite 6: Audit Log Immutability
18. Call DELETE on security_events table via app DB user → permission denied
19. All 8 event types appear in logs after triggering each action once

---

## 📋 IMPLEMENTATION ORDER (Suggested for Claude Code)

```
Phase 1 — Foundation
  [ ] Set up session store (Redis or DB table)
  [ ] Implement /api/auth/login with session creation
  [ ] Implement /api/session/heartbeat
  [ ] Implement /api/auth/logout

Phase 2 — Admin Panel Data
  [ ] Implement /api/admin/users with live stats
  [ ] Implement /api/stats/kpi
  [ ] Wire User Management table to API (replace any hardcoded data)
  [ ] Wire KPI cards to API

Phase 3 — Concurrent Sessions Sidebar
  [ ] Implement /api/admin/sessions/concurrent
  [ ] Wire sidebar with 15s polling
  [ ] Implement Force Logout endpoint + UI button

Phase 4 — Concurrent Login Conflict
  [ ] Add concurrent session detection in login flow
  [ ] Build conflict modal on frontend
  [ ] Implement /api/auth/login/confirm-takeover
  [ ] Implement displaced-session redirect with correct message

Phase 5 — Geolocation
  [ ] Add IP capture on login/heartbeat
  [ ] Integrate geolocation service
  [ ] Handle private IPs gracefully
  [ ] Surface location in table + sidebar

Phase 6 — Audit Logging
  [ ] Create security_events table (INSERT-only)
  [ ] Add log writes to all 8 event triggers
  [ ] Build Security Logs UI (read-only, paginated)
  [ ] Verify KPI "Security Events" count

Phase 7 — Verification
  [ ] Run all 19 test cases from this prompt
  [ ] Fix any failures
  [ ] Final smoke test: end-to-end concurrent login conflict flow
```

---

## 🔒 SECURITY CONSTRAINTS

1. Session tokens must be **httpOnly** cookies or Bearer tokens — never stored in localStorage
2. Force logout and suspend actions require **admin role** — enforce server-side, not just UI-hidden
3. The `/api/logs/security` endpoint is **read-only** — no POST/PUT/DELETE allowed
4. All API endpoints require **authentication** (no unauthenticated access to admin data)
5. Geolocation calls must never expose raw IPs to the frontend
6. The concurrent-login conflict modal must be rendered **before** any token is issued

---

## 💬 PROMPT INSTRUCTION FOR CLAUDE CODE (VSCode)

When using this prompt inside VSCode with Claude Code Assistant, prepend the following instruction to each task:

> "Refer to the SUPER_PROMPT_AdminCommandCenter.md file in this project. Implement [specific requirement number] exactly as specified. After implementation, run the corresponding verification checklist items and report pass/fail for each. Do not move to the next phase until all checklist items for the current phase pass."

---

*Generated for QA-Gen AI | eMudhra Admin Command Center*  
*Date: 26 June 2026*  
*(c) 2026 eMudhra. All rights reserved.*