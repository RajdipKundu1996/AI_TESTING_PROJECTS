# QA-Gen AI — Complete Authentication System Build Prompt
## Registration + Password Login + OTP Login + Profile Management
### For Claude + VS Code Development

---

## Project Overview

Build a complete **Authentication System** for **QA-Gen AI** (eMudhra's Testplan Orchestrator Cloud). The system consists of:

| Page | File | Purpose |
|---|---|---|
| Login | `index.html` | Password login + OTP login toggle |
| Register | `src/pages/register.html` | New account creation |
| Profile | `src/pages/profile.html` | View & edit user details |
| Backend | `server.js` | Express API + Excel read/write + OTP engine |
| Data Store | `UserCredentials.xlsx` | Single source of truth for all user data |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js + Express.js |
| Data Store | `UserCredentials.xlsx` via `exceljs` npm package |
| OTP Engine | In-memory OTP store (server-side Map object, no SMS gateway — log OTP to server console for local dev) |
| Validation | Client-side JS + Server-side Node.js (both layers always) |
| Notifications | CSS keyframe-animated popups (zero third-party UI libraries) |

---

## Excel Sheet Specification

**File name:** `UserCredentials.xlsx`  
**Sheet name:** `UserCredentials`  
**Auto-created** on first registration if the file does not exist.

### Columns (exact order, exact header names):

| Col | Header | Description |
|---|---|---|
| A | Serial No | Auto-incrementing integer starting at 1 |
| B | Full Name | User's full name from registration |
| C | Employee ID | Format EMU-XXXX, uppercase |
| D | Organization | "eMudhra Limited" or "External" |
| E | Official Email | Validated unique email — primary key |
| F | Mobile Number | Stored as string with country code, e.g. `+919876543210` |
| G | Password | Plain text (comment in code: replace with bcrypt for production) |
| H | Account Type | "Internal" (if @emudhra.com domain) or "External" |
| I | OTP Attempts | Integer 0–3; resets on successful OTP login |
| J | OTP Block Until | ISO timestamp of block expiry; empty string if not blocked |
| K | Registered At | ISO timestamp of account creation |
| L | Last Updated | ISO timestamp of most recent profile save |

> **Rule:** Every successful profile update must refresh column L. Every failed OTP attempt must increment column I. After 3 failed attempts, write block expiry timestamp (now + 2 minutes) to column J.

---

## Page 1 — Registration Page (`src/pages/register.html`)

### Layout
- **Left panel (40% width):** Dark navy `#0D1B2A` background, eMudhra logo card, eyebrow text "TESTPLAN ORCHESTRATOR CLOUD", headline "Join QA-Gen AI", 3-step numbered list (Fill in details → Verify identity via OTP → Sign in)
- **Right panel (60% width):** White card, eMudhra logo, orange label "ENTERPRISE WORKSPACE", heading "Create your account", subtext "All fields are required. Use your official eMudhra work email."

### Form Fields & Validations

#### Field 1 — Full Name *(required)*
- Input type: `text`
- Rule: Letters and spaces only, minimum 2 characters
- Pattern: `/^[A-Za-z\s]{2,}$/`
- Error: `"Name must contain only letters and spaces (min 2 characters)"`

#### Field 2 — Employee ID *(required)*
- Input type: `text`
- Placeholder: `EMU-XXXX`
- Rule: Must match `EMU-` followed by exactly 4 alphanumeric characters
- Pattern: `/^EMU-[A-Z0-9]{4}$/i` — auto-uppercase on input
- Error: `"Employee ID must follow the format EMU-XXXX (e.g. EMU-1234)"`

#### Field 3 — Organization *(required — `<select>` dropdown)*
- Options (in order):
  - `value=""` → `-- Select Organization --` (disabled, selected by default)
  - `value="eMudhra Limited"` → `eMudhra Limited`
  - `value="External"` → `External`
- Error: `"Please select your organization"`

#### Field 4 — Official Email *(required)*
- Input type: `email`
- Placeholder: `you@emudhra.com`
- Rule A — format: Must be a valid RFC email format
  - Error: `"Please enter a valid email address"`
- Rule B — domain based on Organization selection:
  - If Organization = `"eMudhra Limited"` → domain MUST be `@emudhra.com`
    - Error: `"Internal employees must use an @emudhra.com email"`
  - If Organization = `"External"` → domain MUST NOT be `@emudhra.com`
    - Error: `"External users cannot use an @emudhra.com email"`
- Rule C — uniqueness: Debounced API call (500ms) to `GET /api/check-email?email=xxx`
  - Error: `"An account with this email already exists"`
- When Organization dropdown changes → re-validate email field immediately

#### Field 5 — Mobile Number *(required)*
- Layout: Non-editable `+91` prefix badge + 10-digit numeric input
- Input type: `tel`, maxlength: 10
- Rule: Exactly 10 numeric digits; block non-numeric keystrokes
- Rule B — uniqueness: Debounced API call to `GET /api/check-mobile?mobile=xxx`
  - Error: `"This mobile number is already registered"`
- Error: `"Enter a valid 10-digit mobile number"`
- Stored as: `+91` + digits (e.g. `+919876543210`)

#### Field 6 — Password *(required)*
- Input type: `password` with show/hide toggle (eye icon, right side of field)
- Rules: Minimum 8 characters, must contain ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special character
- Live strength meter below field:
  - Red bar = Weak (< 2 criteria met)
  - Yellow bar = Medium (2–3 criteria met)
  - Green bar = Strong (all 4 criteria met + length ≥ 12)
- Error: `"Password must be 8+ characters with uppercase, lowercase, number, and special character"`

#### Field 7 — Confirm Password *(required)*
- Input type: `password` with show/hide toggle
- Real-time match check on `oninput`: show green checkmark icon when matching, red X when not
- Error: `"Passwords do not match"`

### Registration Form Behavior
- Validate all fields `onBlur` (individual) and re-validate all on submit click
- Valid field: green border `#16A34A` + light green background `#F0FDF4`
- Invalid field: red border `#DC2626` + light red background `#FEF2F2` + error text below
- "Create Account →" button (orange `#C94B0E`): disabled + spinner while API call in progress
- On **success** (backend returns `{ success: true }`):
  - Show "Account Created" animated popup (see Popup Specs section)
  - Auto-redirect to `../../index.html` after 2.5 seconds
- "Already have an account? **Sign in**" link → `../../index.html`

---

## Page 2 — Login Page (`index.html`)

### Layout
- **Left panel (55% width):** Light cream `#F8F7F4` background, animated decorative circles (CSS), eMudhra logo card (white, shadow), eyebrow "TESTPLAN ORCHESTRATOR CLOUD", large "QA-Gen AI" display heading, subtitle, three feature badges: RICEPOT / BLAST / XLSX
- **Right panel (45% width):** White card, top colored bar (purple left, green right), eMudhra logo, badge "SECURE WORKSPACE ACCESS" (purple), heading "Welcome back", subtext "Sign in with your eMudhra work account."

### Login Panel — Two Modes (toggle tabs inside the card)

The right card contains **two tabs** at the top:
- Tab 1: **"Password Login"** (active by default)
- Tab 2: **"Login with OTP"**

Switching tabs swaps the visible form section with a smooth CSS transition (slide/fade). The heading "Welcome back" and badge remain static.

---

### Tab 1 — Password Login

#### Fields:
1. **Work Email** — input type `email`, placeholder `you@emudhra.com`
   - Error: `"Please enter a valid email address"`
2. **Password** — input type `password`, show/hide toggle
   - Error: `"Please enter your password"`

#### Submit Button: "Sign in to workspace" (orange)

#### Login Logic — POST `/api/login`
1. Validate both fields client-side first
2. Call backend with `{ email, password }`
3. **Backend logic:**
   - Search Excel for row where Email (col E) matches
   - Not found → respond `{ success: false, error: "user_not_found" }`
   - Found but password mismatch → respond `{ success: false, error: "incorrect_password" }`
   - Match → respond `{ success: true, user: { fullName, employeeId, organization, email, mobile, accountType } }`
4. **Frontend response handling:**
   - `user_not_found` → show "User Not Found" animated popup
   - `incorrect_password` → show "Incorrect Password" animated popup
   - `success` → store user in `sessionStorage` → redirect to `src/pages/profile.html`

#### "OR CONTINUE WITH" divider below the button (as per UI)

---

### Tab 2 — Login with OTP

#### Sub-heading inside card: "← Back to Sign In" link (switches back to Tab 1)

The OTP login flow has **two steps** shown sequentially inside the same card area.

---

#### OTP Step 1 — Mobile Number Entry

**Visual:** Phone icon, heading "Login with OTP", subtext "Enter your registered mobile number"

**Field — Mobile Number** *(required)*
- Layout: Non-editable `+91` prefix badge + 10-digit numeric input
- Placeholder: `Enter 10-digit mobile number`
- Rule: Exactly 10 numeric digits; block non-numeric input
- Client-side error: `"Enter a valid 10-digit mobile number"`

**Button: "Send OTP →"** (orange, full width)

**Send OTP Button Logic — POST `/api/otp/send`**

Backend receives `{ mobile: "+91XXXXXXXXXX" }` and runs:

```
1. Search Excel for row where Mobile Number (col F) = mobile
2. If NOT found:
   → respond { success: false, error: "user_not_found" }
   → Frontend shows "User Not Found" popup

3. If found:
   a. Read OTP Attempts (col I) and OTP Block Until (col J)
   b. If block is active (Block Until timestamp > now):
      → respond { success: false, error: "account_blocked", blockedUntil: "<ISO timestamp>" }
      → Frontend shows live countdown timer (see Blocked State UI below)
   c. If attempts = 3 and block has EXPIRED:
      → Reset OTP Attempts to 0 and clear OTP Block Until in Excel
      → Continue to step d
   d. Generate 6-digit OTP (random, Math.random padded)
   e. Store OTP in server-side in-memory Map: { mobile → { otp, expiresAt: now+5min } }
   f. Log OTP to server console: console.log(`OTP for ${mobile}: ${otp}`)
   g. Respond { success: true, message: "OTP sent" }
   → Frontend transitions to OTP Step 2
```

---

#### OTP Step 2 — OTP Entry

**Visual:** Appears in place of Step 1 with a smooth fade transition. Shows mobile number partially masked (e.g. `+91 ●●●●● 43210`).

**OTP Input** — 6 individual single-character input boxes side by side
- Auto-focus next box on digit entry
- Auto-focus previous box on Backspace
- Accept digits only (0–9)
- All 6 boxes must be filled before "Verify OTP" is enabled
- Paste support: pasting a 6-digit string distributes digits across all 6 boxes

**Resend OTP link:** "Didn't receive OTP? Resend" — visible with a 30-second cooldown timer (`Resend in 0:30`) before it becomes clickable

**Button: "Verify OTP →"** (orange, full width, disabled until all 6 digits entered)

---

#### Verify OTP Logic — POST `/api/otp/verify`

Backend receives `{ mobile: "+91XXXXXXXXXX", otp: "123456" }` and runs:

```
1. Look up mobile in server-side OTP Map
2. If not found or expired:
   → respond { success: false, error: "otp_expired" }
   → Frontend shows "OTP Expired" popup

3. If found but OTP does not match:
   a. Read current OTP Attempts from Excel (col I)
   b. Increment by 1 and write back to Excel
   c. If new attempts count = 3:
      → Write block expiry (now + 2 minutes) to col J in Excel
      → Delete OTP from in-memory Map
      → respond { success: false, error: "account_blocked", blockedUntil: "<ISO timestamp>" }
      → Frontend replaces OTP step 2 with the Blocked State UI
   d. If new attempts count < 3:
      → respond { success: false, error: "incorrect_otp", attemptsLeft: 3 - newCount }
      → Frontend shows shake animation on OTP boxes + error text:
        "Incorrect OTP. X attempt(s) remaining before account is blocked."

4. If OTP matches:
   a. Delete OTP from in-memory Map
   b. Reset OTP Attempts (col I) to 0 and clear OTP Block Until (col J) in Excel
   c. Fetch user row and respond:
      { success: true, user: { fullName, employeeId, organization, email, mobile, accountType } }
   → Frontend stores user in sessionStorage → redirect to src/pages/profile.html
```

---

#### Blocked State UI (OTP Lock Screen)

When the account is blocked, replace the OTP card content with:

```
┌─────────────────────────────────────────────┐
│                                             │
│   🔴  Account Temporarily Blocked          │
│                                             │
│   Too many incorrect OTP attempts.         │
│   Your account access is locked for:       │
│                                             │
│         ┌─────────────────┐                │
│         │   00 : 01 : 47  │   ← countdown │
│         │   HH : MM : SS  │                │
│         └─────────────────┘                │
│                                             │
│   You can try again after the timer ends.  │
│                                             │
│          [← Back to Sign In]               │
│                                             │
└─────────────────────────────────────────────┘
```

**Timer implementation:**
- Receive `blockedUntil` ISO timestamp from backend
- Client-side `setInterval` every 1000ms: calculate `remainingMs = new Date(blockedUntil) - Date.now()`
- Format: always display as `HH:MM:SS` (zero-padded)
  - Hours: `Math.floor(remainingMs / 3600000).toString().padStart(2, '0')`
  - Minutes: `Math.floor((remainingMs % 3600000) / 60000).toString().padStart(2, '0')`
  - Seconds: `Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0')`
- When timer reaches `00:00:00`: clear interval, show message "Block lifted. You may try again." + show "Try Again" button that reloads Step 1
- Timer digits displayed in large monospace font (e.g. `font-family: 'Courier New', monospace; font-size: 2.5rem; font-weight: 700; color: #DC2626; letter-spacing: 0.15em`)
- Subtle pulse animation on the timer container (red glow pulsing every 1.5s)

---

## Page 3 — Profile Page (`src/pages/profile.html`)

### Header
- eMudhra logo (left) + "QA-Gen AI" text
- Right side: logged-in user's full name + circular avatar with initials (first letter of first name + first letter of last name, orange background) + "Sign Out" button

### Left Sidebar
- Large avatar circle with initials
- Full name (bold)
- Employee ID (muted)
- Account Type badge: "Internal" (green badge) or "External" (grey badge)
- Navigation links: "My Profile" (active), "Security" (scrolls to password section)

### Main Content — Profile Form

**Pre-fill all fields from Excel on page load** via `GET /api/profile?email=xxx` (email from `sessionStorage`)

#### Read-only Fields (greyed out, cursor not-allowed, visually distinct):
- Employee ID — cannot change
- Organization — shown as styled read-only badge, not a live dropdown
- Official Email — shown with lock icon, cannot change

#### Editable Fields:
- **Full Name** — same validation as registration
- **Mobile Number** — same validation as registration; uniqueness check excludes the user's own current mobile

#### Change Password Section (collapsible, toggled by "Change Password" link)
When expanded:
- **Current Password** — must match existing password in Excel; show/hide toggle
  - Error: `"Current password is incorrect"`
- **New Password** — same rules as registration; strength meter shown
- **Confirm New Password** — must match New Password

### Save Behavior
- "Save Changes" button (orange CTA) is **disabled** until any editable field is modified
- On submit:
  1. Client-side validate all visible editable fields
  2. If Change Password section is open, validate all three password fields
  3. Call `PUT /api/profile`
  4. On success: update `Last Updated` (col L) in Excel, show "Profile Updated" success popup
  5. Refresh sidebar avatar initials and header name if Full Name changed
- "Discard Changes" link resets all fields to last-saved values

### Protected Route
- On page load, check `sessionStorage.getItem('qagenUser')`
- If null or empty → immediately redirect to `../../index.html`

---

## Backend API — `server.js`

### Installation & Setup
```bash
npm init -y
npm install express cors exceljs body-parser
node server.js
# Serves all static files + API on http://127.0.0.1:3000
```

### Static File Serving
```javascript
app.use(express.static(__dirname)); // serves index.html at /
```

### In-Memory OTP Store
```javascript
// Key: mobile string ("+91XXXXXXXXXX")
// Value: { otp: "123456", expiresAt: Date (now + 5 minutes) }
const otpStore = new Map();
```

---

### API Endpoints

#### `POST /api/register`
**Body:** `{ fullName, employeeId, organization, email, mobile, password }`

**Server logic:**
1. Validate all fields (mirror all frontend rules exactly)
2. Check email uniqueness in Excel (col E)
3. Check mobile uniqueness in Excel (col F)
4. Assign Serial No = (last row serial) + 1
5. Set Account Type = "Internal" if email ends with `@emudhra.com`, else "External"
6. Append new row with all 12 columns; OTP Attempts = 0, OTP Block Until = ""
7. Save Excel file

**Response:** `{ success: true }` or `{ success: false, error: "email_exists" | "mobile_exists" | "validation_error", message: "..." }`

---

#### `GET /api/check-email?email=xxx`
- Search col E for exact match (case-insensitive)
- Response: `{ exists: true }` or `{ exists: false }`

#### `GET /api/check-mobile?mobile=xxx`
- Search col F for exact match
- Response: `{ exists: true }` or `{ exists: false }`

---

#### `POST /api/login`
**Body:** `{ email, password }`

**Server logic:**
1. Find row in Excel where col E = email (case-insensitive)
2. Not found → `{ success: false, error: "user_not_found" }`
3. Found, password mismatch → `{ success: false, error: "incorrect_password" }`
4. Match → `{ success: true, user: { fullName, employeeId, organization, email, mobile, accountType } }`

---

#### `POST /api/otp/send`
**Body:** `{ mobile }` (full string with country code, e.g. `"+919876543210"`)

**Server logic:**
1. Find row in Excel where col F = mobile
2. Not found → `{ success: false, error: "user_not_found" }`
3. Found:
   - Read col I (OTP Attempts) and col J (OTP Block Until)
   - If Block Until is non-empty AND `new Date(blockUntil) > new Date()`:
     → `{ success: false, error: "account_blocked", blockedUntil: "<ISO string>" }`
   - If attempts = 3 and block has expired: reset col I to 0, clear col J, save Excel
   - Generate OTP: `Math.floor(100000 + Math.random() * 900000).toString()`
   - Store: `otpStore.set(mobile, { otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000) })`
   - Log: `console.log(\`[OTP] Mobile: ${mobile} | OTP: ${otp} | Expires: ${expiresAt}\`)`
   - Save Excel
   - → `{ success: true, message: "OTP sent" }`

---

#### `POST /api/otp/verify`
**Body:** `{ mobile, otp }`

**Server logic:**
1. Check `otpStore.has(mobile)`:
   - Not found or `expiresAt < now` → delete from map → `{ success: false, error: "otp_expired" }`
2. Compare `otpStore.get(mobile).otp` with submitted `otp`:
   - **Mismatch:**
     - Find user row in Excel
     - Increment col I (OTP Attempts) by 1
     - If new value = 3:
       - Set col J = `new Date(Date.now() + 2 * 60 * 1000).toISOString()`
       - Delete from otpStore
       - Save Excel
       - → `{ success: false, error: "account_blocked", blockedUntil: "<ISO string>" }`
     - Else:
       - Save Excel
       - → `{ success: false, error: "incorrect_otp", attemptsLeft: 3 - newAttempts }`
   - **Match:**
     - Delete from otpStore
     - Reset col I = 0, clear col J = ""
     - Save Excel
     - → `{ success: true, user: { fullName, employeeId, organization, email, mobile, accountType } }`

---

#### `GET /api/profile?email=xxx`
- Find row by email (col E)
- Not found → `{ success: false, error: "not_found" }`
- Found → `{ success: true, user: { serialNo, fullName, employeeId, organization, email, mobile, accountType, registeredAt, lastUpdated } }` (never return password or OTP columns)

---

#### `PUT /api/profile`
**Body:** `{ email, fullName?, mobile?, currentPassword?, newPassword? }`

**Server logic:**
1. Find row by email (col E)
2. If `currentPassword` provided: verify against col G; if mismatch → `{ success: false, error: "wrong_password" }`
3. Update col B (Full Name) if provided — re-validate
4. Update col F (Mobile) if provided — re-validate + uniqueness check excluding current user's own mobile
5. If `newPassword` provided: validate strength + update col G
6. Set col L = `new Date().toISOString()`
7. Save Excel
8. → `{ success: true, user: { fullName, mobile } }` (return updated values for UI refresh)

---

## All Animated Popups Specification

All popups share this base animation:
```css
@keyframes slideInBounce {
  0%   { transform: translateY(-80px) scale(0.95); opacity: 0; }
  55%  { transform: translateY(8px) scale(1.01); opacity: 1; }
  75%  { transform: translateY(-4px) scale(1.0); }
  100% { transform: translateY(0) scale(1); }
}
@keyframes fadeOverlay {
  from { background: rgba(0,0,0,0); }
  to   { background: rgba(0,0,0,0.45); }
}
```

All popups sit centered above content with a dimmed overlay behind them.

---

### Popup 1 — "User Not Found" 🔴
**Trigger:** Email login → user_not_found, OR OTP send → user_not_found  
**Left accent border:** Red `#DC2626`

```
┌─────────────────────────────────────────┐
│  ⚠️  User Not Found                     │
│                                         │
│  No account exists for this mobile      │
│  number / email. Please create an       │
│  account first.                         │
│                                         │
│  [Create Account]      [Try Again]      │
└─────────────────────────────────────────┘
```
- Auto-dismiss: 6 seconds
- "Create Account" → `src/pages/register.html`
- "Try Again" → closes popup

---

### Popup 2 — "Incorrect Password" 🟠
**Trigger:** Password login → incorrect_password  
**Left accent border:** Orange `#C94B0E`

```
┌─────────────────────────────────────────┐
│  🔒  Incorrect Password                 │
│                                         │
│  The password you entered does not      │
│  match our records. Please try again.  │
│                                         │
│              [Try Again]                │
└─────────────────────────────────────────┘
```
- Auto-dismiss: 5 seconds

---

### Popup 3 — "Incorrect OTP" 🟠 (inline, not overlay)
**Trigger:** OTP verify → incorrect_otp  
**Style:** Red shake animation on the 6 OTP input boxes, inline error text below boxes  
**Text:** `"Incorrect OTP. X attempt(s) remaining before your account is blocked."`  
No overlay — keep the card visible so user can retry

---

### Popup 4 — "OTP Expired" 🟡
**Trigger:** OTP verify → otp_expired  
**Left accent border:** Yellow `#D97706`

```
┌─────────────────────────────────────────┐
│  ⏱️  OTP Expired                        │
│                                         │
│  Your OTP has expired (valid for        │
│  5 minutes). Please request a new one. │
│                                         │
│         [Request New OTP]               │
└─────────────────────────────────────────┘
```

---

### Popup 5 — "Account Blocked" 🔴 (overlay popup — initial block moment)
**Trigger:** attempts just reached 3 (account_blocked response)  
**Left accent border:** Deep red `#991B1B`

```
┌─────────────────────────────────────────┐
│  🚫  Account Temporarily Blocked        │
│                                         │
│  3 incorrect OTP attempts detected.     │
│  Your account is locked for 2 minutes. │
│                                         │
│         ┌───────────────┐              │
│         │  00 : 02 : 00 │              │
│         └───────────────┘              │
│                                         │
│  [Close]  — timer continues in card    │
└─────────────────────────────────────────┘
```
On close → replace OTP card content with Blocked State UI (the full countdown card described above)

---

### Popup 6 — "Account Created" ✅
**Trigger:** Successful registration  
**Left accent border:** Green `#16A34A`

```
┌─────────────────────────────────────────┐
│  ✅  Account Created Successfully!      │
│                                         │
│  Welcome to QA-Gen AI Workspace.        │
│  Redirecting to login page...          │
│                                         │
│  ██████████████████░░░░  2.5s          │
└─────────────────────────────────────────┘
```
- Progress bar fills over 2.5 seconds then redirects

---

### Popup 7 — "Profile Updated" ✅
**Trigger:** Successful profile save  
**Left accent border:** Green `#16A34A`

```
┌─────────────────────────────────────────┐
│  ✅  Profile Updated                    │
│                                         │
│  Your details have been saved and       │
│  the workspace record is updated.      │
│                                         │
│              [OK]                       │
└─────────────────────────────────────────┘
```
- Auto-dismiss: 3 seconds

---

## UI Design System

### Color Palette
```css
:root {
  --color-navy:         #0D1B2A;   /* Left panel, dark backgrounds */
  --color-orange:       #C94B0E;   /* Primary CTA buttons, accents */
  --color-orange-hover: #E8661A;   /* Button hover state */
  --color-orange-light: #FEF3EC;   /* Orange tint backgrounds */
  --color-purple:       #6B46C1;   /* "SECURE WORKSPACE ACCESS" badge */
  --color-success:      #16A34A;   /* Valid fields, success popups */
  --color-error:        #DC2626;   /* Invalid fields, error popups */
  --color-warning:      #D97706;   /* OTP expiry warnings */
  --color-white:        #FFFFFF;
  --color-bg:           #F8F7F4;   /* Page background */
  --color-text:         #1A1A2E;   /* Primary body text */
  --color-muted:        #6B7280;   /* Labels, placeholders, hints */
  --color-border:       #E5E7EB;   /* Default input borders */
  --color-card-shadow:  0 8px 32px rgba(0,0,0,0.10);
}
```

### Typography
```css
font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;

/* Eyebrow labels */   font-size: 0.70rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
/* Display heading */  font-size: clamp(2.2rem, 4vw, 3.8rem); font-weight: 900; line-height: 1.05;
/* Card heading */     font-size: 1.75rem; font-weight: 800;
/* Body */             font-size: 0.95rem; font-weight: 400; line-height: 1.65;
/* Labels */           font-size: 0.85rem; font-weight: 600;
/* OTP timer */        font-family: 'Courier New', monospace; font-size: 2.5rem; font-weight: 700; letter-spacing: 0.15em;
```

### Input Field States
```css
input, select {
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  padding: 11px 14px;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
input:focus           { border-color: #C94B0E; box-shadow: 0 0 0 3px rgba(201,75,14,0.15); }
input.valid           { border-color: #16A34A; background: #F0FDF4; }
input.invalid         { border-color: #DC2626; background: #FEF2F2; }
input:disabled,
input[readonly]       { background: #F3F4F6; color: #9CA3AF; cursor: not-allowed; }
```

### OTP Input Boxes
```css
.otp-box {
  width: 46px; height: 54px;
  text-align: center; font-size: 1.5rem; font-weight: 700;
  border: 2px solid var(--color-border); border-radius: 10px;
}
.otp-box:focus   { border-color: #C94B0E; box-shadow: 0 0 0 3px rgba(201,75,14,0.18); }
.otp-box.filled  { border-color: #16A34A; background: #F0FDF4; }
.otp-box.error   { border-color: #DC2626; background: #FEF2F2; }

@keyframes shakeOTP {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-6px); }
  40%      { transform: translateX(6px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(4px); }
}
.otp-shake { animation: shakeOTP 0.4s ease; }
```

### Tab Toggle (Password vs OTP Login)
```css
.login-tabs { display: flex; border-bottom: 2px solid var(--color-border); margin-bottom: 20px; }
.tab-btn    { flex: 1; padding: 10px; background: none; border: none; font-weight: 600;
              color: var(--color-muted); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
.tab-btn.active { color: var(--color-orange); border-bottom-color: var(--color-orange); }
```

---

## Complete Validation Rules Reference

| Field | Validation Rule | Error Message |
|---|---|---|
| Full Name | `/^[A-Za-z\s]{2,}$/` | "Name must contain only letters and spaces (min 2 characters)" |
| Employee ID | `/^EMU-[A-Z0-9]{4}$/i` | "Employee ID must follow format EMU-XXXX (e.g. EMU-1234)" |
| Organization | Must not be empty/placeholder | "Please select your organization" |
| Email — format | Valid RFC email | "Please enter a valid email address" |
| Email — eMudhra Ltd | Must end in `@emudhra.com` | "Internal employees must use an @emudhra.com email" |
| Email — External | Must NOT end in `@emudhra.com` | "External users cannot use an @emudhra.com email" |
| Email — unique | Not in Excel col E | "An account with this email already exists" |
| Mobile — format | Exactly 10 digits | "Enter a valid 10-digit mobile number" |
| Mobile — unique | Not in Excel col F | "This mobile number is already registered" |
| Mobile — OTP lookup | Must exist in Excel col F | "User Not Found — no account with this mobile" |
| Password | 8+ chars, upper+lower+digit+special | "Password must be 8+ characters with uppercase, lowercase, number, and special character" |
| Confirm Password | Exact match with Password | "Passwords do not match" |
| OTP — format | Exactly 6 digits | (all 6 boxes must be filled — button disabled otherwise) |
| OTP — expiry | Must be within 5 min of send | "OTP Expired. Please request a new one." |
| OTP — correctness | Matches server Map | "Incorrect OTP. X attempt(s) remaining before block." |
| OTP — attempts | Max 3 incorrect attempts | "Account blocked for 2 minutes. Timer: HH:MM:SS" |
| Current Password (profile) | Matches Excel col G | "Current password is incorrect" |

---

## Complete File Structure

```
qa-gen-ai/
├── index.html                  ← Login page (password + OTP tabs)
├── src/
│   └── pages/
│       ├── register.html       ← Registration page
│       └── profile.html        ← Profile management page
├── assets/
│   ├── css/
│   │   └── styles.css          ← Shared design system styles
│   └── js/
│       ├── login.js            ← Password login + OTP flow logic
│       ├── register.js         ← Registration form + validation
│       └── profile.js          ← Profile load, edit, save logic
├── server.js                   ← Express server (API + static serving)
├── UserCredentials.xlsx        ← Auto-created on first registration
└── package.json
```

---

## Excel Sheet — Sample Data

| Serial No | Full Name | Employee ID | Organization | Official Email | Mobile Number | Password | Account Type | OTP Attempts | OTP Block Until | Registered At | Last Updated |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Sahil Khan | EMU-1234 | eMudhra Limited | sahil@emudhra.com | +919876543210 | Pass@1234 | Internal | 0 | | 2026-06-26T10:30:00Z | 2026-06-26T10:30:00Z |
| 2 | Ravi Sharma | EMU-5678 | External | ravi@gmail.com | +919988776655 | Secure#99 | External | 0 | | 2026-06-26T11:00:00Z | 2026-06-26T11:00:00Z |

---

## Session & Navigation Flow

```
Register → (success popup 2.5s) → index.html (Login)
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                  [Password Login]               [OTP Login Tab]
                        │                               │
                  POST /api/login               Enter Mobile Number
                        │                               │
                 ┌──────┴──────┐              POST /api/otp/send
                 │             │                        │
           success       error popup           ┌────────┴────────┐
                 │                             │                 │
           sessionStorage               OTP sent →        Blocked? →
           + redirect to             Enter 6-digit         Show countdown
           profile.html               OTP boxes            HH:MM:SS timer
                                          │
                                 POST /api/otp/verify
                                          │
                               ┌──────────┴──────────┐
                               │                     │
                           success               error popup
                               │              (incorrect/expired/blocked)
                         sessionStorage
                         + redirect to
                         profile.html
```

---

## How to Run

```bash
# 1. Set up project
mkdir qa-gen-ai && cd qa-gen-ai

# 2. Install dependencies
npm init -y
npm install express cors exceljs body-parser

# 3. Place all files per the file structure above

# 4. Start server
node server.js

# 5. Open in browser
# → http://127.0.0.1:3000/index.html          (Login)
# → http://127.0.0.1:3000/src/pages/register.html   (Register)

# 6. Watch server console for OTP codes
# e.g. [OTP] Mobile: +919876543210 | OTP: 482916 | Expires: 2026-06-26T09:05:00.000Z
```

---

## Developer Notes

1. **OTP in production:** Replace the `console.log` OTP with a real SMS gateway (Twilio, AWS SNS, etc.) — the `otpStore` Map and all surrounding logic stays the same.
2. **Password security:** Replace plain-text password storage with `bcrypt.hash()` on register and `bcrypt.compare()` on login.
3. **HTTPS:** Run behind HTTPS in production; OTP over HTTP is insecure.
4. **Excel concurrency:** `exceljs` reads and writes the full file on each operation. For multi-user local use this is fine. For production, replace with a real database (SQLite, PostgreSQL).
5. **OTP Map persistence:** The in-memory `otpStore` is lost on server restart. In production, use Redis or a DB table.

---

*This prompt is complete and self-contained. Paste the full contents into Claude (claude.ai) or use with Claude Code in VS Code to generate the complete authentication system with all pages, validations, OTP logic, and Excel integration.*