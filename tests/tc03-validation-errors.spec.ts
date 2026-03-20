import { test, expect } from "@playwright/test";
import { SignUpPage } from "../pages/SignUpPage";
import { SelectPlanPage } from "../pages/SelectPlanPage";
import { generateTestMember } from "../utils/test-data";
import { ScheduleScanPage } from "../pages/ScheduleScanPage";

/**
 * TC-03: Form Validation Across the Booking Flow
 *
 * Why automate this: Validates input constraints, error messages, and
 * recovery across all three booking steps. Covers required fields,
 * format rules, boundary values, and payment validation errors.
 */
test.describe("TC-03: Form Validation", () => {
  test("should validate fields across sign-up, plan selection, scheduling, and payment", async ({
    page,
  }) => {
    const signUpPage = new SignUpPage(page);
    await signUpPage.goto();

    // =============================================
    // SIGN-UP PAGE VALIDATION (/join)
    // =============================================

    // --- Empty form submission ---
    await signUpPage.submitButton.click();

    await expect(page.getByText("The Legal First Name field is")).toBeVisible();
    await expect(page.getByText("The Legal Last Name field is")).toBeVisible();
    await expect(page.getByText("The Email field is required.")).toBeVisible();
    await expect(page.getByText("Please enter a valid Phone")).toBeVisible();
    await expect(page.getByText("or more characters")).toBeVisible();
    await expect(page.getByText("You must agree to all Terms")).toBeVisible();

    // --- Password rules displayed ---
    await expect(page.getByText("Upper + lowercase letters")).toBeVisible();
    await expect(page.getByText("At least one number or symbol")).toBeVisible();
    await expect(page.getByText("No repetitive characters (e.g")).toBeVisible();
    await expect(page.getByText("No sequential characters (e.g")).toBeVisible();

    // --- Max length validation ---
    const longText = "testtesttesttesttesttesttesttesttesttesttest";

    await signUpPage.firstNameInput.fill(longText);
    await signUpPage.lastNameInput.click();
    await expect(
      page.getByText("The Legal First Name field must be less than 40 characters.")
    ).toBeVisible();

    await signUpPage.lastNameInput.fill(longText);
    await signUpPage.emailInput.click();
    await expect(
      page.getByText("The Legal Last Name field must be less than 40 characters.")
    ).toBeVisible();

    // --- Invalid email format ---
    await signUpPage.emailInput.fill(longText);
    await signUpPage.phoneInput.click();
    await expect(page.getByText("The Email field is invalid.")).toBeVisible();

    // --- Invalid phone number ---
    await signUpPage.phoneInput.fill(longText);
    await signUpPage.passwordInput.click();
    await expect(page.getByText("Please enter a valid Phone")).toBeVisible();

    // --- Duplicate email rejection ---
    await signUpPage.firstNameInput.fill("Mike");
    await signUpPage.lastNameInput.fill("Park");
    await signUpPage.emailInput.fill("mpark+4@gmail.com");
    await signUpPage.phoneInput.fill("4155554433");
    await signUpPage.passwordInput.fill("Password99");
    await signUpPage.tosButton.click();

    await page.waitForTimeout(2000);
    await signUpPage.submitButton.click();

    await expect(
      page.getByText("If you have previously created an account try logging in instead.")
    ).toBeVisible({ timeout: 10000 });

    // --- Recover with valid data and proceed ---
    const member = generateTestMember();
    await signUpPage.firstNameInput.fill(member.firstName);
    await signUpPage.lastNameInput.fill(member.lastName);
    await signUpPage.emailInput.fill(member.email);

    await page
      .getByRole("combobox", { name: "Telephone country code" })
      .press("Tab");
    await signUpPage.phoneInput.fill(member.phone);
    await signUpPage.passwordInput.fill(member.password);

    await page.waitForTimeout(2000);
    await signUpPage.submitButton.click();

    await page.waitForURL("**/sign-up/select-plan", { timeout: 30000 });

    // Wait for duplicate email banner to disappear before continuing
    await page
      .getByText("If you have previously created an account")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});

    // =============================================
    // PLAN SELECTION VALIDATION (/sign-up/select-plan)
    // =============================================

    const selectPlanPage = new SelectPlanPage(page);

    // --- Future date ---
    await selectPlanPage.dobInput.fill("01-01-2027");
    await page.locator("body").click({ position: { x: 10, y: 10 } });
    await expect(page.getByText("Please enter a date either on or before today.")).toBeVisible();

    // --- Very old date ---
    await selectPlanPage.dobInput.fill("01-01-1899");
    await page.locator("body").click({ position: { x: 10, y: 10 } });
    await expect(page.getByText("Please enter a date after 01-01-1900.")).toBeVisible();

    // --- Valid date and proceed ---
    await selectPlanPage.dobInput.fill("01-01-1985");
    await selectPlanPage.enterDemographics("01-01-1985", "Male");
    await selectPlanPage.selectScanByName("MRI Scan");
    await selectPlanPage.clickSubmit();

    await page.waitForURL("**/sign-up/schedule-scan", { timeout: 10000 });

    // =============================================
    // SCHEDULING VALIDATION (/sign-up/schedule-scan)
    // =============================================

    // Select a location, date, and time slots, then continue to payment
    const scheduleScanPage = new ScheduleScanPage(page);
    await scheduleScanPage.selectLocation("Park Ave");
    await scheduleScanPage.selectFirstAvailableDate();
    await scheduleScanPage.selectTimeSlots(3);
    await scheduleScanPage.clickSubmit();

    await page.waitForURL("**/sign-up/reserve-appointment", { timeout: 15000 });

    // =============================================
    // PAYMENT VALIDATION (/sign-up/reserve-appointment)
    // =============================================

    // --- Submit with empty card fields ---
    const submitBtn = page.locator('[data-test="submit"]');
    await submitBtn.click();

    const getFrame = () =>
      page
        .locator('iframe[name*="__privateStripeFrame"]')
        .first()
        .contentFrame();

      await expect(
        getFrame().getByText("Your card number is incomplete.")
      ).toBeVisible({ timeout: 10000 });

      await expect(
        getFrame().getByText(/card.*expiration/)
      ).toBeVisible();

      await expect(
        getFrame().getByText(/card.*security code/)
      ).toBeVisible();

      await expect(
        getFrame().getByText(/ZIP.*invalid/)
      ).toBeVisible();
  });
});