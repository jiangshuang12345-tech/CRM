# Message Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the broad phase-four lifecycle page with a focused Message Center for templates and combined user tags.

**Architecture:** Reuse the existing standalone phase-four route and RBAC module, rename its navigation label to Message Center, and provide two in-page workspaces. Template configuration stores the selected channel, content, inserted predefined variables, selected tags, and enable state in local prototype state. Tag composition stores AND/OR rules made from selectable user attributes.

**Tech Stack:** React, TypeScript, Ant Design, existing local prototype state.

---

### Task 1: Phase-four navigation

**Files:**
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/i18n.tsx`

1. Rename the standalone phase-four menu and page title to Message Center.
2. Preserve the existing four-phase marker and permission guard.

### Task 2: Focused message center

**Files:**
- Modify: `src/pages/LifecycleAutomation.tsx`

1. Remove lifecycle, journey, event, campaign, and analytics UI from the visible prototype.
2. Add a message-template editor with channels, content, predefined variable insertion, audience-tag selection, enable switch, and save action.
3. Add a tag-combination editor with AND/OR logic and user-attribute conditions.

### Task 3: Verify and commit

1. Run `npm run build` and `git diff --check`.
2. Verify the four-phase Message Center is the only visible menu entry for this scope.
3. Commit the focused prototype update.
