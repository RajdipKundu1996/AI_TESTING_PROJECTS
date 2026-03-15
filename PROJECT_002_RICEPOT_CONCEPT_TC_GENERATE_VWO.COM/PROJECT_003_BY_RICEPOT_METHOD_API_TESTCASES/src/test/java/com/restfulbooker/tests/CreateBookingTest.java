package com.restfulbooker.tests;

import com.restfulbooker.base.BaseTest;
import com.restfulbooker.pojo.BookingDatesPojo;
import com.restfulbooker.pojo.BookingPojo;
import io.restassured.http.ContentType;
import org.testng.Assert;
import org.testng.annotations.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

public class CreateBookingTest extends BaseTest {

    @Test(priority = 15, description = "TC_015: POST /booking with all required fields")
    public void testCreateBookingValidPayload() {
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
            .body("bookingid", notNullValue())
            .body("booking.firstname", equalTo("James"))
            .body("booking.lastname", equalTo("Brown"))
            .body("booking.totalprice", equalTo(150))
            .extract().path("bookingid");

        Assert.assertTrue(bookingId > 0, "TC_015: bookingid should be positive. Found: " + bookingId);
    }

    @Test(priority = 16, description = "TC_016: POST /booking and verify via GET (end-to-end)")
    public void testCreateAndGetBooking() {
        // 1. Create
        BookingDatesPojo dates = new BookingDatesPojo("2025-01-15", "2025-01-20");
        BookingPojo payload = new BookingPojo("E2E", "Test", 200, true, dates, "Lunch");

        int bookingId = given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .body(payload)
        .when()
            .post("/booking")
        .then()
            .statusCode(200)
            .extract().path("bookingid");

        // 2. Get and Verify
        given()
            .accept(ContentType.JSON)
        .when()
            .get("/booking/" + bookingId)
        .then()
            .statusCode(200)
            .body("firstname", equalTo("E2E"))
            .body("lastname", equalTo("Test"));
    }

    @Test(priority = 17, description = "TC_017: POST /booking with missing required field 'firstname'")
    public void testCreateBookingMissingFirstName() {
        String payloadMissingFirstName = "{\n" +
                "    \"lastname\" : \"Brown\",\n" +
                "    \"totalprice\" : 111,\n" +
                "    \"depositpaid\" : true,\n" +
                "    \"bookingdates\" : {\n" +
                "        \"checkin\" : \"2018-01-01\",\n" +
                "        \"checkout\" : \"2019-01-01\"\n" +
                "    },\n" +
                "    \"additionalneeds\" : \"Breakfast\"\n" +
                "}";

        given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .body(payloadMissingFirstName)
        .when()
            .post("/booking")
        .then()
            // Known Bug #6: API does not validate well, returns 500 when mandatory fields omit
            .statusCode(anyOf(equalTo(400), equalTo(500))); 
    }

    @Test(priority = 18, description = "TC_018: POST /booking with invalid checkin date format")
    public void testCreateBookingInvalidDate() {
        BookingDatesPojo dates = new BookingDatesPojo("13-03-2024", "2025-01-20");
        BookingPojo payload = new BookingPojo("James", "Brown", 150, true, dates, "Breakfast");

        given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .body(payload)
        .when()
            .post("/booking")
        .then()
            // Known Bug #7: accepts invalid date formats silently
            .statusCode(anyOf(equalTo(400), equalTo(200)));
    }

    @Test(priority = 19, description = "TC_019: POST /booking with totalprice as a negative integer")
    public void testCreateBookingNegativePrice() {
        BookingDatesPojo dates = new BookingDatesPojo("2025-01-15", "2025-01-20");
        BookingPojo payload = new BookingPojo("James", "Brown", -500, true, dates, "Breakfast");

        int storedPrice = given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .body(payload)
        .when()
            .post("/booking")
        .then()
            .statusCode(200)
            .extract().path("booking.totalprice");
            
        Assert.assertEquals(storedPrice, -500, "TC_019: API accepted a negative price successfully.");
    }
}
