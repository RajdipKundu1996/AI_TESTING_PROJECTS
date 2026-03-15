package com.vwo.pages;

import org.openqa.selenium.Keys;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class LoginPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    @FindBy(xpath = "//input[@id='login-username']")
    private WebElement emailInput;

    @FindBy(xpath = "//input[@id='login-password']")
    private WebElement passwordInput;

    @FindBy(xpath = "//button[@id='js-login-btn']")
    private WebElement signInButton;

    @FindBy(xpath = "//button[contains(text(), 'Forgot Password?')]")
    private WebElement forgotPasswordLink;

    @FindBy(xpath = "//input[@id='checkbox-remember']")
    private WebElement rememberMeCheckbox;

    @FindBy(xpath = "//span[contains(text(), 'Remember me')]")
    private WebElement rememberMeLabel;

    @FindBy(xpath = "//button[@id='js-google-signin-btn']")
    private WebElement googleSignInButton;

    @FindBy(xpath = "//button[span[contains(text(), 'Sign in using SSO')]]")
    private WebElement ssoButton;

    @FindBy(xpath = "//button[span[contains(text(), 'Sign in with Passkey')]]")
    private WebElement passkeyButton;

    @FindBy(xpath = "//a[span[contains(text(), 'Start a FREE TRIAL')]]")
    private WebElement freeTrialButton;

    @FindBy(xpath = "//div[@id='js-notification-box-msg']")
    private WebElement errorMessage;

    @FindBy(xpath = "//button[@aria-label='Toggle password visibility']")
    private WebElement passwordToggle;

    public LoginPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        PageFactory.initElements(driver, this);
    }

    public void enterEmail(String email) {
        wait.until(ExpectedConditions.visibilityOf(emailInput));
        emailInput.clear();
        emailInput.sendKeys(email);
    }

    public void enterPassword(String password) {
        wait.until(ExpectedConditions.visibilityOf(passwordInput));
        passwordInput.clear();
        passwordInput.sendKeys(password);
    }

    public void clickSignIn() {
        wait.until(ExpectedConditions.elementToBeClickable(signInButton));
        signInButton.click();
    }

    public void doLogin(String email, String password) {
        enterEmail(email);
        enterPassword(password);
        clickSignIn();
    }

    public void clickForgotPassword() {
        wait.until(ExpectedConditions.elementToBeClickable(forgotPasswordLink));
        forgotPasswordLink.click();
    }

    public void clickRememberMe() {
        wait.until(ExpectedConditions.elementToBeClickable(rememberMeLabel));
        rememberMeLabel.click();
    }

    public boolean isRememberMeSelected() {
        return rememberMeCheckbox.isSelected();
    }

    public boolean isErrorDisplayed() {
        try {
            wait.until(ExpectedConditions.visibilityOf(errorMessage));
            return errorMessage.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public String getErrorMessageText() {
        wait.until(ExpectedConditions.visibilityOf(errorMessage));
        return errorMessage.getText().trim();
    }

    public boolean isEmailInputDisplayed() {
        return emailInput.isDisplayed();
    }

    public boolean isPasswordInputDisplayed() {
        return passwordInput.isDisplayed();
    }

    public boolean isSignInButtonDisplayed() {
        return signInButton.isDisplayed();
    }

    public boolean isForgotPasswordDisplayed() {
        return forgotPasswordLink.isDisplayed();
    }

    public boolean isRememberMeDisplayed() {
        return rememberMeCheckbox.isDisplayed();
    }

    public boolean isGoogleSignInDisplayed() {
        return googleSignInButton.isDisplayed();
    }

    public boolean isSsoButtonDisplayed() {
        return ssoButton.isDisplayed();
    }

    public boolean isPasskeyButtonDisplayed() {
        return passkeyButton.isDisplayed();
    }

    public boolean isFreeTrialButtonDisplayed() {
        return freeTrialButton.isDisplayed();
    }

    public void clickGoogleSignIn() {
        wait.until(ExpectedConditions.elementToBeClickable(googleSignInButton));
        googleSignInButton.click();
    }

    public void clickSsoButton() {
        wait.until(ExpectedConditions.elementToBeClickable(ssoButton));
        ssoButton.click();
    }

    public void clickPasskeyButton() {
        wait.until(ExpectedConditions.elementToBeClickable(passkeyButton));
        passkeyButton.click();
    }

    public void clickFreeTrialButton() {
        wait.until(ExpectedConditions.elementToBeClickable(freeTrialButton));
        freeTrialButton.click();
    }

    public boolean isGoogleSignInClickable() {
        try {
            wait.until(ExpectedConditions.elementToBeClickable(googleSignInButton));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isSsoButtonClickable() {
        try {
            wait.until(ExpectedConditions.elementToBeClickable(ssoButton));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isPasskeyButtonClickable() {
        try {
            wait.until(ExpectedConditions.elementToBeClickable(passkeyButton));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isFreeTrialButtonClickable() {
        try {
            wait.until(ExpectedConditions.elementToBeClickable(freeTrialButton));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getCurrentUrl() {
        return driver.getCurrentUrl();
    }

    public String getPageTitle() {
        return driver.getTitle();
    }

    public boolean isEmailFocused() {
        return emailInput.equals(driver.switchTo().activeElement());
    }

    public String getPasswordFieldType() {
        return passwordInput.getAttribute("type");
    }

    public void clickPasswordToggle() {
        wait.until(ExpectedConditions.elementToBeClickable(passwordToggle));
        passwordToggle.click();
    }

    public void pressTabKey() {
        driver.switchTo().activeElement().sendKeys(Keys.TAB);
    }

    public WebElement getActiveElement() {
        return driver.switchTo().activeElement();
    }

    public boolean staysOnLoginPage() {
        return driver.getCurrentUrl().contains("#/login");
    }
}
