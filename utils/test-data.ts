/**
 * Centralized test data and configuration.
 * Stripe test cards: https://docs.stripe.com/testing
 */
export const TEST_CONFIG = {
  baseURL: "https://myezra-staging.ezra.com",
  urls: {
    join: "/join",
    selectPlan: "/sign-up/select-plan",
    scheduleScan: "/sign-up/schedule-scan",
    reserveAppointment: "/sign-up/reserve-appointment",
    scanConfirm: "/sign-up/scan-confirm",
  },
};

export const STRIPE_CARDS = {
  valid: {
    number: "4242 4242 4242 4242",
    expiry: "03 / 40",
    cvc: "234",
    zip: "94122",
  },
  declined: {
    number: "4000 0000 0000 0002",
    expiry: "03 / 40",
    cvc: "234",
    zip: "94122",
  },
};

/**
 * Generates a unique test member for each test run.
 * Uses timestamp to avoid email collisions.
 * Password meets Ezra's requirements (uppercase, lowercase, number).
 */
export function generateTestMember() {
  const timestamp = Date.now();
  return {
    firstName: "Test",
    lastName: "Automation",
    email: `mpark+auto${timestamp}@gmail.com`,
    phone: "4155556677",
    password: "Password99",
  };
}
