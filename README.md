# Function Health / Ezra — Senior QA Engineer Take-Home

## What's In Here

- **Question 1** — 15 ranked test cases for the booking and payment flow, with explanations for the top 3
- **Question 2** — Privacy test case (can one member see another member's medical data?), HTTP requests showing how to test it, and how I'd approach security across 100+ endpoints
- **Automation** — 3 Playwright tests covering the most important booking scenarios

---

## Repo Structure

```
.
├── README.md
├── docs/
│   ├── Q1_Test_Cases.md              # 15 ranked test cases + top 3 explanations
│   ├── Q2_Privacy_Security.md        # Privacy test, HTTP requests, security strategy
│   └── assumptions-tradeoffs.md      # Assumptions, tradeoffs, what I'd do next
├── pages/
│   ├── SignUpPage.ts                 # /join — account creation
│   ├── SelectPlanPage.ts            # /sign-up/select-plan — scan selection + screening
│   ├── ScheduleScanPage.ts          # /sign-up/schedule-scan — location + time slots
│   └── PaymentPage.ts               # /sign-up/reserve-appointment — Stripe payment
├── tests/
│   ├── tc01-booking-happy-path.spec.ts   # Full booking: declined card → retry → success
│   ├── tc02-heart-ct-screening.spec.ts   # Screening gate + bypass bug
│   └── tc03-validation-errors.spec.ts    # Form validation across all booking steps
├── utils/
│   └── test-data.ts                 # Test data, Stripe test cards, member generator
├── playwright.config.ts
├── package.json
├── .env.example
└── .gitignore
```

## How to Run

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
npx playwright install chromium
```

### Running Tests

```bash
# All tests
npx playwright test

# Single test
npx playwright test tests/tc01-booking-happy-path.spec.ts

# Watch it run in a browser
npx playwright test --headed

# Interactive mode
npx playwright test --ui
```

### Environment Variables

Copy `.env.example` to `.env` and fill in values. Credentials are not committed to the repo.

---

## What the 3 Tests Cover

| Test | What It Does | Why I Picked It |
|------|-------------|----------------|
| **TC-01: Full Booking — Decline, Retry, Success** | Creates an account, selects Heart CT, goes through screening (answers No), picks a location and time, enters a declined card, verifies the error, enters a valid card, clicks pay twice fast, and confirms the booking | Tests the entire revenue flow including the most realistic failure scenario: card gets declined, user retries, system handles it correctly without double-charging |
| **TC-02: Heart CT Screening + Bypass Bug** | Tests that answering "Yes" to medical screening questions blocks the user. Then tests a workaround: select a different scan, advance to scheduling, go back, re-select Heart CT — does the screening still block? | Patient safety. The bypass test is expected to fail, which proves the bug exists. I found this during manual exploration. |
| **TC-03: Form Validation Across All Steps** | Submits empty forms, enters text that's too long, uses invalid emails and phone numbers, tries a duplicate email, enters bad dates of birth, and tries to pay with empty card fields | Covers input validation on every page of the booking flow in one pass. Catches regressions when the UI gets refactored. |

---

## Bug I Found: Heart CT Screening Can Be Bypassed

While exploring the app, I discovered that the Heart CT medical screening can be worked around:

1. Select Heart CT, answer "Yes" to the medical questions → correctly blocked
2. Select Heart CT again → still blocked (it remembers your answers)
3. Select a different scan (like MRI with Skeletal), advance to the scheduling page
4. Go back to plan selection
5. Select Heart CT again → **screening no longer blocks you**

**Why this matters:** The screening exists because cardiac stents and pacemakers can be dangerous with CT scans. If a patient with one of these conditions can get around the screening, they could book a scan that puts their health at risk.

TC-02 has a test for this. The test asserts the expected/correct behavior (should still block). **The test is designed to fail** — when it fails, that confirms the bug is real. If the bug gets fixed, the test will start passing.

---

## How the Tests Are Built

### Page Object Model

Each page in the booking flow (sign-up, plan selection, scheduling, payment) has its own file with the element locators and common actions. The actual test files just call these methods and check the results. This means if a button moves or gets renamed, you fix it in one place instead of in every test.

### How Elements Are Located

I used whatever was most stable on each page:

| What I used first | Example |
|---|---|
| `data-testid` attributes (most reliable) | `getByTestId("select-plan-submit-btn")`, `getByTestId("yes-chest-symptoms")` |
| Accessible roles and names | `getByRole("textbox", { name: "Legal First Name" })` |
| CSS class names that look stable | `.encounter-title`, `.location-card__name` |
| Text on the page (last resort) | `getByText("Your card has been declined.")` |

I avoided `data-v-*` attributes — those are generated by Vue and change every time the app is rebuilt.

### Stripe Payment Fields

Stripe puts its card fields inside iframes with randomly generated names (like `__privateStripeFrame25814`). The code matches on the partial name (`iframe[name*="__privateStripeFrame"]`) and grabs a fresh reference each time, since the iframe can reload after payment errors.

### Test Data

Every test run creates a new member account using a timestamp-based email (`mpark+auto1234567890@gmail.com`). This avoids conflicts between test runs without needing to clean up old data.

---

## Prioritization Approach

I ranked test cases based on:

1. Revenue and payment — can people actually pay?
2. Patient safety — can the screening be bypassed?
3. Booking correctness — does the right appointment get created?
4. Data consistency — does the confirmation match what was selected?
5. Input validation — does the system catch bad data?

Risk-based, not coverage-based.

---

## Sensitive Information

This is a public repo, so I intentionally left out: real login credentials, session tokens, and any screenshots that contain member or medical data.

---

## What I'd Do Next

**Right away:**
- Automate the privacy test from Q2 using Playwright's API request feature (send HTTP requests directly instead of going through the browser)
- Add cleanup to delete test accounts after runs
- Add retry logic for flaky staging issues (cookie banner timing, form submission delays)

**With more time:**
- Set up CI to run tests automatically on every code change
- Test on Firefox and Safari, not just Chrome
- Validate that API responses match expected formats

**Longer term:**
- Accessibility testing
- Security scanning in the CI pipeline
- Load testing on the booking and payment endpoints
- Visual regression testing (catch unexpected UI changes)
