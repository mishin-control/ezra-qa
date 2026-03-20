import { type Page, type Locator } from "@playwright/test";

/**
 * Page Object for the member sign-up page (/join).
 * Handles cookie consent, account creation form, and submission.
 */
export class SignUpPage {
  readonly page: Page;
  readonly cookieAcceptButton: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly passwordInput: Locator;
  readonly tosButton: Locator;
  readonly marketingButton: Locator;
  readonly thirdPartyButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cookieAcceptButton = page.getByRole("button", { name: "Accept" });
    this.firstNameInput = page.getByRole("textbox", {
      name: "Legal First Name",
    });
    this.lastNameInput = page.getByRole("textbox", {
      name: "Legal Last Name",
    });
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.phoneInput = page.getByRole("textbox", { name: "Phone Number" });
    this.passwordInput = page.getByRole("textbox", { name: "Password" });
    this.tosButton = page.getByRole("button", {
      name: "I agree to Ezra's terms of",
    });
    this.marketingButton = page.getByRole("button", {
      name: "I agree to receive marketing",
    });
    this.thirdPartyButton = page.getByRole("button", {
      name: "I agree that Ezra, directly",
    });
    this.submitButton = page.getByRole("button", { name: "Submit" });
  }

  async goto() {
    await this.page.goto("/join");
    // Cookie banner must be accepted — retry a few times
    for (let i = 0; i < 3; i++) {
      try {
        await this.cookieAcceptButton.click({ timeout: 3000 });
        break;
      } catch {
        // Not visible yet, retry
      }
    }
  }

  /**
   * Fills all sign-up fields and submits.
   * All three consent buttons must be clicked (ToS, marketing, third-party).
   */
  async signUp(member: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) {
    await this.firstNameInput.fill(member.firstName);
    await this.lastNameInput.fill(member.lastName);
    await this.emailInput.fill(member.email);
    await this.phoneInput.fill(member.phone);
    await this.passwordInput.fill(member.password);

    await this.tosButton.click();
    await this.marketingButton.click();
    await this.thirdPartyButton.click();
    await this.page.waitForTimeout(2000);
    await this.submitButton.click();
    await this.page.waitForURL("**/sign-up/select-plan", { timeout: 15000 });
  }

  async submitEmpty() {
    await this.submitButton.click();
  }
}
