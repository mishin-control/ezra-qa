import { type Page, type Locator } from "@playwright/test";

/**
 * Page Object for the scheduling page (/sign-up/schedule-scan).
 * Handles location selection, calendar date, time slots, and submission.
 */
export class ScheduleScanPage {
  readonly page: Page;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.submitButton = page.locator('[data-test="submit"]');
  }

  async selectLocation(locationText: string) {
    await this.page
      .locator(".location-card__name")
      .filter({ hasText: locationText })
      .click();
  }

  /**
   * Selects the first available date in the calendar.
   * Available dates are inside vuecal__cell divs that do NOT have
   * the vuecal__cell--disabled or vuecal__cell--before-min classes.
   * Navigates forward one month if needed.
   */
  async selectFirstAvailableDate() {
    // Wait for calendar to render
    await this.page.waitForTimeout(2000);

    // Navigate to next month using the right arrow
    const nextArrow = this.page.locator(".vuecal .icon__arrow").last();
    if (await nextArrow.isVisible().catch(() => false)) {
      await nextArrow.click();
      await this.page.waitForTimeout(1000);
    }

    // Find day cells that are NOT disabled and NOT out of scope
    const availableCells = this.page.locator(
      '.vuecal__cell:not(.vuecal__cell--disabled):not(.vuecal__cell--before-min):not(.vuecal__cell--out-of-scope) span.vc-day-content[role="button"]'
    );

    await availableCells.first().waitFor({ timeout: 10000 });
    await availableCells.first().click();
  }

  /**
   * Selects time slots. Time slots are label elements containing
   * a div with class "b3--bold" showing the time text.
   * @param count Number of time slots to select (max 3)
   */
  async selectTimeSlots(count: number = 1) {
    // Wait for time slots to load after date selection
    await this.page.waitForTimeout(2000);

    // Time slots are labels containing div.b3--bold with time text
    const slots = this.page.locator('label:has(div.b3--bold)');
    await slots.first().waitFor({ timeout: 10000 });

    const available = await slots.count();
    const toSelect = Math.min(count, available, 3);

    for (let i = 0; i < toSelect; i++) {
      await slots.nth(i).click();
    }
  }

  async clickSubmit() {
    await this.submitButton.click();
    await this.page.waitForURL("**/sign-up/reserve-appointment", {
      timeout: 15000,
    });
  }
}