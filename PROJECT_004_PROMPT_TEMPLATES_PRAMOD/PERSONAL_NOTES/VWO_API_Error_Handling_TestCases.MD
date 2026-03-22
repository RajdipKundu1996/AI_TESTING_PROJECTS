# API Error Handling Test Cases — VWO Login API

**Template:** Template 6 — API Error Handling Tests  
**API Under Test:** VWO Login API (`https://app.vwo.com/login`)  
**Date:** 2026-03-21  
**Source Notes:** NOTES_FOR_BUG.MD + VWO_PRD.MD  

---

## Test Cases

| Test ID | Error Scenario | Method | Trigger | Expected Code | Expected Response |
|---------|----------------|--------|---------|---------------|-------------------|
| TC-ERR-001 | Invalid username & invalid password | POST | Send `POST /login` with `{"email": "invalid@test.com", "password": "wrongPass123"}` | `401 Unauthorized` | `{"error": "Unauthorized", "message": "Invalid email or password"}` |
| TC-ERR-002 | Inaccurate error message on invalid login ⚠️ | POST | Send `POST /login` with invalid credentials — observe error message text | `401 Unauthorized` | Message must say **"Invalid email or password"** — NOT generic **"You are not allowed to login."** |
| TC-ERR-003 | Missing email field | POST | Send `POST /login` with `{"password": "somePassword"}` — no email field | `400 Bad Request` | `{"error": "Bad Request", "message": "Email is required"}` |
| TC-ERR-004 | Missing password field | POST | Send `POST /login` with `{"email": "user@vwo.com"}` — no password field | `400 Bad Request` | `{"error": "Bad Request", "message": "Password is required"}` |
| TC-ERR-005 | Empty request body | POST | Send `POST /login` with empty body `{}` | `400 Bad Request` | `{"error": "Bad Request", "message": "Missing required fields: email, password"}` |
| TC-ERR-006 | Malformed JSON body | POST | Send `POST /login` with invalid JSON string | `400 Bad Request` | `{"error": "Bad Request", "message": "Invalid JSON format"}` |
| TC-ERR-007 | Invalid email format | POST | Send `"email": "notanemail"` (missing @ and domain) | `400 Bad Request` | `{"error": "Bad Request", "message": "Invalid email format"}` |
| TC-ERR-008 | Valid email, empty password string | POST | Send `{"email": "user@vwo.com", "password": ""}` | `400 Bad Request` | `{"error": "Bad Request", "message": "Password cannot be empty"}` |
| TC-ERR-009 | Login without auth token (protected route) | GET | Send `GET /dashboard` — no session/auth token | `401 Unauthorized` | `{"error": "Unauthorized", "message": "Authentication required"}` |
| TC-ERR-010 | Login with expired session token | GET | Send request with an expired cookie/token | `401 Unauthorized` | `{"error": "Unauthorized", "message": "Session expired. Please log in again."}` |
| TC-ERR-011 | Brute force — too many failed attempts | POST | Send `POST /login` with wrong credentials 5+ times in a row | `429 Too Many Requests` | `{"error": "Too Many Requests", "message": "Account temporarily locked. Try again later."}` |
| TC-ERR-012 | Unsupported Content-Type | POST | Send `POST /login` with `Content-Type: text/plain` | `415 Unsupported Media Type` | `{"error": "Unsupported Media Type", "message": "Use application/json"}` |
| TC-ERR-013 | Method not allowed | GET | Send `GET /login` (login endpoint only accepts POST) | `405 Method Not Allowed` | `{"error": "Method Not Allowed", "message": "GET not supported on /login"}` |
| TC-ERR-014 | Payload too large | POST | Send `POST /login` with extremely large values in body | `413 Payload Too Large` | `{"error": "Payload Too Large", "message": "Request body exceeds size limit"}` |
| TC-ERR-015 | Stack trace exposed in error response | POST | Trigger any 4xx/5xx error and inspect response body | Any 4xx/5xx | Response must NOT contain stack traces or internal server paths |
| TC-ERR-016 | Service unavailable | POST | Simulate server downtime / send request when backend is offline | `503 Service Unavailable` | `{"error": "Service Unavailable", "message": "Try again later"}` |
| TC-ERR-017 | Social login failure — provider error | POST | Trigger Google/Microsoft SSO with invalid OAuth token | `401 Unauthorized` | `{"error": "Unauthorized", "message": "Social login failed. Please try again."}` |

---

## Summary

| Category | Test IDs | Count |
|----------|----------|-------|
| Inaccurate Error Message — Bug ⚠️ | TC-ERR-002 | 1 |
| Invalid Credentials (401) | TC-ERR-001 | 1 |
| Missing / Bad Input (400) | TC-ERR-003 to TC-ERR-008 | 6 |
| Auth / Session Issues (401) | TC-ERR-009 to TC-ERR-010 | 2 |
| Rate Limiting / Brute Force (429) | TC-ERR-011 | 1 |
| Media Type / Method Errors | TC-ERR-012 to TC-ERR-013 | 2 |
| Payload / Server Errors | TC-ERR-014 to TC-ERR-016 | 3 |
| Social Login Errors | TC-ERR-017 | 1 |
| **Total** | | **17** |

---

> ⚠️ **TC-ERR-002** covers the bug noted in informal notes (`NOTES_FOR_BUG.MD`): When a user enters an **invalid username and invalid password** on `app.vwo.com` and clicks Submit, the API returns the generic message **"You are not allowed to login."**  
> This message does not clearly indicate whether the email or password is wrong, or whether the account exists — violating clear and actionable error message requirements defined in the VWO PRD (Input Validation section).

---

> 📝 **Additional Observations from Notes (NOTES_FOR_BUG.MD):**  
> - A **"Remember Me"** checkbox is present on the login page — should be tested separately (TC covers session token expiry in TC-ERR-010)  
> - **Social login options** (Google, Microsoft) are visible — covered in TC-ERR-017  

---

*Created By: QA Engineer | Source: Template 6 + NOTES_FOR_BUG.MD + VWO_PRD.MD*
