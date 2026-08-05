# Marketing Catalog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the marketing prototype with the Country → Channel → LandingPage → SKU → Coupon → PromoCode hierarchy and the supplied country inventory CSVs.

**Architecture:** Keep the existing in-memory Zustand-style store, but simplify the management screens around the persisted association fields. Landing pages become a one-channel mapping; SKUs hold the sale price and validity policy; coupons belong to a SKU and generate promo codes. Existing records remain displayable through optional compatibility fields.

**Tech Stack:** React, TypeScript, Ant Design, dayjs, Vite.

---

### Task 1: Model and SKU management

**Files:**
- Modify: `src/types.ts`
- Modify: `src/pages/CoursePackage.tsx`

**Step 1:** Rename user-facing 商品包 concepts to SKU and expose SKU ID, country/business line, original price, Best Value, and validity policy.

**Step 2:** Add a validity selector with absolute range and relative duration modes. Persist absolute start/end values or a relative valid-day value.

**Step 3:** Remove package-specific fields that are not part of the supplied SKU inventory workflow.

**Step 4:** Run `npm run build`.

### Task 2: Coupon and promo-code management

**Files:**
- Modify: `src/types.ts`
- Modify: `src/pages/Coupon.tsx`

**Step 1:** Scope coupon creation to one SKU and prefill its business line and currency.

**Step 2:** Replace unrelated issuance fields with CSV-aligned fields: coupon name, discounted price, discount rate or instant-off amount, optional end time, quantity, and per-user usage cap.

**Step 3:** Present generated promo codes as the Coupon 1 → N PromoCode child collection and retain DINO + four-digit code generation.

**Step 4:** Run `npm run build`.

### Task 3: Channel and landing-page mapping

**Files:**
- Modify: `src/pages/LandingPage.tsx`
- Modify: `src/components/AppLayout.tsx`

**Step 1:** Simplify landing page creation to a business line and one generated channel code, eliminating SKU/coupon duplication from the landing-page form.

**Step 2:** Display the association path and order the marketing navigation as Channels, Landing Pages, SKU, Coupons.

**Step 3:** Run `npm run build` and verify the production build.

### Task 4: Verification and delivery

**Files:**
- Verify: `src/pages/CoursePackage.tsx`
- Verify: `src/pages/Coupon.tsx`
- Verify: `src/pages/LandingPage.tsx`

**Step 1:** Run `git diff --check`.

**Step 2:** Run `npm run build`.

**Step 3:** Commit the implementation with an explanatory message.
