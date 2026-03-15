package com.restfulbooker.base;

import com.restfulbooker.pojo.AuthRequestPojo;
import io.restassured.RestAssured;
import io.restassured.filter.log.RequestLoggingFilter;
import io.restassured.filter.log.ResponseLoggingFilter;
import io.restassured.http.ContentType;
import org.testng.annotations.AfterSuite;
import org.testng.annotations.BeforeClass;

import static io.restassured.RestAssured.given;

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

    @AfterSuite
    public void tearDownSuite() {
        System.out.println("Restful Booker API Test Suite Execution Completed.");
    }
}
