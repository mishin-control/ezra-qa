# Assumptions and Tradeoffs

## Assumptions

| Area | What I assumed |
|---|---|
| Staging environment | It's stable enough to run automated tests against — sometimes it's flaky (cookie banner timing, form submission delays), but it works |
| Test accounts | I can create as many test accounts as I need, per the assignment instructions |
| Payments | Stripe is in test mode and accepts test card numbers |
| Privacy test | I captured real API endpoints by watching browser network traffic during the medical questionnaire flow |
| Public repo | No real credentials, tokens, or screenshots with medical data are committed |
| Heart CT screening | From what I tested, Heart CT was the only scan I found with pre-payment medical screening. The other scan types I tried (MRI, MRI with Spine, MRI with Skeletal + Neuro, and Lungs CT) went straight to scheduling. |
| Duplicate email test | `mpark+4@gmail.com` already exists as an account and is used to test the duplicate email error |

---

## Tradeoffs

| What I decided | Why it's good | What it costs |
|---|---|---|
| Combined declined card + retry + double-click into one test (TC-01) | Tests a realistic user journey instead of isolated scenarios | If it fails in the middle, it's harder to tell exactly what broke |
| Documented the screening bypass as a test that's expected to fail (TC-02) | Shows I found a real bug through exploratory testing | The test "failing" needs explanation so reviewers don't think my code is broken |
| One long validation test across all steps (TC-03) | Covers sign-up, plan selection, and payment validation in a single flow | If an early check fails, the later checks don't run |
| Page Object Model for 3 tests | Easy to maintain as the test suite grows — change a locator in one place, not everywhere | More setup work upfront than just writing inline tests |
| Focused on API-level thinking for security testing (Q2) | More practical and scalable for 100+ endpoints than trying to test security through the browser | Doesn't catch issues that only show up in the actual UI |
| New email address for every test run (timestamp-based) | No conflicts between test runs, no dependency on pre-existing data | Creates accounts in staging that might need cleanup eventually |
| Kept credentials out of the repo | Right thing to do for a public repo | Requires setup before you can run the tests |

---

## What I'd Do Next

- **Automate the Q2 privacy test** — use Playwright's API request feature to send HTTP requests directly instead of going through the browser
- **Clean up test accounts** — add a step that deletes the test member after each run
- **Set up CI** — run tests automatically on every code change, with a smaller "smoke" set on every PR and a full run nightly
- **Break TC-03 into smaller tests** once it's running in CI — the tradeoff of one long test makes more sense for a take-home than for production
- **Validate API response formats** — make sure the backend returns the expected data shapes
- **Accessibility testing** — check that the booking flow works with screen readers
- **More browsers** — Firefox and Safari, not just Chrome
- **Screenshots and videos on failure** — easier debugging when tests break
