package com.salesforce.tests;

import com.salesforce.base.BaseTest;
import com.salesforce.pages.LoginPage;
import org.testng.Assert;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;

public class InvalidLoginTest extends BaseTest {

    private LoginPage loginPage;

    @Override
    @BeforeTest
    public void setUp() {
        super.setUp();
        try {
            loginPage = new LoginPage(driver);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize InvalidLoginTest: " + e.getMessage(), e);
        }
    }

    @Test(priority = 1)
    public void verifyInvalidUsernameAndInvalidPassword() {
        try {
            loginPage.doLogin("invalid_user@nonexistent.com", "InvalidPass123!");
            Assert.assertTrue(loginPage.isErrorDisplayed(),
                    "Error message should be displayed for invalid credentials");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyInvalidUsernameAndInvalidPassword failed: " + e.getMessage());
        }
    }

    @Test(priority = 2, dependsOnMethods = "verifyInvalidUsernameAndInvalidPassword")
    public void verifyErrorMessageContent() {
        try {
            loginPage.doLogin("invalid_user@nonexistent.com", "InvalidPass123!");
            String errorText = loginPage.getErrorMessage();
            Assert.assertTrue(errorText.contains("Please check your username and password"),
                    "Error message text does not match expected. Actual: " + errorText);
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyErrorMessageContent failed: " + e.getMessage());
        }
    }

    @Test(priority = 3)
    public void verifyEmptyUsernameAndEmptyPassword() {
        try {
            loginPage.doLogin("", "");
            Assert.assertTrue(loginPage.isErrorDisplayed(),
                    "Error message should be displayed for empty credentials");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyEmptyUsernameAndEmptyPassword failed: " + e.getMessage());
        }
    }

    @Test(priority = 4)
    public void verifyValidUsernameAndEmptyPassword() {
        try {
            loginPage.doLogin("valid_user@example.com", "");
            Assert.assertTrue(loginPage.isErrorDisplayed(),
                    "Error message should be displayed for empty password");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyValidUsernameAndEmptyPassword failed: " + e.getMessage());
        }
    }

    @Test(priority = 5)
    public void verifyEmptyUsernameAndValidPassword() {
        try {
            loginPage.doLogin("", "SomePassword123!");
            Assert.assertTrue(loginPage.isErrorDisplayed(),
                    "Error message should be displayed for empty username");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyEmptyUsernameAndValidPassword failed: " + e.getMessage());
        }
    }

    @Test(priority = 6)
    public void verifySpecialCharactersInUsername() {
        try {
            loginPage.doLogin("<script>alert('xss')</script>", "TestPass123!");
            Assert.assertTrue(loginPage.isErrorDisplayed(),
                    "Error message should be displayed for special characters in username");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifySpecialCharactersInUsername failed: " + e.getMessage());
        }
    }

    @Test(priority = 7)
    public void verifySQLInjectionInUsername() {
        try {
            loginPage.doLogin("' OR '1'='1", "' OR '1'='1");
            Assert.assertTrue(loginPage.isErrorDisplayed(),
                    "Error message should be displayed for SQL injection attempt");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifySQLInjectionInUsername failed: " + e.getMessage());
        }
    }

    @Test(priority = 8)
    public void verifyExcessivelyLongUsername() {
        try {
            String longUsername = "a".repeat(500) + "@example.com";
            loginPage.doLogin(longUsername, "TestPass123!");
            Assert.assertTrue(loginPage.isErrorDisplayed(),
                    "Error message should be displayed for excessively long username");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyExcessivelyLongUsername failed: " + e.getMessage());
        }
    }

    @Test(priority = 9)
    public void verifyUrlRemainsOnLoginPageAfterFailedLogin() {
        try {
            loginPage.doLogin("invalid@test.com", "WrongPass");
            String currentUrl = loginPage.getCurrentUrl();
            Assert.assertTrue(currentUrl.contains("login.salesforce.com"),
                    "URL should remain on login page after failed login. Actual: " + currentUrl);
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyUrlRemainsOnLoginPageAfterFailedLogin failed: " + e.getMessage());
        }
    }
}
