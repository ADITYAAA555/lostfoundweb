# CampusFind Security Specification (Phase 0)

## 1. Data Invariants
1. **Identity Integrity**: No user may create an item, claim, or moderation report impersonating another `userId`.
2. **Role & XP Protection**: Students cannot self-assign `admin` or `security` roles, nor modify `totalXP`, `successfulReturns`, or `badges` via client Firestore writes.
3. **Private Feature Isolation**: `privateFeatures` on lost/found items live strictly in `/items/{itemId}/private/details` and are never exposed to unauthenticated users or arbitrary students.
4. **PII Isolation**: User emails and student IDs live in `/users/{userId}/private/profile` and are readable only by the owner or an Admin.
5. **Claim Self-Approval Prevention**: A claimant (`claimantId`) cannot transition their own claim to `Finder Approved`, `Admin Approved`, `Security Verified`, or `Completed`.
6. **Temporal & ID Integrity**: All document IDs match `^[a-zA-Z0-9_\-]+$` (<= 128 chars) and timestamps match `request.time`.
7. **Campus Map & Location Integrity**: `/campus_locations/{locationId}` and `/campus_config/{configId}` are publicly readable for campus browsing and reporting, while create/update/delete operations are strictly restricted to verified `admin` users with bounded coordinates (`0 <= mapX, mapY <= 100`).

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Shadow Role Escalation on Signup**: `CREATE /users/{uid}` with `role: "admin"` and `totalXP: 9999`.
2. **Self-XP Tampering**: `UPDATE /users/{uid}` changing `totalXP` from `0` to `5000` as a student.
3. **PII Scraping**: `GET /users/{otherUid}/private/profile` as a non-admin student.
4. **Private Feature Leak**: `GET /items/{itemId}/private/details` by a student who is neither reporter, security, nor admin.
5. **Identity Spoofing on Item Creation**: `CREATE /items/{itemId}` with `reportedBy: "{victimUid}"`.
6. **Shadow Field Injection on Item**: `CREATE /items/{itemId}` including undeclared field `adminVerified: true`.
7. **Self-Claim Approval**: `UPDATE /claims/{claimId}` as `claimantId` setting `verificationStatus: "Admin Approved"`.
8. **Direct Reward Minting**: `CREATE /rewards/{rewardId}` as a student awarding `+100` XP to themselves.
9. **Notification Spoofing/Reading Others**: `LIST /notifications` without filtering by `userId == request.auth.uid` (or reading another user's notification).
10. **Unauthorized Security Handover**: `CREATE /handovers/{handoverId}` as a student without security/admin role.
11. **Terminal Status Bypass**: `UPDATE /items/{itemId}` changing `status` from `"Returned"` back to `"Lost"` as a student.
12. **Unauthorized Campus Map Mutation / Coordinate Poisoning**: `CREATE /campus_locations/{locId}` as a student or security staff user, or setting `mapX: 9999`.

