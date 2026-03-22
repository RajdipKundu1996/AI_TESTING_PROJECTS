# Bug Report

---

**Title:** Incorrect Error Message Displayed on Login Failure with Invalid Credentials on app.vwo.com

---

## Environment

| Field       | Details                                                           |
|-------------|-------------------------------------------------------------------|
| Application | app.vwo.com                                                       |
| Browser     | Google Chrome 146.0.7680.81 / Edge 146.0.3856.62 / Firefox 143.0 |
| OS          | Windows 10 Home Single Language (Version 22H2, Build 19041)       |
| Environment | Production (app.vwo.com)                                          |
| App Version | Not Available                                                     |

---

## Severity

**Severity:** Medium  
**Priority:** Medium

> **Reason:** The error message "You are not allowed to login" is misleading for users entering wrong credentials. It implies the account exists but is restricted, rather than indicating invalid credentials. This can confuse users and may unintentionally hint at account existence.

---

## Steps to Reproduce

1. Open a browser and navigate to **https://app.vwo.com**.
2. Enter an **invalid username** (e.g., wrong email) and an **invalid password** in the login form.
3. Click the **Submit** button.

---

## Expected Result

A clear and standard invalid credentials error message should be displayed, such as:
> *"Invalid username or password. Please try again."*

---

## Actual Result

The following error message is displayed instead:
> **"You are not allowed to login"**

This message is misleading — it suggests the user account exists but is blocked/unauthorized, rather than simply indicating that the entered credentials are wrong.

---

## Additional Observations

- A **"Remember Me"** checkbox is present on the login page.
- **Social login options** are also available on the login page.
- These features were observed during exploratory testing but are not directly related to this bug.

---

## Evidence Required

- [ ] Screenshot of the login page showing the error message after entering invalid credentials
- [ ] Screenshot of the full login form (showing "Remember Me" and social login options for context)
- [ ] Browser console logs captured at the time of the error

---

*Bug Report Created: 2026-03-19*  
*Created By: QA Engineer*  
*Source: Converted from informal notes (NOTES_FOR_BUG.MD)*
