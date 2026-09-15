# Inventory Adjustment User Manual

## 1. Introduction
The Inventory Adjustment module helps you correct stock levels in your warehouse. Use this feature when:
- actual physical stock doesn't match the system stock.
- goods are damaged or expired.
- data entry errors need correction.

## 2. Accessing the Module
Navigate to **Inventory > Adjustments** from the main dashboard menu.

## 3. Creating a New Adjustment
1. Click the **+ New Adjustment** button at the top right.
2. **Select Warehouse**: Choose the warehouse where the stock adjustment is happening.
3. **Select Date**: The date of the adjustment (defaults to today).
4. **Add Items**:
   - Click **Add Item**.
   - Search for the item by name or code.
   - **Note**: The dropdown shows the current stock level for reference.
   - Enter the **Quantity**. Use negative numbers for reduction (e.g., -5) and positive numbers for addition (e.g., 5).
   - The **Unit Rate** (Cost Price) is auto-filled but can be edited if necessary.
5. **Notes**: Add any relevant notes (e.g., "Found during monthly audit").
6. Click **Submit** to save as a **Draft**.

## 4. Reviewing and Approving
Adjustments start in **Draft** status. They do not affect stock levels until approved.

1. Locate the adjustment in the list.
2. **View**: Click the **Eye icon** to review details.
3. **Approve**: 
   - Click the **Green Check icon**.
   - Confirm the action in the popup dialog.
   - **Warning**: Once approved, stock levels are instantly updated, and this action cannot be undone.

## 5. Deleting a Draft
If an adjustment was created by mistake:
1. Locate the adjustment in the list.
2. Click the **Red Trash icon**.
3. Confirm deletion in the popup dialog.
4. **Note**: Only **Draft** adjustments can be deleted. Completed adjustments must be reversed with a new adjustment.

## 6. Searching
Use the search bar at the top of the list to find adjustments by their **Adjustment Number**.

## 7. Troubleshooting
- **Cannot see "New Adjustment" button?** You may not have the `create` permission. Contact your administrator.
- **Stock not updating?** Ensure the adjustment is **Approved** (Status: COMPLETED). Drafts do not change stock.
