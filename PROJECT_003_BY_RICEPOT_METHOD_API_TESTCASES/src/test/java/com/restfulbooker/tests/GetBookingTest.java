package com.restfulbooker.tests;

import com.restfulbooker.base.BaseTest;
import io.restassured.http.ContentType;
import org.testng.annotations.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

public class GetBookingTest extends BaseTest {

    @Test(priority = 6, description = "TC_006: GET /booking with no filters")
    public void testGetAllBookings() {
        given()
        .when()
            .get("/booking")
        .then()
            .statusCode(200)
            .body("$", not(emptyArray()))
            .body("[0]", hasKey("bookingid"));
    }

    @Test(priority = 7, description = "TC_007: GET /booking filtered by firstname=Jim")
    public void testGetBookingsFilterFirstName() {
        given()
            .queryParam("firstname", "Jim")
        .when()
            .get("/booking")
        .then()
            .statusCode(200)
            .body("$", instanceOf(java.util.List.class));
    }

    @Test(priority = 8, description = "TC_008: GET /booking filtered by lastname=Brown")
    public void testGetBookingsFilterLastName() {
        given()
            .queryParam("lastname", "Brown")
        .when()
            .get("/booking")
        .then()
            .statusCode(200)
            .body("$", instanceOf(java.util.List.class));
    }

    @Test(priority = 9, description = "TC_009: GET /booking filtered by checkin=2014-03-13")
    public void testGetBookingsFilterCheckin() {
        given()
            .queryParam("checkin", "2014-03-13")
        .when()
            .get("/booking")
        .then()
            .statusCode(200)
            .body("$", instanceOf(java.util.List.class));
    }

    @Test(priority = 10, description = "TC_010: GET /booking filtered by checkout=2014-05-21")
    public void testGetBookingsFilterCheckout() {
        given()
            .queryParam("checkout", "2014-05-21")
        .when()
            .get("/booking")
        .then()
            .statusCode(200); // Known Bug #4: checkout filter returns random results
    }

    @Test(priority = 11, description = "TC_011: GET /booking/{id} for a valid existing booking ID")
    public void testGetSingleBookingById() {
        given()
            .accept(ContentType.JSON)
        .when()
            .get("/booking/1")
        .then()
            .statusCode(200)
            .body("$", hasKey("firstname"))
            .body("$", hasKey("lastname"))
            .body("$", hasKey("totalprice"))
            .body("$", hasKey("depositpaid"))
            .body("$", hasKey("bookingdates"));
    }

    @Test(priority = 12, description = "TC_012: GET /booking/{id} with Accept: application/json header")
    public void testGetSingleBookingAcceptJson() {
        given()
            .accept(ContentType.JSON)
        .when()
            .get("/booking/1")
        .then()
            .statusCode(200)
            .contentType(ContentType.JSON);
    }

    @Test(priority = 13, description = "TC_013: GET /booking/{id} with Accept: application/xml header")
    public void testGetSingleBookingAcceptXml() {
        given()
            .accept(ContentType.XML)
        .when()
            .get("/booking/1")
        .then()
            .statusCode(200)
            .contentType(ContentType.XML);
    }

    @Test(priority = 14, description = "TC_014: GET /booking/{id} for a non-existent ID")
    public void testGetSingleBookingNonExistentId() {
        given()
        .when()
            .get("/booking/999999")
        .then()
            .statusCode(404);
    }
}
