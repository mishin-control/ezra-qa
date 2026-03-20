# Question 1: Booking Flow Test Cases

## How I Prioritized

I ranked these based on what would cause the most damage if it broke in production:

1. **Revenue and payment** — if people can't pay, the business stops
2. **Patient safety** — if someone with a medical condition books a scan they shouldn't, that's a liability issue
3. **Booking correctness** — wrong appointments, double bookings, missing data
4. **Data matching across systems** — what the user sees should match what the backend recorded
5. **Form validation and input handling** — bad data getting into the system

I wasn't trying to cover every UI state. I was trying to find the scenarios where a failure would hurt the most.

---

## Part 1: 15 Test Cases (Most Important → Least Important)

| Rank | Test Case | Why It Matters |
|---|---|---|
| 1 | Full booking works end to end — including recovering from a declined card and handling double-clicks on the pay button — and creates exactly one appointment with the correct charge | This is the money flow. If this breaks, nobody can book. Also covers what happens when a card gets declined and the user retries, plus what happens if they click "pay" multiple times fast. |
| 2 | Heart CT screening blocks users who answer "Yes" to medical questions, and this block can't be bypassed by navigating away and coming back | Patient safety. During testing I found a way to get around the screening by selecting a different scan, going to the next page, coming back, and re-selecting Heart CT. Documented this as a potential bug in TC-02. |
| 3 | Required fields, character limits, email/phone format checks, date of birth rules, and Stripe payment field validation all work correctly across every step of the booking flow | Bad data in the system causes problems everywhere — wrong contact info, invalid dates, incomplete payments. This covers sign-up, plan selection, and payment validation in one pass. |
| 4 | If someone else books the same time slot while you're checking out, the system catches it and doesn't double-book | Classic scheduling race condition. Two people pick the same slot, one pays first, the other should get an error — not a conflicting booking. |
| 5 | The price shown on the plan selection page matches the amount actually charged on the payment page and in Stripe | Price mismatches between what users see and what they're charged is a trust killer and a potential legal issue. |
| 6 | If the internet drops during payment, the user doesn't end up with a charge but no booking, or a booking but no charge | Real-world scenario. People are on phones, connections are flaky. The system needs to handle this without leaving things in a broken state. |
| 7 | After payment, the confirmation page shows the exact same scan type, location, and time slots that the user selected | If the confirmation says "Park Ave at 10 AM" but the backend recorded "Upper East Side at 2 PM," the patient shows up at the wrong place. |
| 8 | If your session expires while you're mid-booking, you get sent back to log in — and the system doesn't leak any of your booking data or keep a half-finished booking | Sessions expire. The question is whether the system handles it cleanly or leaves partial data hanging around. |
| 9 | One member can't pay for or complete a booking that belongs to a different account | Cross-account actions shouldn't be possible. If member IDs get mixed up, one person could end up with another person's appointment. |
| 10 | Hitting the browser back button or refreshing the page during booking doesn't create duplicates or break the flow | Everyone does this. If it corrupts the booking state, that's a problem you'll hear about constantly from support. |
| 11 | Error pages and failed requests don't accidentally show internal details like database IDs, server paths, or medical data | When something breaks, the error message should say "something went wrong" — not dump a stack trace with internal system details. |
| 12 | Promo codes apply the correct discount, invalid codes get rejected, and you can't stack codes that shouldn't be stacked | Promo bugs either cost the company money (accepting bad codes) or frustrate users (rejecting good ones). |
| 13 | Alternative payment methods (Bank with $5 back, Affirm financing, Google Pay) all work and show the correct total | If these fail silently, users without a credit card have no way to book. |
| 14 | If a user drops off mid-booking, comes back later, and logs into the account that was already created, they can start the booking again cleanly without stale data, duplicate bookings, or payment issues | Accounts are created before payment, so this is a normal real-world path. The system needs to let returning users log in and start again cleanly without trapping them in partial state or tying them to stale booking data. |
| 15 | The booking flow works on different browsers and screen sizes | Important for reach, but lower priority than everything above. |

---

## Part 2: Why the Top 3 Are Most Important

### 1. Full booking with declined card recovery and double-click protection

This is the most important test because it's the core money flow. If this breaks, nobody can book a scan and the business stops generating revenue.

But I didn't just test the happy path — I also tested what happens when a card gets declined (the user should see a clear error and be able to try again with a different card) and what happens when someone clicks the pay button multiple times quickly (the system should only process one payment, not charge them twice). I combined these into one test because in real life, this is one continuous experience — a user's card fails, they enter a new one, and they click pay again. Testing these as separate isolated scenarios would miss the realistic flow.

Every scan type ($349 Heart CT through $3,999 MRI with Skeletal) goes through the same payment step, so a bug here affects everyone.

### 2. Heart CT screening blocks ineligible users and can't be bypassed

From what I tested, Heart CT was the only scan I found with pre-payment screening.

During testing, I found that you can get around this screening: answer "Yes" to the blocking questions, get rejected, select a different scan like MRI, advance to the scheduling page, go back to plan selection, and then re-select Heart CT. After doing this, the screening no longer blocks you. I documented this as a bug in TC-02 — the test is designed to fail, which proves the bypass exists.

If this screening can be circumvented, a patient with a medical condition that makes the scan unsafe could end up booking it anyway.

### 3. Form validation across all booking steps

Validation is the first line of defense against bad data getting into the system. This test hits every step: empty required fields and character limits on sign-up, duplicate email handling, date of birth checks (future dates, dates before 1900) on plan selection, and Stripe payment field errors (missing card number, expiration, security code).

Any single validation failure is probably low severity on its own. But weak validation across the board means garbage data in member profiles, invalid demographic info that could affect scan eligibility, and incomplete payment attempts that leave things in a messy state. I tested all the steps in one flow because a form refactor that breaks validation on one page but not another is exactly the kind of regression that isolated tests would miss.

---

## Things I Noticed While Exploring the App

- **Your account is created the moment you submit the sign-up form** — before you ever get to payment. So there will always be accounts that signed up but never paid. This seems intentional but worth knowing.
- **Heart CT is the only scan with pre-payment screening.** I tested MRI, MRI with Spine, MRI with Skeletal + Neuro, and Lungs CT — none of them showed the screening questions before checkout.
- **Potential bug: the Heart CT screening can be bypassed.** After getting blocked, if you select a different scan, go forward to scheduling, then come back and re-select Heart CT, the screening doesn't block you anymore. This is a patient safety concern. Documented and automated in TC-02.
- **The medical questionnaire collects very sensitive data** — government ID upload, cancer history, medications, PSA results, surgical history.
- **Stripe supports multiple payment options**: Card, Bank ($5 back incentive), Affirm (buy now pay later), and Google Pay.
