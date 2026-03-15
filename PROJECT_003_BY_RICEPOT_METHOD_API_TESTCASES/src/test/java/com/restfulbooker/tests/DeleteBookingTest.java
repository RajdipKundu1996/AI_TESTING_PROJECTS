package com.restfulbooker.tests;

import com.restfulbooker.base.BaseTest;
import com.restfulbooker.pojo.BookingDatesPojo;
import com.restfulbooker.pojo.BookingPojo;
import io.restassured.http.ContentType;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import static io.restassured.RestAssured.given;

public class DeleteBookingTest extends BaseTest {

    private int bookingId;

    @BeforeMethod
    public void createPreconditionBooking() {
        BookingDatesPojo dates = new BookingDatesPojo("2025-01-15", "2025-01-20");
        BookingPojo payload = new BookingPojo("DeleteTest", "User", 100, true, dates, "None");

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

    @Test(priority = 29, description = "TC_029: DELETE /booking/{id} with valid auth token")
    public void testDeleteValidToken() {
        given()
            .cookie("token", authToken)
        .when()
            .delete("/booking/" + bookingId)
        .then()
            .statusCode(201); // Known Bug #2: API returns 201 instead of 200/204 on DELETE
    }

    @Test(priority = 30, description = "TC_030: DELETE /booking/{id} then GET to confirm removal")
    public void testDeleteAndConfirmViaGet() {
        // 1. Delete
        given()
            .cookie("token", authToken)
        .when()
            .delete("/booking/" + bookingId)
        .then()
            .statusCode(201);
            
        // 2. Confirm 404
        given()
        .when()
            .get("/booking/" + bookingId)
        .then()
            .statusCode(404);
    }

    @Test(priority = 31, description = "TC_031: DELETE /booking/{id} without any auth token")
    public void testDeleteWithoutToken() {
        given()
        .when()
            .delete("/booking/" + bookingId)
        .then()
            .statusCode(403);
    }

    @Test(priority = 32, description = "TC_032: DELETE /booking/{id} with invalid token")
    public void testDeleteWithInvalidToken() {
        given()
            .cookie("token", "invalid999")
        .when()
            .delete("/booking/" + bookingId)
        .then()
            .statusCode(403);
    }

    @Test(priority = 33, description = "TC_033: DELETE /booking/{id} for non-existent ID")
    public void testDeleteNonExistentId() {
        given()
            .cookie("token", authToken)
        .when()
            .delete("/booking/999999")
        .then()
            .statusCode(405); // Known Bug #3: API returns 405 instead of 404
    }
}
