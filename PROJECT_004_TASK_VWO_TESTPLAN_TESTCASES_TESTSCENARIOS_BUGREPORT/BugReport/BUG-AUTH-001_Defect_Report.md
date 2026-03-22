# Defect Report: BUG-AUTH-001

## 1. Overview
* **Defect ID:** BUG-AUTH-001
* **Title:** Inaccurate and Generic Error Message Displayed on Invalid Login Attempt
* **Module:** Functional Authentication / Login Dashboard
* **Severity:** Medium
* **Priority:** High
* **Status:** Open
* **Date Reported:** March 22, 2026
* **Environment:** Production (`app.vwo.com`)

## 2. Defect Description
During functional authentication testing on the VWO Login Dashboard, it was observed that providing invalid credentials triggers a generic error message. When a user enters an invalid or unregistered username alongside an invalid password, the system displays the text: **"You are not allowed to login."** 

This behavior violates the Input Validation guidelines outlined in the system PRD, which explicitly require clear and actionable error messaging (e.g., "Invalid email or password.") to minimize user friction.

## 3. Pre-requisites
* The testing device must have an active internet connection.
* The user must be on the VWO Login page.

## 4. Steps to Reproduce
1. Open a web browser and navigate to the application URL: `https://app.vwo.com/login`.
2. Locate the **Email ID** input field and enter an unregistered or invalid email address (e.g., `invalid_user123@gmail.com`).
3. Locate the **Password** input field and enter any invalid alphanumeric string.
4. Click on the **"Sign in"** (or Submit) button.
5. Observe the error message prompt that appears on the screen.

## 5. Expected Result
* The system should correctly deny the authentication attempt.
* The system should display a specific, clear error message such as *"Invalid email or password."* to explicitly inform the user that their credential combination was not recognized.

## 6. Actual Result
* The system successfully prevents the login, but it displays the highly generic error message: **"You are not allowed to login."**

## 7. Impact & Risk
* **User Experience (UX):** Genuine users who accidentally mistype their credentials may be confused by the phrasing "not allowed," leading them to believe their IP is blocked or their account is banned, rather than realizing they simply made a typing mistake.
* **Business Metrics:** Increases the potential for unnecessary customer support tickets regarding account access.

## 8. Additional Context & Evidence
* The login screen features secondary elements (such as a 'Remember me' checkbox and Social/SSO Logins), which function normally, isolating this issue purely directly to the email/password credential validation check.
* **Source Reference:** Initially documented in manual testing notes (`NOTES_FOR_BUG.MD`) and tracked via Test Scenario `TC-AUTH-004`.
