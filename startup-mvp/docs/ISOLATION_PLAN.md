
# SAFE ISOLATION STRATEGY

**Date**: 2026-02-11
**Objective**: Isolate "Ghost Modules" and "Legacy Bridges" to prevent usage while maintaining system stability.

## 1. TARGET SUMMARY

| Module / Area | Current Status | Isolation Action | Reason |
| :--- | :--- | :--- | :--- |
| **Analytics** | Ghost (No Routes) | **REMOVE** from Sidebar/Permissions | Dead link in UI; confusing for users. |
| **Reports** | Ghost (No Routes) | **REMOVE** from Sidebar/Permissions | Dead link in UI; confusing for users. |
| **Root Actions** | Mixed (Active/Bridge)| **DEPRECATE** (Comments Only) | Prevent new code from using legacy import paths. |
| **Files** | Active/Critical | **NONE** (Exempt) | Core functionality. |
| **Notifications**| Active/Critical | **NONE** (Exempt) | Core functionality. |

---

## 2. ISOLATION STEPS (Ordered by Safety)

### PHASE A: UI Isolation (Stop Users from Clicking)
**Target**: `Analytics`, `Reports`

1.  **Modify `lib/navigation-builder.ts`**:
    *   Remove or Comment out `Analytics` and `Reports` entries from `MENU_TEMPLATE`.
    *   *Effect*: Items disappear from the Sidebar. Links become inaccessible via UI.

2.  **Modify `types/permissions.ts`**:
    *   Mark `analytics` and `reports` modules as `@deprecated`.
    *   (Optional) Remove from `MODULES` constant if strict clean-up is desired, but keeping them as deprecated is safer for now to avoid TS errors in legacy checks.

### PHASE B: Code Level Deprecation (Stop Developers from Using)
**Target**: `Root Actions (app/actions/*.ts)`

1.  **Identify Bridge Files**:
    *   `items.ts` (Imports from `dashboard/items/...`)
    *   `clients.ts` (Imports from `dashboard/clients/...`)
    
2.  **Add Deprecation Docs**:
    *   Add `/** @deprecated Use active module path instead */` to the top of these files and their exported functions.
    *   *Effect*: VS Code will strike-through these imports in future development, signaling developers to use the correct co-located actions.

### PHASE C: Route Blocking (Safety Net)
**Target**: `Analytics`, `Reports`

1.  **Middleware / Layout Check** (Not strictly necessary as routes don't exist):
    *   Since `app/dashboard/analytics` does not exist, Next.js already serves a 404. No active blocking required.

---

## 3. EXECUTION ORDER

1.  **[UI]** Update `lib/navigation-builder.ts` to comment out Ghost Modules.
2.  **[DOCS]** Add JSDoc `@deprecated` tags to `app/actions/items.ts` and `app/actions/clients.ts`.
3.  **[VERIFY]** Check Sidebar (Visual/Code) and Build Check.

STARTING ISOLATION NOW.
