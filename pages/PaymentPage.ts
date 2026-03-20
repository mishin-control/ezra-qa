import { type Page, type Locator, type FrameLocator } from "@playwright/test";

/**
 * Page Object for the payment page (/sign-up/reserve-appointment).
 * Handles Stripe card entry via iframe and payment submission.
 *
 * Note: Stripe iframe names are dynamic (e.g., __privateStripeFrame25814).
 * We use a partial match on the iframe name attribute to locate them.
 */
export class PaymentPage {
  readonly page: Page;
  readonly submitButton: Locator;
  readonly promoCodeInput: Locator;
  readonly applyCodeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Payment page uses data-test="submit" for the continue/pay button
    this.submitButton = page.locator('[data-test="submit"]');
    this.promoCodeInput = page.getByPlaceholder("Promo Code");
    this.applyCodeButton = page.getByText("Apply Code");
  }

  /**
   * Gets the Stripe iframe. Stripe uses dynamically named iframes
   * (e.g., __privateStripeFrame25814), so we match by partial name.
   */
  private getStripeFrame(): FrameLocator {
    return this.page
      .locator('iframe[name*="__privateStripeFrame"]')
      .first()
      .contentFrame();
  }

  /**
   * Fills Stripe card details via the Stripe iframe.
   * Handles the dynamic iframe name by matching on partial attribute.
   */
  async enterCardDetails(card: {
    number: string;
    expiry: string;
    cvc: string;
    zip: string;
  }) {
    // Always get a fresh reference to the Stripe iframe
    // (it can reload after errors)
    const getFrame = () =>
      this.page
        .locator('iframe[name*="__privateStripeFrame"]')
        .first()
        .contentFrame();

    const cardInput = getFrame().getByRole("textbox", { name: "Card number" });
    await cardInput.click();
    await cardInput.fill(card.number);

    await getFrame()
      .getByRole("textbox", { name: "Expiration date MM / YY" })
      .fill(card.expiry);

    await getFrame()
      .getByRole("textbox", { name: "Security code" })
      .fill(card.cvc);

    await getFrame()
      .getByRole("textbox", { name: "ZIP code" })
      .fill(card.zip);
  }

  /**
   * Submits payment and waits for confirmation page.
   */
  async submitPayment() {
    await this.submitButton.click();
    await this.page.waitForURL("**/sign-up/scan-confirm", {
      timeout: 30000,
    });
  }
}
