# Test Plan — VWO Login Page Automation
## Application Under Test: VWO (Visual Website Optimizer) Login Dashboard
## URL: https://app.vwo.com/#/login

---

## 1. Objective

Validate the VWO login page for functional correctness, security resilience, accessibility compliance (WCAG 2.1 AA), alternative authentication flows, and baseline performance using an enterprise-grade Selenium + Java + TestNG automation framework.

---

## 2. Scope

### In Scope
| Area | Coverage |
|:---|:---|
| Valid Login | Credential-based authentication, Remember Me |
| Invalid Login | Wrong credentials, blank fields, invalid format |
| Security | SQL injection, XSS, brute-force rate limiting |
| Password Management | Masking, show/hide toggle, forgot password |
| Session Management | Remember Me checkbox toggle |
| UI Verification | All critical elements visible on page load |
| Accessibility | Auto-focus, keyboard navigation (Tab traversal) |
| Alternative Login | Google OAuth, SSO (SAML/OAuth), Passkey (WebAuthn) |
| New User Onboarding | FREE TRIAL CTA visibility and navigation |
| Performance | Page load time baseline |

### Out of Scope
- Full OAuth/SSO redirect flow completion (requires third-party credentials)
- Backend API testing
- Database-level verification
- Mobile responsiveness testing
- Cross-browser testing (Chrome only in this phase)

---

## 3. Test Environment

| Component | Detail |
|:---|:---|
| Browser | Google Chrome (latest stable via WebDriverManager) |
| OS | Windows 10/11 |
| Java | JDK 11 |
| Build Tool | Maven 3.9+ |
| Test Framework | TestNG 7.10+ |
| Selenium | Selenium WebDriver 4.25+ |
| Driver Management | WebDriverManager 5.9+ |
| Design Pattern | Page Object Model with PageFactory |
| Locator Strategy | XPath only |

---

## 4. Test Cases (TC_001 – TC_024)

### Category 1 — Valid Login (PRD: Returning User Experience)

| TC ID | Test Case Description | Precondition | Test Steps | Expected Result | Priority |
|:---|:---|:---|:---|:---|:---|
| TC_001 | Valid email + valid password redirects to dashboard | User is on login page | 1. Enter valid email 2. Enter valid password 3. Click Sign In | URL no longer contains `#/login` | P1 — Critical |
| TC_002 | Valid login with Remember Me checked | User is on login page | 1. Enter valid email 2. Enter valid password 3. Check Remember Me 4. Click Sign In | Successful redirect away from login page | P2 — High |

---

### Category 2 — Invalid Login (PRD: Error Handling & User Input Validation)

| TC ID | Test Case Description | Precondition | Test Steps | Expected Result | Priority |
|:---|:---|:---|:---|:---|:---|
| TC_003 | Invalid email + invalid password | User is on login page | 1. Enter invalid email 2. Enter invalid password 3. Click Sign In | Inline error message displayed | P1 — Critical |
| TC_004 | Valid email + wrong password | User is on login page | 1. Enter valid email 2. Enter wrong password 3. Click Sign In | Inline error message displayed | P1 — Critical |
| TC_005 | Blank email + blank password | User is on login page | 1. Leave email blank 2. Leave password blank 3. Click Sign In | Stays on login page OR error shown | P2 — High |
| TC_006 | Blank email + valid password | User is on login page | 1. Leave email blank 2. Enter valid password 3. Click Sign In | Stays on login page OR error shown | P2 — High |
| TC_007 | Valid email + blank password | User is on login page | 1. Enter valid email 2. Leave password blank 3. Click Sign In | Stays on login page OR error shown | P2 — High |
| TC_008 | Invalid email format (e.g. "notanemail") | User is on login page | 1. Enter "notanemail" in email 2. Enter password 3. Click Sign In | Validation error shown | P2 — High |
| TC_009 | SQL injection payload in email | User is on login page | 1. Enter `' OR '1'='1` in email 2. Enter same in password 3. Click Sign In | App handles safely, stays on login page | P1 — Critical |
| TC_010 | XSS payload in email | User is on login page | 1. Enter `<script>alert('xss')</script>` in email 2. Click Sign In | App handles safely, no script executes | P1 — Critical |

---

### Category 3 — Security & Rate Limiting (PRD: Security Specifications)

| TC ID | Test Case Description | Precondition | Test Steps | Expected Result | Priority |
|:---|:---|:---|:---|:---|:---|
| TC_011 | Three consecutive failed logins trigger rate limiting | User is on login page | 1. Submit invalid login 3 times consecutively | Lockout/throttle message displayed | P1 — Critical |

---

### Category 4 — Password Management (PRD: Password Management)

| TC ID | Test Case Description | Precondition | Test Steps | Expected Result | Priority |
|:---|:---|:---|:---|:---|:---|
| TC_012 | Forgot Password link navigates to reset page | User is on login page | 1. Click "Forgot Password?" link | URL changes away from `#/login` | P2 — High |
| TC_013 | Password field is masked by default | User is on login page | 1. Check password field `type` attribute | Field type is `password` | P3 — Medium |
| TC_014 | Password show/hide toggle works correctly | User is on login page | 1. Enter password 2. Click toggle → type becomes `text` 3. Click toggle again → type becomes `password` | Toggle reveals and re-masks password | P2 — High |

---

### Category 5 — Remember Me (PRD: Session Management)

| TC ID | Test Case Description | Precondition | Test Steps | Expected Result | Priority |
|:---|:---|:---|:---|:---|:---|
| TC_015 | Remember Me checkbox toggles correctly | User is on login page | 1. Verify unchecked by default 2. Click → verify checked 3. Click → verify unchecked | Checkbox toggles as expected | P3 — Medium |

---

### Category 6 — UI & Accessibility (PRD: Interface Design & WCAG 2.1 AA)

| TC ID | Test Case Description | Precondition | Test Steps | Expected Result | Priority |
|:---|:---|:---|:---|:---|:---|
| TC_016 | All critical UI elements visible on page load | User is on login page | 1. Verify Email, Password, Sign In, Forgot Password, Remember Me, Google, SSO, Passkey, FREE TRIAL | All 9 elements are displayed | P1 — Critical |
| TC_017 | Email input has auto-focus on page load | User is on login page | 1. Check active element on page load | Email field is the focused element | P3 — Medium |
| TC_018 | Keyboard navigation via Tab key | User is on login page | 1. Press Tab 3 times | Focus moves across interactive elements | P2 — High |

---

### Category 7 — Alternative Login (PRD: Third-Party Services & Enterprise SSO)

| TC ID | Test Case Description | Precondition | Test Steps | Expected Result | Priority |
|:---|:---|:---|:---|:---|:---|
| TC_019 | Sign in with Google button visible and clickable | User is on login page | 1. Verify displayed 2. Verify clickable | Button is present and interactive | P2 — High |
| TC_020 | Sign in using SSO button visible and clickable | User is on login page | 1. Verify displayed 2. Verify clickable | Button is present and interactive | P2 — High |
| TC_021 | Sign in with Passkey button visible and clickable | User is on login page | 1. Verify displayed 2. Verify clickable | Button is present and interactive | P2 — High |

---

### Category 8 — New User Onboarding (PRD: New User Experience)

| TC ID | Test Case Description | Precondition | Test Steps | Expected Result | Priority |
|:---|:---|:---|:---|:---|:---|
| TC_022 | FREE TRIAL button visible and clickable | User is on login page | 1. Verify displayed 2. Verify clickable | Button is present and interactive | P2 — High |
| TC_023 | FREE TRIAL button navigates away from login page | User is on login page | 1. Click "Start a FREE TRIAL" | URL changes away from `#/login` | P2 — High |

---

### Category 9 — Performance Baseline (PRD: Performance Requirements)

| TC ID | Test Case Description | Precondition | Test Steps | Expected Result | Priority |
|:---|:---|:---|:---|:---|:---|
| TC_024 | Login page loads within 5 seconds | Browser launched | 1. Navigate to URL 2. Measure time until email field is visible | Load time < 5000ms | P3 — Medium |

---

## 5. Test Execution Summary

| Metric | Value |
|:---|:---|
| Total Test Cases | 24 |
| P1 — Critical | 7 (TC_001, TC_003, TC_004, TC_009, TC_010, TC_011, TC_016) |
| P2 — High | 12 (TC_002, TC_005–TC_008, TC_012, TC_014, TC_018–TC_023) |
| P3 — Medium | 5 (TC_013, TC_015, TC_017, TC_024) |
| Automation Tool | Selenium WebDriver 4.25 + TestNG 7.10 |
| Execution Command | `mvn test` |

---

## 6. Entry & Exit Criteria

### Entry Criteria
- VWO login page (`https://app.vwo.com/#/login`) is accessible
- Chrome browser and JDK 11 are installed
- Maven dependencies are resolved (`mvn compile` passes)
- Test credentials are configured in `LoginTest.java`

### Exit Criteria
- All 24 test cases have been executed
- All P1 (Critical) tests pass
- At least 90% of P2 (High) tests pass
- Defects are logged for any failures

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|:---|:---|:---|
| VWO changes login page DOM structure | XPath locators break | Use stable attributes (`@placeholder`, `normalize-space()`, `contains(text())`) |
| Rate limiting blocks automated tests | TC_011 and sequential tests fail | Add navigation refresh between attempts |
| CAPTCHA introduced on login page | All login tests blocked | Skip CAPTCHA-dependent tests in automated suite |
| Valid credentials expire or get locked | TC_001, TC_002, TC_004 fail | Use dedicated test account with no lockout policy |
| Network latency in CI/CD | TC_024 performance test fails | Use relaxed 5s threshold (vs 2s PRD target) |

---

## 8. Deliverables

| File | Path | Purpose |
|:---|:---|:---|
| `LoginPage.java` | `src/main/java/com/vwo/pages/` | Page Object (12 elements, 30+ methods) |
| `BaseTest.java` | `src/test/java/com/vwo/base/` | WebDriver setup/teardown |
| `LoginTest.java` | `src/test/java/com/vwo/tests/` | 24 test cases (TC_001–TC_024) |
| `pom.xml` | Project root | Maven dependencies |
| `testng.xml` | Project root | TestNG suite configuration |
| `TestPlan.md` | Project root | This document |
| `RICEPOT_PROMPT.md` | Project root | RICEPOT prompt used to generate the framework |

---

## 9. Approval

| Role | Name | Date | Status |
|:---|:---|:---|:---|
| QA Lead | | | Pending |
| Project Manager | | | Pending |
| Dev Lead | | | Pending |
