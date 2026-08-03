# Order Detail Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an order-detail view with complete transaction history and present the order list in the required status priority.

**Architecture:** Extend the local `Order` mock model with transaction records. The order list sorts records by the requested status sequence and links each order ID to a protected detail route. The detail page reads the same local state and renders the order summary plus all transaction records.

**Tech Stack:** React, TypeScript, React Router, Ant Design, Vite.

---

### Task 1: Model and seed transaction history

**Files:**
- Modify: `src/types.ts`
- Modify: `src/store.ts`

1. Add a typed transaction-record collection to each order.
2. Seed one each of refunded, cancelled, paid, and pending orders, with their respective lifecycle records.
3. Confirm records preserve the `REFUNDED > CANCELED > PAID > PENDING` display order.

### Task 2: List navigation and status ordering

**Files:**
- Modify: `src/pages/OrderCenter.tsx`

1. Sort visible orders using the requested priority.
2. Render clickable order IDs that navigate to an order-specific route.
3. Display the four status codes in the list and filter.

### Task 3: Detail route and transaction ledger

**Files:**
- Create: `src/pages/OrderDetail.tsx`
- Modify: `src/App.tsx`

1. Add a permission-protected `orders/:orderId` route.
2. Render a not-found state for a missing or out-of-scope order.
3. Render the complete chronological transaction ledger for the selected order.

### Task 4: Verify and commit

1. Run `npm run build` and `git diff --check`.
2. Inspect the diff for the requested list order, route, and transaction data.
3. Commit the completed feature.
