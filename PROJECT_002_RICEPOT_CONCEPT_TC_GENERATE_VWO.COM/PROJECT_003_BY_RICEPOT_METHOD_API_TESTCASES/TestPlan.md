# RICE-POT Prompt — Restful Booker API Automation Framework
## Based on: https://restful-booker.herokuapp.com/apidoc/index.html

---

## R — ROLE

You are a Senior API Test Automation Engineer with 15+ years of experience
building enterprise-grade REST API testing frameworks. You specialize in
Java, RestAssured, TestNG, and Maven. You have deep expertise in testing
RESTful CRUD APIs including authentication flows, token-based authorization,
request/response schema validation, status code verification, and negative
boundary testing.

You understand REST principles (HTTP verbs, status codes, headers,
Content-Type negotiation), JSON/XML payload validation, and API security
testing including unauthorized access and brute-force scenarios. You write
production-level automation code with zero bad practices and pinpoint
accuracy.

---

## I — INSTRUCTIONS

Generate a complete, enterprise-level REST API automation framework for the
Restful Booker API at: https://restful-booker.herokuapp.com

### Mandatory Framework Rules
- [Mandatory] Use RestAssured as the HTTP client library.
- [Mandatory] Use TestNG for test execution and assertions.
- [Mandatory] Use Maven for dependency and build management, Java 11.
- [Mandatory] Use the POJO (Plain Old Java Object) pattern for all
  request bodies and response deserialization. No raw JSON strings in tests.
- [Mandatory] Use a BaseTest class for shared setup: base URI configuration,
  RestAssured logging filters (request + response), and auth token generation.
- [Mandatory] Generate a fresh auth token in @BeforeClass using the
  /auth endpoint with credentials admin / password123 and store it as a
  protected static String field for use across all tests in the suite.
- [Mandatory] Apply TestNG annotations correctly:
    @BeforeClass  — Set RestAssured baseURI, generate and store auth token.
    @AfterClass   — Log suite completion (no driver to quit for API tests).
    @Test         — Each test case gets its own method with unique priority
                    (int) and a descriptive description (String) attribute.
- [Mandatory] All assertions must use RestAssured's .then().statusCode()
  chain combined with org.testng.Assert for field-level JSON validation.
- [Mandatory] Use Jackson (ObjectMapper) or Gson for POJO serialization /
  deserialization.
- [DoNOTuse]  Thread.sleep() anywhere in the codebase.
- [DoNOTuse]  Hardcoded JSON strings inside test methods — always use POJOs.
- [DoNOTuse]  Raw string concatenation for auth headers — use
  .cookie("token", authToken) for PUT/PATCH/DELETE as the API requires
  the Cookie header (Authorization Bearer does NOT work on this API).

### API Reference — Endpoints to Cover

**BASE URL:** https://restful-booker.herokuapp.com

┌─────────────────────────────────────────────────────────────────────┐
│ ENDPOINT 1 — Health Check                                           │
│ GET /ping                                                           │
│ Description : Confirms API is up and running                        │
│ Auth        : None                                                  │
│ Response    : 201 Created (Note: intentional quirk — 201 not 200)  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ENDPOINT 2 — CreateToken (Auth)                                     │
│ POST /auth                                                          │
│ Description : Creates an authentication token for protected calls  │
│ Auth        : None                                                  │
│ Headers     : Content-Type: application/json                        │
│ Request Body:                                                       │
│   { "username": "admin", "password": "password123" }               │
│ Response 200: { "token": "<string>" }                               │
│ Response 200 (bad creds): { "reason": "Bad credentials" }          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ENDPOINT 3 — GetBookingIds                                          │
│ GET /booking                                                        │
│ Description : Returns all booking IDs, optionally filtered          │
│ Auth        : None                                                  │
│ Optional Query Params: firstname, lastname, checkin, checkout       │
│ Response 200: [ { "bookingid": <int> }, ... ]                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ENDPOINT 4 — GetBooking                                             │
│ GET /booking/{id}                                                   │
│ Description : Returns a specific booking by ID                     │
│ Auth        : None                                                  │
│ Headers     : Accept: application/json OR Accept: application/xml  │
│ Response 200:                                                       │
│   {                                                                 │
│     "firstname"   : "string",                                       │
│     "lastname"    : "string",                                       │
│     "totalprice"  : integer,                                        │
│     "depositpaid" : boolean,                                        │
│     "bookingdates": { "checkin": "YYYY-MM-DD",                      │
│                       "checkout": "YYYY-MM-DD" },                   │
│     "additionalneeds": "string"                                     │
│   }                                                                 │
│ Response 404: "Not Found" (booking ID does not exist)              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ENDPOINT 5 — CreateBooking                                          │
│ POST /booking                                                       │
│ Description : Creates a new booking                                 │
│ Auth        : None                                                  │
│ Headers     : Content-Type: application/json                        │
│               Accept: application/json                              │
│ Request Body: same schema as GetBooking response above             │
│ Response 200:                                                       │
│   { "bookingid": <int>, "booking": { <full booking object> } }     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ENDPOINT 6 — UpdateBooking (Full Update)                            │
│ PUT /booking/{id}                                                   │
│ Description : Fully replaces an existing booking                   │
│ Auth        : Cookie: token=<token>   (NOT Authorization header)   │
│ Headers     : Content-Type: application/json                        │
│               Accept: application/json                              │
│ Request Body: same schema as CreateBooking                         │
│ Response 200: Updated booking object                                │
│ Response 403: "Forbidden" (missing or invalid token)               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ENDPOINT 7 — PartialUpdateBooking                                   │
│ PATCH /booking/{id}                                                 │
│ Description : Partially updates one or more fields of a booking    │
│ Auth        : Cookie: token=<token>   (NOT Authorization header)   │
│ Headers     : Content-Type: application/json                        │
│               Accept: application/json                              │
│ Request Body: any subset of the booking schema fields              │
│ Response 200: Updated booking object with all fields               │
│ Response 403: "Forbidden" (missing or invalid token)               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ENDPOINT 8 — DeleteBooking                                          │
│ DELETE /booking/{id}                                                │
│ Description : Deletes a booking by ID                               │
│ Auth        : Cookie: token=<token>   (NOT Authorization header)   │
│ Response 201: "Created" (intentional bug — 201 instead of 204/200) │
│ Response 403: "Forbidden" (missing or invalid token)               │
│ Response 405: "Method Not Allowed" (deleting non-existing ID bug)  │
└─────────────────────────────────────────────────────────────────────┘

### Generate the Following Test Cases

**CATEGORY 1 — HEALTH CHECK**
  TC_001 — GET /ping returns status 201
           (Note: API quirk — 201 is the designed success code here)

**CATEGORY 2 — AUTHENTICATION**
  TC_002 — POST /auth with valid credentials (admin/password123)
           → status 200, response body contains "token" field (non-null, non-empty)
  TC_003 — POST /auth with invalid username and invalid password
           → status 200, response body contains "reason": "Bad credentials"
  TC_004 — POST /auth with valid username and wrong password
           → status 200, response body contains "reason": "Bad credentials"
  TC_005 — POST /auth with empty request body
           → status 200, response body contains "reason" field

**CATEGORY 3 — GET ALL BOOKINGS**
  TC_006 — GET /booking with no filters
           → status 200, response is a non-empty JSON array,
             each element contains "bookingid" (integer)
  TC_007 — GET /booking filtered by firstname=Jim
           → status 200, returns array (may be empty — valid)
  TC_008 — GET /booking filtered by lastname=Brown
           → status 200, returns array
  TC_009 — GET /booking filtered by checkin=2014-03-13
           → status 200, returns array
  TC_010 — GET /booking filtered by checkout=2014-05-21
           → status 200, returns array
           (Known bug: checkout filter returns random results — assert
            status 200 only, add a comment noting the known defect)

**CATEGORY 4 — GET SINGLE BOOKING**
  TC_011 — GET /booking/{id} for a valid existing booking ID (use ID=1)
           → status 200, response contains all 6 fields:
             firstname, lastname, totalprice, depositpaid,
             bookingdates (checkin + checkout), additionalneeds
  TC_012 — GET /booking/{id} with Accept: application/json header
           → status 200, Content-Type response header contains
             "application/json"
  TC_013 — GET /booking/{id} with Accept: application/xml header
           → status 200, Content-Type response header contains "xml"
  TC_014 — GET /booking/{id} for a non-existent ID (e.g. 999999)
           → status 404

**CATEGORY 5 — CREATE BOOKING**
  TC_015 — POST /booking with all required fields populated
           → status 200, response contains "bookingid" (integer > 0)
             and "booking" object with all submitted field values matching
  TC_016 — POST /booking and verify the created booking can be retrieved
           via GET /booking/{bookingid} (end-to-end chain test)
  TC_017 — POST /booking with missing required field "firstname"
           → status 400 OR 500 (API does not validate well — assert
             the booking is NOT retrievable, note as known defect)
  TC_018 — POST /booking with invalid checkin date format (e.g. "13-03-2024")
           → status 400 OR 200 with default date fallback (assert and document)
  TC_019 — POST /booking with totalprice as a negative integer
           → status 200 (API accepts it), assert bookingid is returned
             and totalprice stored equals the submitted negative value

**CATEGORY 6 — UPDATE BOOKING (Full PUT)**
  TC_020 — PUT /booking/{id} with valid auth token and full updated payload
           → status 200, response body reflects all updated field values
  TC_021 — PUT /booking/{id} with valid token, update firstname only (full body still required)
           → status 200, firstname in response matches the new value
  TC_022 — PUT /booking/{id} without any auth token
           → status 403 Forbidden
  TC_023 — PUT /booking/{id} with an invalid/expired token value
           → status 403 Forbidden
  TC_024 — PUT /booking/{id} for a non-existent booking ID (valid token)
           → status 405 (known API behaviour)

**CATEGORY 7 — PARTIAL UPDATE BOOKING (PATCH)**
  TC_025 — PATCH /booking/{id} updating only firstname field
           → status 200, firstname in response equals new value,
             all other fields remain unchanged
  TC_026 — PATCH /booking/{id} updating only totalprice field
           → status 200, totalprice in response equals new value
  TC_027 — PATCH /booking/{id} without any auth token
           → status 403 Forbidden
  TC_028 — PATCH /booking/{id} with invalid token
           → status 403 Forbidden

**CATEGORY 8 — DELETE BOOKING**
  TC_029 — DELETE /booking/{id} with valid auth token on an existing booking
           → status 201 (note: known API quirk — 201 instead of 200/204)
  TC_030 — DELETE /booking/{id} then GET /booking/{id} to confirm it is gone
           → DELETE returns 201, subsequent GET returns 404 (end-to-end chain)
  TC_031 — DELETE /booking/{id} without any auth token
           → status 403 Forbidden
  TC_032 — DELETE /booking/{id} with invalid token
           → status 403 Forbidden
  TC_033 — DELETE /booking/{id} for a non-existent booking ID (valid token)
           → status 405 (known API bug — should be 404)

### Output Files Required
1. BookingPojo.java         → src/main/java/com/restfulbooker/pojo/
2. BookingDatesPojo.java    → src/main/java/com/restfulbooker/pojo/
3. AuthRequestPojo.java     → src/main/java/com/restfulbooker/pojo/
4. CreateBookingResponse.java → src/main/java/com/restfulbooker/pojo/
5. BaseTest.java            → src/test/java/com/restfulbooker/base/
6. HealthCheckTest.java     → src/test/java/com/restfulbooker/tests/
7. AuthTest.java            → src/test/java/com/restfulbooker/tests/
8. GetBookingTest.java      → src/test/java/com/restfulbooker/tests/
9. CreateBookingTest.java   → src/test/java/com/restfulbooker/tests/
10. UpdateBookingTest.java  → src/test/java/com/restfulbooker/tests/
11. DeleteBookingTest.java  → src/test/java/com/restfulbooker/tests/
12. pom.xml                 → project root
13. testng.xml              → project root

---

## C — CONTEXT

**The Application Under Test:**
Restful Booker is an intentionally bug-laden REST API designed by Mark
Winteringham as a training ground for API testing. It simulates a hotel
booking management system with full CRUD operations. The API is publicly
hosted at https://restful-booker.herokuapp.com and resets itself to its
default state every 10 minutes (10 pre-loaded booking records, IDs 1–10).

**Tech Stack of the API:**
Node.js backend, JSON primary data format, XML also supported via Accept header.

**Known Bugs in the API (to be noted in relevant test descriptions):**
  Bug #1  — GET /ping returns 201 Created instead of 200 OK
  Bug #2  — DELETE /booking/{id} returns 201 Created instead of 200/204
  Bug #3  — DELETE /booking/{non-existent-id} returns 405 instead of 404
  Bug #4  — GET /booking?checkout= filter returns random results (broken)
  Bug #5  — Authorization: Bearer header returns 403; only Cookie header works
            for PUT, PATCH, DELETE (auth design flaw)
  Bug #6  — POST /booking does not validate required fields — accepts incomplete
            payloads and may return 500 or a broken booking object
  Bug #7  — POST /booking accepts invalid date formats silently

**Authentication Mechanism:**
  Step 1: POST /auth with { "username": "admin", "password": "password123" }
  Step 2: Extract "token" string from response body
  Step 3: For PUT, PATCH, DELETE — pass the token as:
          Cookie: token=<value>   ← ONLY this works
          Authorization: Bearer <value> ← returns 403 (Bug #5)

**Request/Response Schema — BookingDates:**
  {
    "checkin"  : "YYYY-MM-DD",   // ISO 8601 date string
    "checkout" : "YYYY-MM-DD"    // ISO 8601 date string
  }

**Request/Response Schema — Booking (full object):**
  {
    "firstname"      : "string",   // required
    "lastname"       : "string",   // required
    "totalprice"     : integer,    // required, whole number
    "depositpaid"    : boolean,    // required
    "bookingdates"   : BookingDates,   // required
    "additionalneeds": "string"    // optional (e.g. "Breakfast")
  }

**CreateBooking Response wrapper:**
  {
    "bookingid" : integer,
    "booking"   : <full Booking object above>
  }

**State Management in Tests:**
  - Since the API resets every 10 minutes, tests that DELETE a booking
    must create their OWN booking first in a @BeforeMethod, store the ID
    in an instance variable, and delete that ID in the test. Never
    hard-delete pre-loaded records (IDs 1–10) as parallel tests may fail.
  - Chain tests (create → verify, delete → verify deleted) must execute
    sequentially in the same test method or use @Test dependsOnMethods.

**Test Data Defaults (use throughout the suite):**
  firstname      : "James"
  lastname       : "Brown"
  totalprice     : 150
  depositpaid    : true
  checkin        : "2025-01-15"
  checkout       : "2025-01-20"
  additionalneeds: "Breakfast"

---

## E — EXAMPLE

Follow these exact code patterns:

**POJO Example:**
```java
public class BookingPojo {
    private String firstname;
    private String lastname;
    private int totalprice;
    private boolean depositpaid;
    private BookingDatesPojo bookingdates;
    private String additionalneeds;

    // all-args constructor, no-args constructor, getters, setters
    // Use @JsonProperty("additionalneeds") if using Jackson
}
```

**BaseTest Example:**
```java
public class BaseTest {
    protected static String authToken;
    protected static final String BASE_URL = "https://restful-booker.herokuapp.com";

    @BeforeClass
    public void setUp() {
        RestAssured.baseURI = BASE_URL;
        RestAssured.filters(new RequestLoggingFilter(), new ResponseLoggingFilter());

        AuthRequestPojo authRequest = new AuthRequestPojo("admin", "password123");
        authToken = given()
            .contentType(ContentType.JSON)
            .body(authRequest)
        .when()
            .post("/auth")
        .then()
            .statusCode(200)
            .extract().path("token");
    }
}
```

**Test Method Example:**
```java
@Test(priority = 15, description = "TC_015: POST /booking with all required fields returns 200 with bookingid")
public void testCreateBookingWithAllFields() {
    BookingDatesPojo dates = new BookingDatesPojo("2025-01-15", "2025-01-20");
    BookingPojo payload = new BookingPojo("James", "Brown", 150, true, dates, "Breakfast");

    int bookingId = given()
        .contentType(ContentType.JSON)
        .accept(ContentType.JSON)
        .body(payload)
    .when()
        .post("/booking")
    .then()
        .statusCode(200)
        .body("bookingid",       notNullValue())
        .body("booking.firstname", equalTo("James"))
        .body("booking.lastname",  equalTo("Brown"))
        .body("booking.totalprice", equalTo(150))
        .extract().path("bookingid");

    Assert.assertTrue(bookingId > 0,
        "TC_015: bookingid should be a positive integer. Got: " + bookingId);
}
```

**Auth-protected request example (Cookie, NOT Bearer):**
```java
given()
    .contentType(ContentType.JSON)
    .accept(ContentType.JSON)
    .cookie("token", authToken)         // ← correct
    // .header("Authorization", "Bearer " + authToken)  // ← Bug #5: returns 403
    .body(updatedPayload)
.when()
    .put("/booking/" + bookingId)
.then()
    .statusCode(200);
```

---

## P — PARAMETERS

- Production-level code with near-zero bad practices.
- All POJOs must have: no-args constructor, all-args constructor, getters,
  setters. Jackson annotations (@JsonProperty) must be used where field
  names contain special characters or differ from Java naming conventions.
- No raw JSON strings inside test methods — always build POJOs.
- Test methods must be self-contained — create their own data when needed,
  never depend on external state except the shared authToken from BaseTest.
- Each @Test must have a unique priority integer and a human-readable
  description that includes the TC ID and endpoint.
- Assert messages must include TC ID, what was expected, and what was
  found — e.g., "TC_020: firstname should be updated to 'John'. Found: null".
- Known API bugs (listed in Context) must be referenced as inline comments
  (one line maximum) at the assertion line that tests the quirky behaviour,
  e.g.: // Known Bug #2: API returns 201 instead of 200/204 on DELETE
- pom.xml dependencies:
    RestAssured      io.rest-assured : rest-assured         : 5.4.0
    TestNG           org.testng      : testng               : 7.9.0
    Jackson          com.fasterxml.jackson.core : jackson-databind : 2.17.0
    Java             11 (source + target)
- testng.xml suite name must be "Restful Booker API Test Suite" with all
  test classes listed as separate <class> entries inside one <test> block.
- Maven Surefire plugin version 3.2.5 must reference testng.xml as the suite.

---

## O — OUTPUT

Deliver exactly 13 complete, immediately runnable files. No explanations,
no inline comments beyond the single-line known-bug callouts, no markdown
fences, no preamble, no trailing text.

  File 1 : BookingPojo.java
  File 2 : BookingDatesPojo.java
  File 3 : AuthRequestPojo.java
  File 4 : CreateBookingResponse.java
  File 5 : BaseTest.java
  File 6 : HealthCheckTest.java
  File 7 : AuthTest.java
  File 8 : GetBookingTest.java
  File 9 : CreateBookingTest.java
  File 10: UpdateBookingTest.java
  File 11: DeleteBookingTest.java
  File 12: pom.xml
  File 13: testng.xml

All files must be production-ready as delivered. No placeholder logic —
every test must contain real assertions, real HTTP calls, and real
RestAssured chains.

---

## T — TONE

Technical. Precise. Enterprise-grade. API-first. Code only.
```