package com.salesforce.pages;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class LoginPage {

    private WebDriver driver;
    private WebDriverWait wait;

    @FindBy(xpath = "//input[@id='username']")
    private WebElement usernameInput;

    @FindBy(xpath = "//input[@id='password']")
    private WebElement passwordInput;

    @FindBy(xpath = "//input[@id='Login']")
    private WebElement loginButton;

    @FindBy(xpath = "//input[@id='rememberUn']")
    private WebElement rememberMeCheckbox;

    @FindBy(xpath = "//*[@id='error']")
    private WebElement errorMessage;

    @FindBy(xpath = "//a[@id='forgot_password_link']")
    private WebElement forgotPasswordLink;

    public LoginPage(WebDriver driver) {
        try {
            this.driver = driver;
            this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
            PageFactory.initElements(driver, this);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize LoginPage: " + e.getMessage(), e);
        }
    }

    public void enterUsername(String username) {
        try {
            wait.until(ExpectedConditions.visibilityOf(usernameInput));
            usernameInput.clear();
            usernameInput.sendKeys(username);
        } catch (Exception e) {
            throw new RuntimeException("Failed to enter username: " + e.getMessage(), e);
        }
    }

    public void enterPassword(String password) {
        try {
            wait.until(ExpectedConditions.visibilityOf(passwordInput));
            passwordInput.clear();
            passwordInput.sendKeys(password);
        } catch (Exception e) {
            throw new RuntimeException("Failed to enter password: " + e.getMessage(), e);
        }
    }

    public void clickLogin() {
        try {
            wait.until(ExpectedConditions.elementToBeClickable(loginButton));
            loginButton.click();
        } catch (Exception e) {
            throw new RuntimeException("Failed to click login button: " + e.getMessage(), e);
        }
    }

    public void doLogin(String username, String password) {
        enterUsername(username);
        enterPassword(password);
        clickLogin();
    }

    public void clickRememberMe() {
        try {
            wait.until(ExpectedConditions.elementToBeClickable(rememberMeCheckbox));
            if (!rememberMeCheckbox.isSelected()) {
                rememberMeCheckbox.click();
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to click Remember Me checkbox: " + e.getMessage(), e);
        }
    }

    public boolean isRememberMeSelected() {
        try {
            return rememberMeCheckbox.isSelected();
        } catch (Exception e) {
            throw new RuntimeException("Failed to check Remember Me state: " + e.getMessage(), e);
        }
    }

    public boolean isErrorDisplayed() {
        try {
            wait.until(ExpectedConditions.visibilityOf(errorMessage));
            return errorMessage.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public String getErrorMessage() {
        try {
            wait.until(ExpectedConditions.visibilityOf(errorMessage));
            return errorMessage.getText().trim();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get error message: " + e.getMessage(), e);
        }
    }

    public String getPageTitle() {
        try {
            return driver.getTitle();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get page title: " + e.getMessage(), e);
        }
    }

    public boolean isUsernameFieldDisplayed() {
        try {
            return usernameInput.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isPasswordFieldDisplayed() {
        try {
            return passwordInput.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isLoginButtonDisplayed() {
        try {
            return loginButton.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isForgotPasswordLinkDisplayed() {
        try {
            return forgotPasswordLink.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public void clickForgotPassword() {
        try {
            wait.until(ExpectedConditions.elementToBeClickable(forgotPasswordLink));
            forgotPasswordLink.click();
        } catch (Exception e) {
            throw new RuntimeException("Failed to click Forgot Password link: " + e.getMessage(), e);
        }
    }

    public String getCurrentUrl() {
        try {
            return driver.getCurrentUrl();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get current URL: " + e.getMessage(), e);
        }
    }
}
