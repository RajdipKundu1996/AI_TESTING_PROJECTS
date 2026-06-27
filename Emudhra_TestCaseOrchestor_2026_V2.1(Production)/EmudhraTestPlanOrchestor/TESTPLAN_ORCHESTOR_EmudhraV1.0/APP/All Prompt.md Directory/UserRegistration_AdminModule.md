Here is a comprehensive product requirement / AI-generation prompt that you can use to enhance the QA-Gen AI platform and Admin Command Center shown in the screenshots:

---

# Prompt: Enterprise User Registration, Secure Authentication, Concurrent Session Management & Admin Monitoring

## Objective

Enhance the QA-Gen AI platform with a secure enterprise-grade User Registration, Authentication, Session Management, Token Tracking, and Admin Monitoring system integrated with the Admin Command Center.

The solution must provide complete visibility to administrators while ensuring secure access for all users.

---

# 1. User Registration Module

Create a dedicated **User Registration Page** accessible from the Login Screen.

### Registration Fields

Mandatory fields:

* Full Name
* Organization Name
* Employee ID
* Official Email ID
* Mobile Number
* Password
* Confirm Password

### Validation Rules

#### Full Name

* Minimum 3 characters
* Alphabetic characters only
* No special characters except spaces

#### Organization Name

* Minimum 2 characters
* Alphanumeric allowed

#### Employee ID

* Must be unique across the platform
* Duplicate registration should be blocked

#### Email ID

* Must be unique
* Email format validation required
* Verification email to be triggered after registration

#### Mobile Number

* Numeric only
* Country code support
* OTP-capable number
* Must be unique

#### Password

* Minimum 8 characters
* At least:

  * 1 Uppercase letter
  * 1 Lowercase letter
  * 1 Number
  * 1 Special character

### Registration Workflow

1. User submits registration form.
2. System validates all fields.
3. User account is created in "Pending Verification" status.
4. Verification email and mobile OTP are generated.
5. Upon successful verification:

   * Account status changes to Active.
   * User can login.

---

# 2. Login Module

Enhance login workflow with multi-factor authentication.

## Step 1: Enter Username

User enters:

* Email ID

or

* Employee ID

---

## Step 2: Login Method Selection

Display:

### Choose Login Method

○ Login via Email OTP

○ Login via Mobile OTP

---

## Step 3: OTP Generation

Based on user selection:

### Email OTP

* Send OTP to registered email

### Mobile OTP

* Send OTP to registered mobile number

---

## OTP Specifications

* Numeric only
* Exactly 6 digits
* Validity: 5 minutes
* One-time use only
* Resend OTP after 30 seconds
* Maximum 5 OTP attempts

Example:

```
Enter OTP
[ _ _ _ _ _ _ ]
```

---

# 3. Concurrent Session Management

Support enterprise session control.

## Registration Configuration

Allow user to select:

### Concurrent User Limit

Options:

* 1 Session
* 2 Sessions
* 3 Sessions

Maximum allowed:

```
3 concurrent active sessions
```

---

## Session Behavior

### Scenario

User logs in:

* Chrome Browser
* Edge Browser
* Firefox Browser

All 3 sessions remain active.

---

### Fourth Login Attempt

If user logs in from:

* Safari Browser

System must:

1. Identify oldest active session.
2. Automatically terminate oldest session.
3. Allow new login.
4. Create audit log.

Example:

```
Session Limit Reached.

Your oldest session has been logged out
to allow a new login.
```

---

## Real-Time Session Tracking

Capture:

* User Name
* Employee ID
* Device Type
* Browser
* Operating System
* Public IP Address
* Login Time
* Last Activity Time
* Session Status

Statuses:

* Active
* Idle
* Expired
* Logged Out
* Force Logged Out

---

# 4. Admin Command Center Enhancements

Add comprehensive monitoring capabilities.

---

## User Management Dashboard

Display:

| Field           | Value              |
| --------------- | ------------------ |
| User Name       | Dynamic            |
| Employee ID     | Dynamic            |
| Organization    | Dynamic            |
| Email           | Dynamic            |
| Phone Number    | Dynamic            |
| Status          | Active / Suspended |
| Registered Date | Dynamic            |
| Last Login      | Dynamic            |
| Active Sessions | Dynamic            |

Actions:

* View User
* Edit User
* Suspend User
* Activate User
* Reset Password
* Force Logout User

---

## Concurrent Sessions Panel

Display:

| User | Browser | Device | IP | Login Time | Status |
| ---- | ------- | ------ | -- | ---------- | ------ |

Admin actions:

* Force Logout Session
* View Session Details
* View Activity Logs

---

# 5. Token Utilization Monitoring

Track every AI operation.

## Capture

For each request:

* User ID
* User Name
* Employee ID
* Prompt Submitted
* Response Generated
* Model Used
* Input Tokens
* Output Tokens
* Total Tokens
* Processing Time
* Timestamp

---

## Token Dashboard

Show:

### Total Tokens Consumed

* Today
* Weekly
* Monthly
* Lifetime

### Top Token Consumers

Rank users based on:

* Daily usage
* Weekly usage
* Monthly usage

### Charts

Include:

* Token Usage Trend
* Department-wise Usage
* Organization-wise Usage
* User-wise Usage

---

# 6. Audit & Security Logs

Generate immutable audit records.

Capture:

### Authentication Logs

* Registration
* Login Success
* Login Failure
* OTP Verification Success
* OTP Verification Failure
* Password Reset

### Session Logs

* Session Created
* Session Expired
* Session Terminated
* Concurrent Session Replacement

### User Management Logs

* User Added
* User Modified
* User Suspended
* User Activated
* Role Changed

### AI Usage Logs

* Prompt Execution
* Token Consumption
* Export Activity
* Download Activity

---

# 7. Notifications

Generate notifications for:

### User

* Registration Success
* OTP Sent
* Login Success
* Session Terminated
* Password Reset

### Admin

* New User Registered
* High Token Consumption
* Multiple Login Failures
* Suspicious Activity
* Concurrent Session Violations

---

# 8. Database Requirements

Create tables for:

### Users

* UserID
* Name
* Organization
* EmployeeID
* Email
* Mobile
* PasswordHash
* Status
* CreatedDate

### OTP Verification

* OTPID
* UserID
* OTP
* Type (Email/Mobile)
* CreatedAt
* ExpiryAt
* Status

### User Sessions

* SessionID
* UserID
* Browser
* Device
* OS
* IPAddress
* LoginTime
* LastActivity
* Status

### Token Logs

* TokenLogID
* UserID
* Prompt
* Response
* InputTokens
* OutputTokens
* TotalTokens
* Model
* Timestamp

### Audit Logs

* AuditID
* UserID
* Action
* Details
* Timestamp

---

# Expected Outcome

Build a secure enterprise-grade authentication and monitoring system where:

* Users register using organizational credentials.
* Login requires Email OTP or Mobile OTP selection.
* OTP is strictly 6 numeric digits.
* Maximum 3 concurrent sessions per account.
* Oldest session is automatically logged out when the limit is exceeded.
* All user activities are tracked.
* Token utilization is monitored in real time.
* Admin Command Center provides complete visibility into users, sessions, security events, and AI consumption analytics.
* Every action generates audit logs for compliance and traceability.

This feature set should seamlessly integrate with the existing QA-Gen AI Login Portal and Admin Command Center UI while maintaining the current enterprise design language and user experience.