package com.restfulbooker.tests;

import com.restfulbooker.base.BaseTest;
import org.testng.annotations.Test;

import static io.restassured.RestAssured.given;

public class HealthCheckTest extends BaseTest {

    @Test(priority = 1, description = "TC_001: GET /ping returns status 201")
    public void testHealthCheckReturns201() {
        given()
        .when()
            .get("/ping")
        .then()
            .statusCode(201); // Known Bug #1: API returns 201 instead of 200/204
    }
}
