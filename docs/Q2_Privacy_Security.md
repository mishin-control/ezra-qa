# Question 2: Privacy and Security Testing

## Part 1 — Can One Member Access Another Member's Medical Data?

### What I'm Testing

When a member fills out the medical questionnaire, the browser sends API requests to a backend server (`stage-api.ezra.com`). These requests include the member's unique ID and their encounter ID right in the URL:

- `POST /diagnostics/api/medicaldata/forms/mq/submissions/{memberUUID}/{encounterUUID}`

Anyone with browser DevTools open can see these IDs. The question is: if Member B copies Member A's IDs and puts them in their own request, can they see or change Member A's medical data?

That's the test. It should be impossible.

### Setup

You need two separate member accounts:

- **Member A** — has booked a scan and started the medical questionnaire. You know their member UUID, encounter UUID, and login token (captured from the browser's Network tab).
- **Member B** — same setup, different account, different token.

### Test Steps

| Step | What you do | What should happen |
|------|------------|-------------------|
| 1 | Log in as Member A, make a request to their own questionnaire endpoint using their own token | Should work (200 OK) — this proves the request format is correct |
| 2 | Log in as Member B, capture their token | Now you have two valid logins |
| 3 | Take the same request from step 1 but swap in Member B's token (keep Member A's IDs in the URL) | Should be blocked — Member B shouldn't be able to access Member A's data |
| 4 | Try to READ Member A's questionnaire using Member B's token | Should be blocked |
| 5 | Try to UPDATE Member A's questionnaire answers using Member B's token | Should be blocked |
| 6 | Try the request with no token at all | Should be blocked (401) |
| 7 | Try the request with a fake/garbage token | Should be blocked (401) |

**What "blocked" means:** The exact status code depends on the service's security model. A 403, 404, or security-obscured 401 can all be acceptable, as long as Member B never sees Member A's medical data. If any of these return 200 with actual data, that's a critical security bug.

### What I Actually Tested

I ran two manual tests against the staging environment:

1. Sent a request to the questionnaire endpoint with no login token → got **401 Unauthorized**
2. Sent a request from the browser console without proper API authorization → got **401 Unauthorized**

These confirm the endpoint isn't publicly accessible. But they don't fully prove that one logged-in member can't access another member's data — that would require capturing valid tokens for both members, making a successful request as Member A, then replaying it with Member B's token. The test design in Part 2 below shows exactly how to do that.

---

## Part 2 — HTTP Requests

**Backend API URL:** `https://stage-api.ezra.com`

I found these endpoints by watching the browser's Network tab while going through the medical questionnaire flow. Requests 1 and 2 are based on the actual traffic I observed. Requests 3 and 4 are additional checks I'd run to cover reading and updating, not just submitting.

### Request 1: Member A accesses their own data (should work)

*This is the request I saw in the Network tab*

```http
POST /diagnostics/api/medicaldata/forms/mq/submissions/{MEMBER_A_UUID}/{MEMBER_A_ENCOUNTER_UUID}
Host: stage-api.ezra.com
Authorization: Bearer {MEMBER_A_TOKEN}
Accept: application/json
Content-Type: application/x-www-form-urlencoded
Origin: https://myezra-staging.ezra.com

Expected: 200 OK
Why: This proves the request format is correct. If this fails, the rest of the tests are meaningless.
```

### Request 2: Member B tries to access Member A's data (should fail)

*Same request, but with Member B's token instead of Member A's*

```http
POST /diagnostics/api/medicaldata/forms/mq/submissions/{MEMBER_A_UUID}/{MEMBER_A_ENCOUNTER_UUID}
Host: stage-api.ezra.com
Authorization: Bearer {MEMBER_B_TOKEN}
Accept: application/json
Content-Type: application/x-www-form-urlencoded
Origin: https://myezra-staging.ezra.com

Expected: 403 Forbidden or 404 Not Found
Why: This is the core privacy test. If this returns 200 with data, anyone can view anyone else's medical records just by guessing their UUID.
```

### Request 3: Member B tries to read Member A's questionnaire (should fail)

*Additional check I would run*

```http
GET /diagnostics/api/medicaldata/forms/mq/submissions/{MEMBER_A_UUID}/{MEMBER_A_ENCOUNTER_UUID}
Host: stage-api.ezra.com
Authorization: Bearer {MEMBER_B_TOKEN}
Accept: application/json

Expected: 403 Forbidden or 404 Not Found
Why: Checks that reading is also protected, not just submitting.
```

### Request 4: Member B tries to change Member A's answers (should fail)

*Additional check I would run*

```http
PATCH /diagnostics/api/medicaldata/forms/mq/submissions/{MEMBER_A_UUID}/{MEMBER_A_ENCOUNTER_UUID}
Host: stage-api.ezra.com
Authorization: Bearer {MEMBER_B_TOKEN}
Accept: application/json
Content-Type: application/json

{
  "answers": {
    "familyHistoryOfCancer": true
  }
}

Expected: 403 Forbidden or 404 Not Found
Why: If someone can modify another person's medical answers, that's both a privacy violation and a data integrity problem.
Also verify: Member A's actual data hasn't changed after this attempt.
```

### Request 5: No login at all (should fail)

```http
POST /diagnostics/api/medicaldata/forms/mq/submissions/{MEMBER_A_UUID}/{MEMBER_A_ENCOUNTER_UUID}
Host: stage-api.ezra.com
Accept: application/json
Content-Type: application/x-www-form-urlencoded

Expected: 401 Unauthorized
I tested this manually and confirmed it returns 401.
```

### Request 6: Fake token (should fail)

```http
POST /diagnostics/api/medicaldata/forms/mq/submissions/{MEMBER_A_UUID}/{MEMBER_A_ENCOUNTER_UUID}
Host: stage-api.ezra.com
Authorization: Bearer this_is_a_fake_token
Accept: application/json

Expected: 401 Unauthorized
```

### Request 7: Does the identification endpoint only return your own data?

```http
GET /diagnostics/api/medicalfiles/identification
Host: stage-api.ezra.com
Authorization: Bearer {MEMBER_A_TOKEN}
Accept: application/json

Expected: 200 OK with only Member A's data.
If this returns data for other members, that's a data leak.
```

---

## Part 3 — How I'd Approach Security Testing Across 100+ Endpoints

### 1. Group endpoints by how dangerous a failure would be

Not all endpoints carry the same risk. I'd start by sorting them based on what happens if something goes wrong:

| Endpoint type | What goes wrong if it's breached | How often to test |
|---|---|---|
| Medical data endpoints | Someone sees or changes another person's health records | Every code change |
| Payment endpoints | Wrong charges, fraud, financial inconsistency | Every code change |
| Login / session endpoints | Account takeover, someone pretending to be another user | Every code change |
| Profile / account endpoints | One user sees or edits another user's account | Nightly |
| Admin / internal endpoints | Internal tools exposed to the wrong people | Nightly |
| Analytics / operational endpoints | Low-sensitivity data exposure | Periodic review |

This lets the team focus testing effort where the damage would be worst.

### 2. Build a reusable security checklist instead of one-off tests

Writing a unique test for every single endpoint doesn't scale to 100+. Instead, I'd define a standard set of checks that applies to all of them:

- Request with no login credentials → should be rejected
- Request with an expired or fake token → should be rejected
- Request where a logged-in user tries to access someone else's data → should be rejected
- Request where the actual data owner accesses their own data → should succeed
- Admin-only actions → should reject regular users
- Error responses → should not accidentally reveal internal details like database IDs, stack traces, or medical data

Run this same checklist against every sensitive endpoint. It catches the most common security problems without building custom logic for each one.

### 3. Test at the API level, not through the browser

For security testing across 100+ endpoints, clicking through the UI is too slow and too fragile. The better approach is to send requests directly to the API — the same way I tested the medical questionnaire endpoint using curl and the browser console in Part 1.

Tools like Playwright's API request feature work well for targeted checks. For broader coverage, Postman collections can organize and run security checks across many endpoints at once.

I'd still keep a small number of browser-based tests for the most critical user flows, but the bulk of security testing should happen at the API level.

### 4. Write down the permission rules

Before you can test whether security works, you need to know what the rules are supposed to be. I'd want a clear document — like a permissions table — that spells out which roles can access, update, or delete data on each endpoint.

Without this, every tester is guessing, and security coverage becomes inconsistent.

### 5. Run the most important checks automatically on every code change

| What to test | When to run it |
|---|---|
| Security checks on the highest-risk endpoints (medical, payment, login) | Every pull request — block the merge if it fails |
| Broader security checks across all sensitive endpoints | Nightly scheduled runs |
| Deeper security scanning and manual review | Before major releases |

### Tradeoffs

| Decision | Upside | Downside |
|---|---|---|
| Focus on highest-risk endpoints first | Effort goes where it matters most | Some lower-risk endpoints get less attention |
| API-level testing instead of browser tests | Faster, more reliable, easier to scale | Doesn't catch problems that only appear in the actual UI |
| Reusable checklist instead of custom tests per endpoint | Scales to 100+ endpoints quickly | Some endpoints have special rules the checklist won't catch |
| Blocking code merges on security test failures | Catches problems before they ship | Slow or flaky tests can frustrate developers |

### Risks to Be Aware Of

| Risk | Why it matters |
|---|---|
| UI tests passing doesn't mean the API is secure | Someone with curl or Postman can bypass everything the website protects — security has to be enforced on the server |
| Not knowing all your endpoints | If you don't know an endpoint exists, you're not testing it |
| Staging doesn't perfectly match production | Access rules or data might be set up differently between environments |
| Keeping tests up to date | When permission rules change, the tests need to change too — this takes ongoing effort |
| Security testing isn't just authorization checks | It's necessary, but doesn't replace code review, dependency updates, logging, and other security practices |

### Summary

My approach is to treat endpoint security as something the whole team owns, not just something QA checks at the end. Group endpoints by risk, build a reusable security checklist, test mainly at the API level, write down the permission rules so everyone agrees, and run the most critical checks automatically on every code change.
