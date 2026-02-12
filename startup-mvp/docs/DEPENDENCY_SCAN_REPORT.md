
# GLOBAL DEPENDENCY SCAN REPORT

**Date**: 2026-02-11
**Scope**: Specified Modules & Root Actions
**Objective**: Classification (SAFE_TO_DELETE, ISOLATE_FIRST, CRITICAL_DEPENDENCY)

---

## 1. Files Module (`app/dashboard/files`)
**Classification**: 🔴 **CRITICAL_DEPENDENCY**

*   **Status**: Fully Active
*   **Components**: `components/files/*` (FileGrid, FileList, UploadDialog)
*   **Server Actions**: `app/actions/files.ts`
*   **Prisma**: `model File`
*   **Usage**:
    *   Centralized file management.
    *   Used by `User` (avatar), `Client`, `Quotation` (attachments).
    *   Integrated with Prisma for ownership and storage metadata.
*   **Recommendation**: **KEEP**. Core infrastructure.

## 2. Notifications Module (`app/dashboard/notifications`)
**Classification**: 🔴 **CRITICAL_DEPENDENCY**

*   **Status**: Fully Active
*   **Components**: `components/NotificationDropdown.tsx` (and likely others in `components/ui`)
*   **Server Actions**: `app/actions/notificationActions.ts`
*   **Prisma**: `model Notification`
*   **Usage**:
    *   System-wide alerting (User creation, Quotation status changes).
    *   Deeply integrated into `lib/notification.ts` and triggered by multiple server actions (`user.action.ts`, `quotations.ts`).
*   **Recommendation**: **KEEP**. Core infrastructure.

## 3. Analytics & Reports (`app/dashboard/analytics`, `reports`)
**Classification**: ⚪ **GHOST_MODULES (SAFE_TO_DELETE from UI)**

*   **Status**: **MISSING IMPLEMENTATION**
*   **Route Check**: Directories `app/dashboard/analytics` and `app/dashboard/reports` **DO NOT EXIST**.
*   **Sidebar**: Links exist in `lib/navigation-builder.ts`.
*   **Permissions**: Keys (`analytics`, `reports`) exist in `types/permissions.ts`.
*   **Findings**:
    *   These are "Ghost Modules". They exist in the navigation structure and permission definitions but map to 404s or handled upstream (unlikely).
    *   No codebase references found in `components/` matching these paths.
*   **Recommendation**: **ISOLATE_FIRST**. Remove from Sidebar and Permissions to prevent broken UI links, unless reserved for future implementation.

## 4. CoverLetter Feature
**Classification**: 🟠 **CRITICAL_SUB_FEATURE**

*   **Status**: Active (Embedded)
*   **Type**: Sub-feature of Quotations & Settings
*   **Storage**: `Settings` model (JSON/Relation) or dedicated table depending on schema version (References found in `quotation-helpers.ts`).
*   **Usage**:
    *   Used heavily in `QuotationForm` and `PDFGenerator`.
    *   Managed via `/admin/settings?section=coverLetter`.
*   **Recommendation**: **KEEP**. Essential for Proposal/Quotation generation.

## 5. Root Actions Folder (`app/actions/`)
**Classification**: 🟡 **MIXED_ARCHTECTURE (DO NOT DELETE)**

*   **Status**: Active / Mixed Pattern
*   **Findings**:
    *   **Bridge Files**: `items.ts` imports from `app/(dashboard)/...`.
        *   *Role*: Backward compatibility/Alias.
    *   **Core Implementations**: `quotations.ts`, `user.action.tsx`, `orders.ts` contain the **ACTUAL LOGIC**.
        *   *Role*: These are the primary source of truth for these modules.
*   **Risk**: Deleting this folder would break:
    *   User Authentication & Management (`user.action.tsx`)
    *   Quotation System (`quotations.ts`)
    *   Order System (`orders.ts`)
*   **Recommendation**: **KEEP**. Do not prune. A long-term refactor could move these to their respective modules (e.g., `quotations.ts` -> `app/(dashboard)/dashboard/quotations/_actions/quotation.action.ts`), but current state relies on them.

## 6. Zombie CRM Check
**Classification**: ✅ **CLEAN**

*   **Status**: Removed
*   **Findings**: Re-verified absence of `app/dashboard/crm` and `components/crm`.
*   **Recommendation**: **N/A** (Action complete).

---

## Action Plan Summary

1.  **Ghost Modules**: Consider hiding "Analytics" and "Reports" from `lib/navigation-builder.ts` to improve User Experience (remove dead links).
2.  **Architecture Note**: Acknowledge the split between `app/actions` (Root) and `_actions` (Colocated). Maintain current structure to avoid breaking changes, but strictly define new actions in colocated folders.

**Signed**: Antigravity (AI Assistant)
