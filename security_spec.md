# Security Specification for BSS Weather Pulse & Safety Dispatch Database

This document drafts the Phase 0 Security Test-Driven Development (TDD) spec, describing mathematical data invariants, adversarial payloads, and test coverage for the Firebase Fortress Security rules.

## 1. Data Invariants

1. **Regional Authority Isolation**: Users with `role == 'regional_admin'` are strictly scoped. They cannot modify any telemetry, alerts, or report statuses for a campus whose `region` does NOT match their assigned region.
2. **Strict Schema Constraints**: No write or modification can contain unauthorized shadow fields (ghost fields) like `isAdmin` or `role` updates.
3. **Domain Verification**: Incident reports must originate from authentic `@bh.edu.pk` emails.
4. **Auth Integrity**: `request.auth.uid` must match the owner UID of any user-authored profile updates.
5. **No Self-Assigned Privilege Escalation**: Users cannot change their own roles in `/userProfiles/{userId}`.
6. **Immutable Fields**: `createdAt`, `branchId`, `reporterEmail` must remain frozen once committed.

---

## 2. The "Dirty Dozen" Adversarial Payloads

Below are the 12 malicious payloads targeted by our Red Team Audit:

### Payload 1: Privilege Escalation (Shadow Role Set)
- **Path**: `/userProfiles/attacker_uid`
- **Action**: `create` or `update`
- **Payload**: `{ "role": "super_admin", "name": "Attacker", "email": "attack@bh.edu.pk" }`
- **Result**: `PERMISSION_DENIED` (Cannot assign roles).

### Payload 2: Regional Bypass (Cross-Region Intruder)
- **Path**: `/campuses/BSS-004` (Lahore - Region: Centre)
- **Action**: `update` (by a regional_admin belonging to South)
- **Payload**: `{ "weather": { "temp": 50, "aqi": 500 } }`
- **Result**: `PERMISSION_DENIED` (Region mismatch).

### Payload 3: Spoofed Reporter Domain (Orphan Report)
- **Path**: `/incidentReports/malicious-report-01`
- **Action**: `create` (by generic account)
- **Payload**: `{ "reporterEmail": "attacker@gmail.com", "campusId": "BSS-001", "status": "Pending" }`
- **Result**: `PERMISSION_DENIED` (Email domain must end in `@bh.edu.pk`).

### Payload 4: Arbitrary Moderation (Unsanctioned Override)
- **Path**: `/incidentReports/valid-report-01`
- **Action**: `update` (by standard School Head)
- **Payload**: `{ "status": "Approved" }`
- **Result**: `PERMISSION_DENIED` (Only regional/super admins can moderate).

### Payload 5: Deny-of-Wallet ID Poisoning
- **Path**: `/campuses/[1000-character-junk-string]`
- **Action**: `create`
- **Payload**: `{ "name": "Junk Campus" }`
- **Result**: `PERMISSION_DENIED` (document IDs must match exact regex limit).

### Payload 6: Ghost Field Injection (The "Shadow" Update)
- **Path**: `/campuses/BSS-001`
- **Action**: `update` (by valid admin)
- **Payload**: `{ "temp": 30, "ghost_field_is_premium": true }`
- **Result**: `PERMISSION_DENIED` (strict schema validation checks keys).

### Payload 7: Timestamp Forgery (Client Clock Spoof)
- **Path**: `/safetyAlerts/new-alert-01`
- **Action**: `create`
- **Payload**: `{ "timestamp": "2099-12-31T23:59:59Z" }`
- **Result**: `PERMISSION_DENIED` (Must bind strictly to server time).

### Payload 8: Blanket Read (Unscanned Scraping)
- **Path**: `/campuses` list query
- **Action**: `list` (without proper parameters, attempting blanket read of confidential user info)
- **Payload**: `Query everything`
- **Result**: `PERMISSION_DENIED` (Rule enforces limits).

### Payload 9: Immortality Breach (Altering Frozen Dates)
- **Path**: `/userProfiles/user1`
- **Action**: `update`
- **Payload**: `{ "createdAt": "2020-01-01T00:00:00Z" }`
- **Result**: `PERMISSION_DENIED` (`createdAt` is immutable).

### Payload 10: Value Poisoning (Infinite Integer Storm)
- **Path**: `/campuses/BSS-001`
- **Action**: `update`
- **Payload**: `{ "weather": { "temp": 10000000 } }`
- **Result**: `PERMISSION_DENIED` (Values must be safe and bounded).

### Payload 11: Direct Points Inflation (Free Score hack)
- **Path**: `/usersState/user_uid`
- **Action**: `update` (incrementing points directly by 999999)
- **Payload**: `{ "points": 999999 }`
- **Result**: `PERMISSION_DENIED` (Points increments are restricted to validation increments).

### Payload 12: Anonymous Spammer Bypass
- **Path**: `/incidentReports/xyz`
- **Action**: `create` (without verified email / token)
- **Payload**: `{ "reporterName": "Anonymous" }`
- **Result**: `PERMISSION_DENIED` (Requires email verification).

---

## 3. Test Suite Implementation Blueprint (TDD Runner)

The file `firestore.rules.test.ts` below can be run within the Firebase emulator suite to block all malicious attacks.

```typescript
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "jeni-496706",
    firestore: {
      rules: require("fs").readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Red Team Vulnerability Assessments", () => {
  it("rejects shadow privilege escalation (Payload 1)", async () => {
    const maliciousDb = testEnv.authenticatedContext("attacker").firestore();
    const maliciousDoc = maliciousDb.doc("userProfiles/attacker");
    await expect(
      setDoc(maliciousDoc, { role: "super_admin", email: "attack@bh.edu.pk" })
    ).rejects.toThrow();
  });

  it("prevents cross-regional admin overrides (Payload 2)", async () => {
    const regionalAdminDb = testEnv
      .authenticatedContext("south_admin", { email_verified: true })
      .firestore();
    // South admin tries editing Centre region campus BSS-004
    await expect(
      setDoc(regionalAdminDb.doc("campuses/BSS-004"), {
        weather: { temp: 45, humidity: 80, chanceOfRain: 10, windSpeed: 10, aqi: 150, uvIndex: 5 },
        region: "Centre",
      })
    ).rejects.toThrow();
  });
});
```
