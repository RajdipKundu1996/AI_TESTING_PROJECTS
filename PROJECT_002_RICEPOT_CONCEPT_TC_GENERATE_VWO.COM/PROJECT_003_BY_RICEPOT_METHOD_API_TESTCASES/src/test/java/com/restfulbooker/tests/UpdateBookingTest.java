package com.restfulbooker.tests;

import com.restfulbooker.base.BaseTest;
import com.restfulbooker.pojo.BookingDatesPojo;
import com.restfulbooker.pojo.BookingPojo;
import io.restassured.http.ContentType;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

public class UpdateBookingTest extends BaseTest {
    
    private int bookingId;

    @BeforeMethod
    public void createPreconditionBooking() {
        BookingDatesPojo dates = new BookingDatesPojo("2025-01-15", "2025-01-20");
        BookingPojo payload = new BookingPojo("James", "Brown", 150, true, dates, "Breakfast");

        bookingId = given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .body(payload)
        .when()
            .post("/booking")
        .then()
            .statusCode(200)
            .extract().path("bookingid");
    }

    @Test(priority = 20, description = "TC_020: PUT /booking/{id} with valid auth token and full payload")
    public void testFullUpdateValidToken() {
        BookingDatesPojo updatedDates = new BookingDatesPojo("2025-02-01", "2025-02-05");
        BookingPojo updatedPayload = new BookingPojo("John", "Smith", 200, false, updatedDates, "Dinner");

        given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .cookie("token", authToken)
            .body(updatedPayload)
        .when()
            .put("/booking/" + bookingId)
        .then()
            .statusCode(200)
            .body("firstname", equalTo("John"))
            .body("lastname", equalTo("Smith"))
            .body("totalprice", equalTo(200))
            .body("depositpaid", equalTo(false))
            .body("additionalneeds", equalTo("Dinner"));
    }

    @Test(priority = 21, description = "TC_021: PUT /booking/{id} with valid token, update firstname only (full body required)")
    public void testFullUpdateFirstNameOnly() {
        BookingDatesPojo dates = new BookingDatesPojo("2025-01-15", "2025-01-20");
        BookingPojo updatedPayload = new BookingPojo("UpdateName", "Brown", 150, true, dates, "Breakfast");

        given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .cookie("token", authToken)
            .body(updatedPayload)
        .when()
            .put("/booking/" + bookingId)
        .then()
            .statusCode(200)
            .body("firstname", equalTo("UpdateName"));
    }

    @Test(priority = 22, description = "TC_022: PUT /booking/{id} without any auth token")
    public void testFullUpdateWithoutToken() {
        BookingDatesPojo dates = new BookingDatesPojo("2025-01-15", "2025-01-20");
        BookingPojo updatedPayload = new BookingPojo("NoAuth", "Brown", 150, true, dates, "Breakfast");

        given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .body(updatedPayload)
        .when()
            .put("/booking/" + bookingId)
        .then()
            .statusCode(403);
    }

    @Test(priority = 23, description = "TC_023: PUT /booking/{id} with invalid/expired token")
    public void testFullUpdateWithInvalidToken() {
        BookingDatesPojo dates = new BookingDatesPojo("2025-01-15", "2025-01-20");
        BookingPojo updatedPayload = new BookingPojo("InvalidAuth", "Brown", 150, true, dates, "Breakfast");

        given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .cookie("token", "invalid12345")
            .body(updatedPayload)
        .when()
            .put("/booking/" + bookingId)
        .then()
            .statusCode(403);
    }

    @Test(priority = 24, description = "TC_024: PUT /booking/{id} for non-existent booking ID")
    public void testFullUpdateNonExistentId() {
        BookingDatesPojo dates = new BookingDatesPojo("2025-01-15", "2025-01-20");
        BookingPojo updatedPayload = new BookingPojo("Ghost", "Brown", 150, true, dates, "Breakfast");

        given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .cookie("token", authToken)
            .body(updatedPayload)
        .when()
            .put("/booking/999999")
        .then()
            .statusCode(405); // Known API behaviour
    }

    @Test(priority = 25, description = "TC_025: PATCH /booking/{id} updating only firstname")
    public void testPartialUpdateFirstName() {
        String patchPayload = "{\n    \"firstname\" : \"PatchedName\"\n}";

        given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .cookie("token", authToken)
            .body(patchPayload)
        .when()
            .patch("/booking/" + bookingId)
        .then()
            .statusCode(200)
            .body("firstname", equalTo("PatchedName"))
            .body("lastname", equalTo("Brown")); // ensure others unaffected
    }

    @Test(priority = 26, description = "TC_026: PATCH /booking/{id} updating only totalprice")
    public void testPartialUpdateTotalPrice() {
        String patchPayload = "{\n    \"totalprice\" : 999\n}";

        given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .cookie("token", authToken)
            .body(patchPayload)
        .when()
            .patch("/booking/" + bookingId)
        .then()
            .statusCode(200)
            .body("totalprice", equalTo(999));
    }

    @Test(priority = 27, description = "TC_027: PATCH /booking/{id} without any auth token")
    public void testPartialUpdateWithoutToken() {
        String patchPayload = "{\n    \"firstname\" : \"NoAuth\"\n}";

        given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .body(patchPayload)
        .when()
            .patch("/booking/" + bookingId)
        .then()
            .statusCode(403);
    }

    @Test(priority = 28, description = "TC_028: PATCH /booking/{id} with invalid token")
    public void testPartialUpdateWithInvalidToken() {
        String patchPayload = "{\n    \"firstname\" : \"InvalidAuth\"\n}";

        given()
            .contentType(ContentType.JSON)
            .accept(ContentType.JSON)
            .cookie("token", "invalid1234")
            .body(patchPayload)
        .when()
            .patch("/booking/" + bookingId)
        .then()
            .statusCode(403);
    }
}
