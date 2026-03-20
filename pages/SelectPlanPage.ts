import { type Page, type Locator } from "@playwright/test";

export class SelectPlanPage {
  readonly page: Page;
  readonly dobInput: Locator;
  readonly sexDropdown: Locator;
  readonly submitButton: Locator;
  readonly screeningModal: Locator;
  readonly screeningSubmitButton: Locator;
  readonly rejectionModal: Locator;
  readonly rejectionBackButton: Locator;

  // Screening question test IDs
  private readonly screeningQuestions = [
    "chest-symptoms",
    "gatedCacStent",
    "pacemaker",
    "coronaryHistory",
    "previousCacScoreThreeYears",
    "previousCacScoreOver400",
  ];

  constructor(page: Page) {
    this.page = page;
    this.dobInput = page.getByRole("textbox", {
      name: "Date of birth (MM-DD-YYYY)",
    });
    this.sexDropdown = page.locator(".multiselect__tags");
    this.submitButton = page.getByTestId("select-plan-submit-btn");
    this.screeningModal = page.getByText(
      "Please answer the following questions before we proceed"
    );
    this.screeningSubmitButton = page.getByTestId("cac-prescreen-modal-submit-btn");
    this.rejectionModal = page.getByText(
      "We're sorry, this product isn't right for you"
    );
    this.rejectionBackButton = page.getByRole("button", { name: "Back" });
  }

  async enterDemographics(dob: string, sex: "Male" | "Female") {
    await this.dobInput.fill(dob);
    await this.sexDropdown.click();
    await this.page
      .locator(".multiselect__option")
      .filter({ hasText: new RegExp(`^${sex}$`) })
      .click();
  }

  async selectScanByName(scanName: string) {
    await this.page
      .locator(".encounter-title")
      .getByText(scanName, { exact: true })
      .click();
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  /**
   * Answers all Heart CT screening questions using their data-testid attributes.
   * Each question has yes-{id} and no-{id} test IDs.
   */
  async answerScreeningQuestions(answer: "Yes" | "No") {
    const prefix = answer === "Yes" ? "yes" : "no";

    for (const question of this.screeningQuestions) {
      await this.page
        .getByTestId(`${prefix}-${question}`)
        .getByRole("button", { name: answer, exact: true })
        .click();
    }

    await this.screeningSubmitButton.click();
  }
}