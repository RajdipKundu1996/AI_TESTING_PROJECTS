package com.restfulbooker.tests;

import com.restfulbooker.base.BaseTest;
import com.restfulbooker.pojo.AuthRequestPojo;
import io.restassured.http.ContentType;
import org.testng.annotations.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

public class AuthTest extends BaseTest {

    @Test(priority = 2, description = "TC_002: POST /auth with valid credentials")
    public void testAuthValidCredentials() {
        AuthRequestPojo payload = new AuthRequestPojo("admin", "password123");

        given()
            .contentType(ContentType.JSON)
            .body(payload)
        .when()
            .post("/auth")
        .then()
            .statusCode(200)
            .body("token", notNullValue())
            .body("token", not(emptyString()));
    }

    @Test(priority = 3, description = "TC_003: POST /auth with invalid username and password")
    public void testAuthInvalidCredentials() {
        AuthRequestPojo payload = new AuthRequestPojo("invalid", "wrongpass");

        given()
            .contentType(ContentType.JSON)
            .body(payload)
        .when()
            .post("/auth")
        .then()
            .statusCode(200)
            .body("reason", equalTo("Bad credentials"));
    }

    @Test(priority = 4, description = "TC_004: POST /auth with valid username and wrong password")
    public void testAuthWrongPassword() {
        AuthRequestPojo payload = new AuthRequestPojo("admin", "wrongpass");

        given()
            .contentType(ContentType.JSON)
            .body(payload)
        .when()
            .post("/auth")
        .then()
            .statusCode(200)
            .body("reason", equalTo("Bad credentials"));
    }

    @Test(priority = 5, description = "TC_005: POST /auth with empty request body")
    public void testAuthEmptyBody() {
        given()
            .contentType(ContentType.JSON)
            .body("{}")
        .when()
            .post("/auth")
        .then()
            .statusCode(200)
            .body("reason", equalTo("Bad credentials"));
    }
}
