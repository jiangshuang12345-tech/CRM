# Data Access and Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add phone-number visibility and export permissions, with secure user and order list exports.

**Architecture:** Add three granular RBAC module keys: phone visibility, user export, and order export. User lists always render phones masked unless the current role has phone-view access. Both list pages export the currently scoped and filtered result set as CSV; user exports always mask phone numbers regardless of screen permission.

**Tech Stack:** React, TypeScript, Ant Design, browser Blob CSV download.

---

### Task 1: RBAC model and default roles

**Files:**
- Modify: `src/types.ts`
- Modify: `src/store.ts`
- Modify: `src/pages/SystemConfig.tsx`

1. Add `users_phone_view`, `users_export`, and `orders_export` permissions.
2. Add them to the role editor and permission matrix beneath their parent modules.
3. Seed explicit values for each built-in role.

### Task 2: Secure export helpers

**Files:**
- Create: `src/export.ts`

1. Provide phone masking that preserves only the final four characters.
2. Create UTF-8 BOM CSV download support and CSV-cell escaping.

### Task 3: User-center changes

**Files:**
- Modify: `src/pages/UserCenterP1.tsx`
- Modify: `src/pages/UserCenter.tsx`

1. Add a phone column that is plain text only with the phone-view permission.
2. Add an export button gated by `users_export`.
3. Export every currently filtered, business-line-scoped row with masked phone numbers.

### Task 4: Order-center export

**Files:**
- Modify: `src/pages/OrderCenter.tsx`

1. Add a button gated by `orders_export`.
2. Export every currently filtered, business-line-scoped order row.

### Task 5: Verify and commit

1. Run `npm run build` and `git diff --check`.
2. Confirm raw phone values cannot enter user CSV exports.
3. Commit the feature without including unrelated worktree changes.
