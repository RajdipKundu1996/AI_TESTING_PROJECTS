# API Error Handling Test Cases — RESTful Booker API

**Template:** Template 6 — API Error Handling Tests  
**API Under Test:** RESTful Booker API (`https://restful-booker.herokuapp.com`)  
**Date:** 2026-03-19  

---

## Test Cases

| Test ID | Error Scenario | Method | Trigger | Expected Code | Expected Response |
|---------|----------------|--------|---------|---------------|-------------------|
| TC-ERR-001 | Missing required fields | POST | Send `POST /booking` with empty body `{}` | `400 Bad Request` | `{"error": "Bad Request", "message": "Missing required fields"}` |
| TC-ERR-002 | Malformed JSON body | POST | Send `POST /booking` with invalid JSON | `400 Bad Request` | `{"error": "Bad Request", "message": "Invalid JSON format"}` |
| TC-ERR-003 | Wrong data type for `totalprice` | POST | Send `"totalprice": "abc"` (string instead of number) | `400 Bad Request` | `{"error": "Bad Request", "message": "Invalid data type: totalprice"}` |
| TC-ERR-004 | Invalid date format | POST | Send `"checkin": "32-13-9999"` in bookingdates | `400 Bad Request` | `{"error": "Bad Request", "message": "Invalid date format"}` |
| TC-ERR-005 | Booking not found | GET | Send `GET /booking/999999` (non-existent ID) | `404 Not Found` | `{"error": "Not Found", "message": "Booking not found"}` |
| TC-ERR-006 | Booking not found on update | PUT | Send `PUT /booking/999999` with valid body | `404 Not Found` | `{"error": "Not Found", "message": "Booking not found"}` |
| TC-ERR-007 | DELETE without auth token | DELETE | Send `DELETE /booking/1` — no auth header | `403 Forbidden` | `{"error": "Forbidden", "message": "Authentication required"}` |
| TC-ERR-008 | PUT without auth token | PUT | Send `PUT /booking/1` — no auth header | `403 Forbidden` | `{"error": "Forbidden", "message": "Authentication required"}` |
| TC-ERR-009 | Invalid auth token | DELETE | Send `Cookie: token=INVALID123` | `403 Forbidden` | `{"error": "Forbidden", "message": "Invalid or expired token"}` |
| TC-ERR-010 | Method not allowed | POST | Send `POST /booking/1` (unsupported on this route) | `405 Method Not Allowed` | `{"error": "Method Not Allowed", "message": "POST not supported here"}` |
| TC-ERR-011 | Inaccurate error message on POST ⚠️ | POST | Send partial valid data, observe error message text | `400 Bad Request` | Message must clearly state which field is invalid — no generic errors |
| TC-ERR-012 | Payload too large | POST | Send extremely large string values in body | `413 Payload Too Large` | `{"error": "Payload Too Large", "message": "Body exceeds size limit"}` |
| TC-ERR-013 | Unsupported Content-Type | POST | Send with `Content-Type: text/plain` | `415 Unsupported Media Type` | `{"error": "Unsupported Media Type", "message": "Use application/json"}` |
| TC-ERR-014 | Service unavailable | GET | Simulate server downtime | `503 Service Unavailable` | `{"error": "Service Unavailable", "message": "Try again later"}` |
| TC-ERR-015 | Stack trace exposed in error | POST | Trigger any 4xx/5xx error and inspect response | Any 4xx/5xx | Response must NOT contain stack traces or internal server info |

---

## Summary

| Category | Test IDs | Count |
|----------|----------|-------|
| Client Errors — Bad Input (4xx) | TC-ERR-001 to 004 | 4 |
| Not Found (404) | TC-ERR-005 to 006 | 2 |
| Auth / Forbidden (403) | TC-ERR-007 to 009 | 3 |
| Method Not Allowed (405) | TC-ERR-010 | 1 |
| Inaccurate Error Message (Bug) ⚠️ | TC-ERR-011 | 1 |
| Payload / Media Type Issues | TC-ERR-012 to 013 | 2 |
| Server Errors (5xx) | TC-ERR-014 to 015 | 2 |
| **Total** | | **15** |

---

> ⚠️ **TC-ERR-011** covers the bug noted in informal notes: POST request returns an inaccurate/misleading error message.

*Created By: QA Engineer | Source: Template 6 + NOTES_FOR_BUG.MD*
