package com.salesforce.tests;

import com.salesforce.base.BaseTest;
import com.salesforce.pages.LoginPage;
import org.testng.Assert;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;

public class ValidLoginTest extends BaseTest {

    private LoginPage loginPage;

    @Override
    @BeforeTest
    public void setUp() {
        super.setUp();
        try {
            loginPage = new LoginPage(driver);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize ValidLoginTest: " + e.getMessage(), e);
        }
    }

    @Test(priority = 1)
    public void verifyLoginPageTitle() {
        try {
            String title = loginPage.getPageTitle();
            Assert.assertTrue(title.contains("Login") || title.contains("Salesforce"),
                    "Login page title does not contain expected text. Actual: " + title);
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyLoginPageTitle failed: " + e.getMessage());
        }
    }

    @Test(priority = 2)
    public void verifyUsernameFieldPresent() {
        try {
            Assert.assertTrue(loginPage.isUsernameFieldDisplayed(),
                    "Username field is not displayed on the login page");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyUsernameFieldPresent failed: " + e.getMessage());
        }
    }

    @Test(priority = 3)
    public void verifyPasswordFieldPresent() {
        try {
            Assert.assertTrue(loginPage.isPasswordFieldDisplayed(),
                    "Password field is not displayed on the login page");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyPasswordFieldPresent failed: " + e.getMessage());
        }
    }

    @Test(priority = 4)
    public void verifyLoginButtonPresent() {
        try {
            Assert.assertTrue(loginPage.isLoginButtonDisplayed(),
                    "Login button is not displayed on the login page");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyLoginButtonPresent failed: " + e.getMessage());
        }
    }

    @Test(priority = 5)
    public void verifyForgotPasswordLinkPresent() {
        try {
            Assert.assertTrue(loginPage.isForgotPasswordLinkDisplayed(),
                    "Forgot Password link is not displayed on the login page");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyForgotPasswordLinkPresent failed: " + e.getMessage());
        }
    }

    @Test(priority = 6)
    public void verifyRememberMeCheckboxDefault() {
        try {
            Assert.assertFalse(loginPage.isRememberMeSelected(),
                    "Remember Me checkbox should not be selected by default");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyRememberMeCheckboxDefault failed: " + e.getMessage());
        }
    }

    @Test(priority = 7)
    public void verifyRememberMeCheckboxToggle() {
        try {
            loginPage.clickRememberMe();
            Assert.assertTrue(loginPage.isRememberMeSelected(),
                    "Remember Me checkbox should be selected after clicking");
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyRememberMeCheckboxToggle failed: " + e.getMessage());
        }
    }

    @Test(priority = 8)
    public void verifyLoginPageUrl() {
        try {
            String currentUrl = loginPage.getCurrentUrl();
            Assert.assertTrue(currentUrl.contains("login.salesforce.com"),
                    "URL does not contain login.salesforce.com. Actual: " + currentUrl);
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyLoginPageUrl failed: " + e.getMessage());
        }
    }

    @Test(priority = 9)
    public void verifyValidLoginAttempt() {
        try {
            loginPage.doLogin("your_valid_username@example.com", "YourValidPassword");
            String currentUrl = loginPage.getCurrentUrl();
            Assert.assertFalse(currentUrl.contains("login.salesforce.com"),
                    "User should be redirected after valid login. Current URL: " + currentUrl);
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Assert.fail("verifyValidLoginAttempt failed: " + e.getMessage());
        }
    }
}
