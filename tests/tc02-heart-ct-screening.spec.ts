import { test, expect } from "@playwright/test";
import { SignUpPage } from "../pages/SignUpPage";
import { SelectPlanPage } from "../pages/SelectPlanPage";
import { generateTestMember } from "../utils/test-data";

/**
 * TC-02: Heart CT Scan — Pre-Payment Medical Screening
 *
 * Why automate this: Patient safety gate. Heart CT is the only scan type
 * with pre-payment medical screening for cardiac contraindications.
 *
 * During manual exploration, I discovered that the screening gate can be
 * bypassed through a navigation workaround: after being blocked by answering
 * "Yes" to disqualifying questions, selecting a different scan, advancing
 * to scheduling, and navigating back allows the user to re-select Heart CT
 * and proceed past the screening. This is a patient safety issue because 
 * the screening is meant to stop medically ineligible users.
 */
test.describe("TC-02: Heart CT Pre-Payment Screening", () => {
  let signUpPage: SignUpPage;
  let selectPlanPage: SelectPlanPage;

  test.beforeEach(async ({ page }) => {
    const member = generateTestMember();
    signUpPage = new SignUpPage(page);
    selectPlanPage = new SelectPlanPage(page);

    await signUpPage.goto();
    await signUpPage.signUp(member);
    await selectPlanPage.enterDemographics("01-01-1985", "Male");
  });

  test("should block ineligible user on direct screening attempt", async ({
    page,
  }) => {
    // Select Heart CT, answer Yes to disqualifying questions
    await selectPlanPage.selectScanByName("Heart CT Scan");
    await selectPlanPage.clickSubmit();

    await expect(selectPlanPage.screeningModal).toBeVisible();
    await selectPlanPage.answerScreeningQuestions("Yes");

    // User is correctly blocked
    await expect(selectPlanPage.rejectionModal).toBeVisible();
    await expect(page).not.toHaveURL(/\/schedule-scan/);

    await selectPlanPage.rejectionBackButton.click();
    await expect(page).toHaveURL(/\/select-plan/);
  });

  test("screening bypass via navigation — known bug", async ({
    page,
  }) => {
    /**
     * BUG: After being blocked by the Heart CT screening, a user can bypass
     * the safety gate by:
     *   1. Selecting a different scan and advancing to scheduling
     *   2. Navigating back to plan selection
     *   3. Re-selecting Heart CT — the screening no longer blocks them
     *
     * Expected: Screening should block the user every time they answer "Yes"
     * Actual: After the navigation workaround, answering "Yes" allows the
     *         user to proceed to scheduling
     *
     * Impact: A patient with cardiac contraindications (stent, pacemaker)
     *         could book a Heart CT scan that poses a health risk
     */

    // Step 1: Select Heart CT, answer Yes, get blocked — this works correctly
    await selectPlanPage.selectScanByName("Heart CT Scan");
    await selectPlanPage.clickSubmit();

    await expect(selectPlanPage.screeningModal).toBeVisible();
    await selectPlanPage.answerScreeningQuestions("Yes");
    await expect(selectPlanPage.rejectionModal).toBeVisible();
    await selectPlanPage.rejectionBackButton.click();

    // Step 2: Blocked again on second direct attempt — also correct
    await selectPlanPage.selectScanByName("Heart CT Scan");
    await selectPlanPage.clickSubmit();

    await expect(selectPlanPage.rejectionModal).toBeVisible();
    await selectPlanPage.rejectionBackButton.click();

    // Step 3: Select a different scan and advance to scheduling
    await selectPlanPage.selectScanByName("MRI Scan with Skeletal and Neurological Assessment");
    await selectPlanPage.clickSubmit();
    await page.waitForURL("**/sign-up/schedule-scan", { timeout: 10000 });

    // Step 4: Go back to plan selection
    await page.locator('[data-test="cancel"]').click();
    await page.waitForURL("**/sign-up/select-plan", { timeout: 10000 });

    // Step 5: Select Heart CT again and answer Yes
    await selectPlanPage.selectScanByName("Heart CT Scan");
    await selectPlanPage.clickSubmit();

    // BUG: At this point the screening either doesn't appear or doesn't block.
    // The test below documents the EXPECTED behavior (should block).
    // If this test FAILS, it confirms the bypass bug exists.
    await expect(selectPlanPage.screeningModal).toBeVisible();
    await selectPlanPage.answerScreeningQuestions("Yes");

    await expect(selectPlanPage.rejectionModal).toBeVisible();
    await expect(page).not.toHaveURL(/\/schedule-scan/);
  });
});