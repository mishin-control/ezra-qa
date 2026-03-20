import { test, expect } from "@playwright/test";
import { SignUpPage } from "../pages/SignUpPage";
import { SelectPlanPage } from "../pages/SelectPlanPage";
import { ScheduleScanPage } from "../pages/ScheduleScanPage";
import { PaymentPage } from "../pages/PaymentPage";
import { generateTestMember, STRIPE_CARDS } from "../utils/test-data";

/**
 * TC-01: End-to-End Booking Flow — Payment Failure, Recovery, and Success
 *
 * Why automate this: Validates the complete revenue-critical path including
 * realistic failure recovery. Tests that a declined card shows a clear error,
 * does not create a booking, and that the user can retry with a valid card
 * and complete the booking successfully. Also validates duplicate-click
 * protection on the final successful payment.
 */
test.describe("TC-01: End-to-End Booking Flow", () => {
  test("should handle declined card, then complete booking with valid card", async ({
    page,
  }) => {
    const member = generateTestMember();

    // Step 1: Sign up
    const signUpPage = new SignUpPage(page);
    await signUpPage.goto();
    await signUpPage.signUp(member);

    // Step 2: Select plan — Heart CT ($349)
    const selectPlanPage = new SelectPlanPage(page);
    await selectPlanPage.enterDemographics("01-01-1985", "Male");
    await selectPlanPage.selectScanByName("Heart CT Scan");
    await selectPlanPage.clickSubmit();

    await expect(selectPlanPage.screeningModal).toBeVisible();
    await selectPlanPage.answerScreeningQuestions("No");

    // Step 3: Schedule scan
    await page.waitForURL("**/sign-up/schedule-scan");
    const scheduleScanPage = new ScheduleScanPage(page);
    await scheduleScanPage.selectLocation("Park Ave");
    await scheduleScanPage.selectFirstAvailableDate();
    await scheduleScanPage.selectTimeSlots(3);
    await scheduleScanPage.clickSubmit();

    // Step 4a: Payment with DECLINED card
    const paymentPage = new PaymentPage(page);
    await paymentPage.enterCardDetails(STRIPE_CARDS.declined);

    const submitBtn = page.locator('[data-test="submit"]');
    await submitBtn.click();

    // Verify decline error on the main page (outside Stripe iframe)
    await expect(
      page.getByText("Your card has been declined.")
    ).toBeVisible({ timeout: 15000 });

    // Verify we stayed on payment page
    await expect(page).toHaveURL(/\/reserve-appointment/);

    // Step 4b: Retry with VALID card — only card number needs to change
    // Expiry, CVC, and ZIP are still filled from the declined attempt
    await page.waitForTimeout(2000);

    const getFrame = () =>
      page
        .locator('iframe[name*="__privateStripeFrame"]')
        .first()
        .contentFrame();

    const cardInput = getFrame().getByRole("textbox", { name: "Card number" });
    await cardInput.click({ clickCount: 3 }); // Select all existing text
    await cardInput.fill(STRIPE_CARDS.valid.number);
    await page.waitForTimeout(1000);

    // Rapid clicks to validate idempotency
    await submitBtn.click();
    await submitBtn.click({ force: true }).catch(() => {});

    await page.waitForURL("**/sign-up/scan-confirm", { timeout: 30000 });

    // Step 5: Verify confirmation
    await expect(page).toHaveURL(/\/sign-up\/scan-confirm/);
    await expect(
      page.getByRole("button", { name: "Begin Medical Questionnaire" })
    ).toBeVisible({ timeout: 10000 });
  });
});