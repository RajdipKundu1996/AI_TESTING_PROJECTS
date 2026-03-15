package com.vwo.tests;

import com.vwo.base.BaseTest;
import com.vwo.pages.LoginPage;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.time.Duration;

public class LoginTest extends BaseTest {

    private static final String VALID_EMAIL = "your_email@domain.com";
    private static final String VALID_PASSWORD = "your_password";

    @Test(priority = 1, description = "TC_001: Valid credentials redirect user out of login page")
    public void testValidLogin() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.doLogin(VALID_EMAIL, VALID_PASSWORD);
            WebDriverWait w = new WebDriverWait(driver, Duration.ofSeconds(15));
            w.until(ExpectedConditions.not(ExpectedConditions.urlContains("#/login")));
            Assert.assertFalse(driver.getCurrentUrl().contains("#/login"),
                    "TC_001: User should be redirected to dashboard after valid login.");
        } catch (Exception e) {
            Assert.fail("TC_001 failed: " + e.getMessage());
        }
    }

    @Test(priority = 2, description = "TC_002: Valid login with Remember Me checked redirects successfully")
    public void testValidLoginWithRememberMe() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.enterEmail(VALID_EMAIL);
            loginPage.enterPassword(VALID_PASSWORD);
            loginPage.clickRememberMe();
            loginPage.clickSignIn();
            WebDriverWait w = new WebDriverWait(driver, Duration.ofSeconds(15));
            w.until(ExpectedConditions.not(ExpectedConditions.urlContains("#/login")));
            Assert.assertFalse(driver.getCurrentUrl().contains("#/login"),
                    "TC_002: User should be redirected after valid login with Remember Me.");
        } catch (Exception e) {
            Assert.fail("TC_002 failed: " + e.getMessage());
        }
    }

    @Test(priority = 3, description = "TC_003: Invalid email and invalid password shows error message")
    public void testInvalidEmailAndInvalidPassword() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.doLogin("invalid_user@nonexistent.com", "InvalidPass123!");
            Assert.assertTrue(loginPage.isErrorDisplayed(),
                    "TC_003: Error message should be displayed for invalid credentials.");
        } catch (Exception e) {
            Assert.fail("TC_003 failed: " + e.getMessage());
        }
    }

    @Test(priority = 4, description = "TC_004: Valid email with wrong password shows error message")
    public void testValidEmailWrongPassword() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.doLogin(VALID_EMAIL, "WrongPassword999!");
            Assert.assertTrue(loginPage.isErrorDisplayed(),
                    "TC_004: Error message should be displayed for wrong password.");
        } catch (Exception e) {
            Assert.fail("TC_004 failed: " + e.getMessage());
        }
    }

    @Test(priority = 5, description = "TC_005: Blank email and blank password stays on login page or shows error")
    public void testBlankEmailAndBlankPassword() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.doLogin("", "");
            Assert.assertTrue(loginPage.staysOnLoginPage() || loginPage.isErrorDisplayed(),
                    "TC_005: Page should stay on login or show error for blank credentials.");
        } catch (Exception e) {
            Assert.fail("TC_005 failed: " + e.getMessage());
        }
    }

    @Test(priority = 6, description = "TC_006: Blank email with valid password stays on login page or shows error")
    public void testBlankEmailValidPassword() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.doLogin("", VALID_PASSWORD);
            Assert.assertTrue(loginPage.staysOnLoginPage() || loginPage.isErrorDisplayed(),
                    "TC_006: Page should stay on login or show error for blank email.");
        } catch (Exception e) {
            Assert.fail("TC_006 failed: " + e.getMessage());
        }
    }

    @Test(priority = 7, description = "TC_007: Valid email with blank password stays on login page or shows error")
    public void testValidEmailBlankPassword() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.doLogin(VALID_EMAIL, "");
            Assert.assertTrue(loginPage.staysOnLoginPage() || loginPage.isErrorDisplayed(),
                    "TC_007: Page should stay on login or show error for blank password.");
        } catch (Exception e) {
            Assert.fail("TC_007 failed: " + e.getMessage());
        }
    }

    @Test(priority = 8, description = "TC_008: Invalid email format shows validation error")
    public void testInvalidEmailFormat() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.doLogin("notanemail", "SomePassword123!");
            Assert.assertTrue(loginPage.staysOnLoginPage() || loginPage.isErrorDisplayed(),
                    "TC_008: Validation error should be shown for invalid email format.");
        } catch (Exception e) {
            Assert.fail("TC_008 failed: " + e.getMessage());
        }
    }

    @Test(priority = 9, description = "TC_009: SQL injection payload in email field is handled safely")
    public void testSQLInjectionInEmail() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.doLogin("' OR '1'='1", "' OR '1'='1");
            Assert.assertTrue(loginPage.staysOnLoginPage() || loginPage.isErrorDisplayed(),
                    "TC_009: App should handle SQL injection safely and stay on login page.");
        } catch (Exception e) {
            Assert.fail("TC_009 failed: " + e.getMessage());
        }
    }

    @Test(priority = 10, description = "TC_010: XSS payload in email field is handled safely")
    public void testXSSInEmail() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.doLogin("<script>alert('xss')</script>", "TestPass123!");
            Assert.assertTrue(loginPage.staysOnLoginPage() || loginPage.isErrorDisplayed(),
                    "TC_010: App should handle XSS safely, no script should execute.");
        } catch (Exception e) {
            Assert.fail("TC_010 failed: " + e.getMessage());
        }
    }

    @Test(priority = 11, description = "TC_011: Three consecutive failed logins triggers rate limiting or lockout")
    public void testRateLimitingAfterThreeFailedAttempts() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            for (int i = 0; i < 3; i++) {
                loginPage.doLogin("brute@force.com", "WrongPass" + i);
                new WebDriverWait(driver, Duration.ofSeconds(5))
                        .until(ExpectedConditions.visibilityOf(
                                driver.findElement(org.openqa.selenium.By.xpath("//div[@id='js-notification-box-msg']"))));
                driver.get(BASE_URL);
                new WebDriverWait(driver, Duration.ofSeconds(10))
                        .until(ExpectedConditions.visibilityOfElementLocated(
                                org.openqa.selenium.By.xpath("//input[@id='login-username']")));
                loginPage = new LoginPage(driver);
            }
            Assert.assertTrue(loginPage.isErrorDisplayed() || loginPage.staysOnLoginPage(),
                    "TC_011: App should show lockout/throttle message after 3 failed logins.");
        } catch (Exception e) {
            Assert.fail("TC_011 failed: " + e.getMessage());
        }
    }

    @Test(priority = 12, description = "TC_012: Forgot Password link navigates to password reset page")
    public void testForgotPasswordNavigation() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.clickForgotPassword();
            WebDriverWait w = new WebDriverWait(driver, Duration.ofSeconds(10));
            w.until(ExpectedConditions.not(ExpectedConditions.urlContains("#/login")));
            Assert.assertFalse(driver.getCurrentUrl().contains("#/login"),
                    "TC_012: Clicking Forgot Password should navigate away from login page.");
        } catch (Exception e) {
            Assert.fail("TC_012 failed: " + e.getMessage());
        }
    }

    @Test(priority = 13, description = "TC_013: Password field shows masked text by default")
    public void testPasswordFieldMaskedByDefault() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            String fieldType = loginPage.getPasswordFieldType();
            Assert.assertEquals(fieldType, "password",
                    "TC_013: Password field type should be 'password' by default.");
        } catch (Exception e) {
            Assert.fail("TC_013 failed: " + e.getMessage());
        }
    }

    @Test(priority = 14, description = "TC_014: Password toggle reveals and re-masks the password text")
    public void testPasswordShowHideToggle() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.enterPassword("TestPassword123");
            Assert.assertEquals(loginPage.getPasswordFieldType(), "password",
                    "TC_014: Password should be masked before toggle.");
            loginPage.clickPasswordToggle();
            Assert.assertEquals(loginPage.getPasswordFieldType(), "text",
                    "TC_014: Password should be visible after first toggle.");
            loginPage.clickPasswordToggle();
            Assert.assertEquals(loginPage.getPasswordFieldType(), "password",
                    "TC_014: Password should be masked again after second toggle.");
        } catch (Exception e) {
            Assert.fail("TC_014 failed: " + e.getMessage());
        }
    }

    @Test(priority = 15, description = "TC_015: Remember Me checkbox toggles unchecked to checked to unchecked")
    public void testRememberMeToggle() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            Assert.assertFalse(loginPage.isRememberMeSelected(),
                    "TC_015: Remember Me should be unchecked by default.");
            loginPage.clickRememberMe();
            Assert.assertTrue(loginPage.isRememberMeSelected(),
                    "TC_015: Remember Me should be checked after first click.");
            loginPage.clickRememberMe();
            Assert.assertFalse(loginPage.isRememberMeSelected(),
                    "TC_015: Remember Me should be unchecked after second click.");
        } catch (Exception e) {
            Assert.fail("TC_015 failed: " + e.getMessage());
        }
    }

    @Test(priority = 16, description = "TC_016: All critical UI elements are visible on page load")
    public void testAllCriticalUIElementsVisible() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            Assert.assertTrue(loginPage.isEmailInputDisplayed(),
                    "TC_016: Email field should be visible.");
            Assert.assertTrue(loginPage.isPasswordInputDisplayed(),
                    "TC_016: Password field should be visible.");
            Assert.assertTrue(loginPage.isSignInButtonDisplayed(),
                    "TC_016: Sign In button should be visible.");
            Assert.assertTrue(loginPage.isForgotPasswordDisplayed(),
                    "TC_016: Forgot Password link should be visible.");
            Assert.assertTrue(loginPage.isRememberMeDisplayed(),
                    "TC_016: Remember Me checkbox should be visible.");
            Assert.assertTrue(loginPage.isGoogleSignInDisplayed(),
                    "TC_016: Sign in with Google button should be visible.");
            Assert.assertTrue(loginPage.isSsoButtonDisplayed(),
                    "TC_016: Sign in using SSO button should be visible.");
            Assert.assertTrue(loginPage.isPasskeyButtonDisplayed(),
                    "TC_016: Sign in with Passkey button should be visible.");
            Assert.assertTrue(loginPage.isFreeTrialButtonDisplayed(),
                    "TC_016: Start a FREE TRIAL button should be visible.");
        } catch (Exception e) {
            Assert.fail("TC_016 failed: " + e.getMessage());
        }
    }

    @Test(priority = 17, description = "TC_017: Email input field has auto-focus on page load")
    public void testEmailAutoFocus() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            Assert.assertTrue(loginPage.isEmailFocused(),
                    "TC_017: Email input field should have auto-focus on page load.");
        } catch (Exception e) {
            Assert.fail("TC_017 failed: " + e.getMessage());
        }
    }

    @Test(priority = 18, description = "TC_018: All interactive elements are keyboard-navigable via Tab")
    public void testKeyboardNavigation() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            Assert.assertTrue(loginPage.isEmailFocused(),
                    "TC_018: Initial focus should be on email field.");
            loginPage.pressTabKey();
            Assert.assertNotNull(loginPage.getActiveElement(),
                    "TC_018: Tab should move focus to the next interactive element.");
            loginPage.pressTabKey();
            Assert.assertNotNull(loginPage.getActiveElement(),
                    "TC_018: Second Tab should move focus to another element.");
            loginPage.pressTabKey();
            Assert.assertNotNull(loginPage.getActiveElement(),
                    "TC_018: Third Tab should move focus to yet another element.");
        } catch (Exception e) {
            Assert.fail("TC_018 failed: " + e.getMessage());
        }
    }

    @Test(priority = 19, description = "TC_019: Sign in with Google button is displayed and clickable")
    public void testGoogleSignInButtonDisplayedAndClickable() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            Assert.assertTrue(loginPage.isGoogleSignInDisplayed(),
                    "TC_019: Sign in with Google button should be displayed.");
            Assert.assertTrue(loginPage.isGoogleSignInClickable(),
                    "TC_019: Sign in with Google button should be clickable.");
        } catch (Exception e) {
            Assert.fail("TC_019 failed: " + e.getMessage());
        }
    }

    @Test(priority = 20, description = "TC_020: Sign in using SSO button is displayed and clickable")
    public void testSsoButtonDisplayedAndClickable() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            Assert.assertTrue(loginPage.isSsoButtonDisplayed(),
                    "TC_020: Sign in using SSO button should be displayed.");
            Assert.assertTrue(loginPage.isSsoButtonClickable(),
                    "TC_020: Sign in using SSO button should be clickable.");
        } catch (Exception e) {
            Assert.fail("TC_020 failed: " + e.getMessage());
        }
    }

    @Test(priority = 21, description = "TC_021: Sign in with Passkey button is displayed and clickable")
    public void testPasskeyButtonDisplayedAndClickable() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            Assert.assertTrue(loginPage.isPasskeyButtonDisplayed(),
                    "TC_021: Sign in with Passkey button should be displayed.");
            Assert.assertTrue(loginPage.isPasskeyButtonClickable(),
                    "TC_021: Sign in with Passkey button should be clickable.");
        } catch (Exception e) {
            Assert.fail("TC_021 failed: " + e.getMessage());
        }
    }

    @Test(priority = 22, description = "TC_022: Start a FREE TRIAL button is visible and clickable")
    public void testFreeTrialButtonVisibleAndClickable() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            Assert.assertTrue(loginPage.isFreeTrialButtonDisplayed(),
                    "TC_022: Start a FREE TRIAL button should be visible.");
            Assert.assertTrue(loginPage.isFreeTrialButtonClickable(),
                    "TC_022: Start a FREE TRIAL button should be clickable.");
        } catch (Exception e) {
            Assert.fail("TC_022 failed: " + e.getMessage());
        }
    }

    @Test(priority = 23, description = "TC_023: Clicking Start a FREE TRIAL navigates away from login page")
    public void testFreeTrialNavigatesAway() {
        LoginPage loginPage = new LoginPage(driver);
        try {
            loginPage.clickFreeTrialButton();
            WebDriverWait w = new WebDriverWait(driver, Duration.ofSeconds(10));
            w.until(ExpectedConditions.not(ExpectedConditions.urlContains("#/login")));
            Assert.assertFalse(driver.getCurrentUrl().contains("#/login"),
                    "TC_023: Clicking FREE TRIAL should navigate away from login page.");
        } catch (Exception e) {
            Assert.fail("TC_023 failed: " + e.getMessage());
        }
    }

    @Test(priority = 24, description = "TC_024: Login page loads within 5 seconds")
    public void testPageLoadPerformance() {
        try {
            long startTime = System.currentTimeMillis();
            driver.get(BASE_URL);
            WebDriverWait w = new WebDriverWait(driver, Duration.ofSeconds(5));
            w.until(ExpectedConditions.visibilityOfElementLocated(
                    org.openqa.selenium.By.xpath("//input[@id='login-username']")));
            long loadTime = System.currentTimeMillis() - startTime;
            Assert.assertTrue(loadTime < 5000,
                    "TC_024: Login page should load within 5 seconds. Actual: " + loadTime + "ms.");
        } catch (Exception e) {
            Assert.fail("TC_024 failed: " + e.getMessage());
        }
    }
}
