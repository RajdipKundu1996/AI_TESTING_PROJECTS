# Feature: Mobile OTP Login with Validation, Lockout Mechanism & Countdown Timer

## Objective

Implement a secure Mobile OTP Authentication system for QA-Gen AI that provides proper validation, user feedback, account lockout protection, countdown timers, and seamless login experience.

---

# Login Flow

## Step 1: Mobile Number Entry

Display:

Mobile Number *

[ Enter Registered Mobile Number ]

[ Send OTP ]

### Validation Rules

* Accept only numeric values.
* Allow country code if required.
* Mobile number length must be exactly 10 digits (or configured country standard).
* No alphabets allowed.
* No special characters allowed.

### Real-Time Validation

If field is empty:

```text
Mobile number is required.
```

If invalid format:

```text
Please enter a valid mobile number.
```

If mobile number does not exist in system:

```text
Phone number is not registered.
Please register first or contact administrator.
```

### Button Behavior

"Send OTP" button remains disabled until:

* Valid mobile number entered.
* Number exists in registered users database.

---

# Step 2: OTP Generation

After successful mobile validation:

System should:

1. Generate secure OTP.
2. OTP must contain:

```text
6 numerical digits only
```

Example:

```text
482916
```

3. Store encrypted OTP.
4. Set expiry:

```text
5 Minutes
```

5. Send OTP to registered mobile number.

Success Message:

```text
OTP has been sent successfully.
```

---

# Step 3: OTP Input Activation

OTP field should remain hidden/disabled until OTP is generated.

After OTP generation:

Display:

```text
Enter OTP
```

[ _ _ _ _ _ _ ]

### OTP Field Rules

* Exactly 6 digits.
* Numeric only.
* No alphabets.
* No spaces.
* No special characters.
* Auto-focus next digit.
* Auto-submit after sixth digit (optional).

Invalid input message:

```text
OTP must contain exactly 6 digits.
```

---

# OTP Countdown Timer

Display immediately after OTP generation:

```text
OTP expires in 05:00
```

Live countdown:

```text
04:59
04:58
04:57
...
```

When timer reaches zero:

```text
OTP expired.
Please request a new OTP.
```

Disable Verify button.

Enable Resend OTP button.

---

# Resend OTP

Display:

```text
Resend OTP
```

Rules:

* Enabled after 30 seconds.
* Generate new OTP.
* Previous OTP becomes invalid.
* Reset countdown timer.

Message:

```text
A new OTP has been sent.
```

---

# OTP Verification

Upon clicking Verify OTP:

System validates:

* Mobile number exists.
* OTP matches.
* OTP not expired.
* User account active.
* User not locked.

If successful:

```text
OTP verified successfully.
Login successful.
Redirecting...
```

Redirect user to dashboard.

---

# Invalid OTP Handling

If entered OTP is incorrect:

Increment lock counter.

Example:

Attempt 1:

```text
Invalid OTP.
Attempts remaining: 2
```

Attempt 2:

```text
Invalid OTP.
Attempts remaining: 1
```

Attempt 3:

```text
Maximum OTP attempts exceeded.
Account temporarily locked.
```

---

# Account Lockout Policy

After 3 consecutive invalid OTP attempts:

User account enters temporary lock state.

Lock duration:

```text
2 Minutes
```

---

# Locked User Experience

Display:

```text
User is locked due to multiple invalid OTP attempts.
```

Countdown:

```text
Unlocks in 02:00
```

Live countdown:

```text
01:59
01:58
01:57
...
```

During lock:

Disable:

* Mobile Number Field
* Send OTP Button
* OTP Field
* Verify Button
* Resend OTP Button

UI should clearly indicate disabled state.

---

# Automatic Unlock

When countdown reaches zero:

Display:

```text
Account unlocked.
You may try again.
```

System automatically:

* Reset OTP attempt count.
* Enable Mobile Number field.
* Enable Send OTP button.
* Enable OTP field after new OTP generation.
* Remove lock warning.

No page refresh should be required.

---

# Session Creation After Successful Login

After OTP verification:

Create session record with:

* User ID
* User Name
* Mobile Number
* Login Time
* Browser
* Device Type
* Operating System
* IP Address
* Session Status = Active

---

# Admin Command Center Monitoring

Every OTP activity must be logged.

## Authentication Logs

Track:

* OTP Sent
* OTP Resent
* OTP Verified
* OTP Failed
* OTP Expired
* User Locked
* User Unlocked
* Login Success
* Login Failure

---

# Concurrent Session Monitoring

Display in Admin Dashboard:

| User | Mobile | Browser | Device | IP | Login Time | Status |
| ---- | ------ | ------- | ------ | -- | ---------- | ------ |

Statuses:

* Active
* Idle
* Locked
* Logged Out
* Expired

---

# Audit Log Entries

Generate immutable audit logs for:

* Mobile Number Validation
* OTP Generation
* OTP Verification
* OTP Failure
* Lock Triggered
* Unlock Triggered
* Login Success
* Logout

Include:

* Timestamp
* User ID
* Mobile Number
* Action
* Browser
* Device
* IP Address

---

# UX Requirements

* No blank screens.
* OTP section appears immediately after successful mobile validation.
* Validation messages shown inline below fields.
* Countdown updates every second.
* Buttons show loading state.
* Proper success/error toast notifications.
* Fully responsive on desktop and mobile.
* Accessibility compliant.
* Real-time status updates without page refresh.

---

# Expected Outcome

A production-ready OTP login system where:

* Registered users can authenticate using mobile OTP.
* Unregistered numbers are blocked immediately.
* OTP accepts only 6 numeric digits.
* OTP expiry is enforced.
* 3 invalid attempts trigger a 2-minute account lock.
* Lock countdown is visible in real time.
* Controls are disabled during lockout.
* Account automatically unlocks after countdown.
* All actions are logged and visible in Admin Command Center.
* Session creation and monitoring work seamlessly.