# Cash Type

**Version:** 1.0.0  
**Route:** `/settings/cash-type`  
**Who can access:** Signed-in users with permission to manage setup types (Admin in Demo Mode).

## Screenshot

![Cash Type](./images/16-settings-cash-type.png)

## What this page does

Maintain cash-type classifications (for example Cash in Hand, Savings, Owned Cash). Combined with Account Type in Settings, these filters control which accounts appear on Cash & Savings and Payable/Receivable.

## Layout at a glance

- Title **Cash Type**
- **Add** control
- List with name, code, description, active state, and related actions
- Edit and **Delete** controls
- Same modal pattern as Account Type

## Steps

### Browse cash types

1. Open **Settings** → **Cash Type**.
2. Review types assigned to accounts.

### Add a cash type

1. Select **Add**.
2. Enter **Name** and **Code**.
3. Optionally add **Description** and set **Active**.
4. Save.

### Edit or delete

1. Use edit (pencil) to update a type.
2. Use **Delete** and confirm when the type is no longer needed.

### Wire types into views

1. Open [Settings](./12-settings.md).
2. Assign cash types under **Cash & Savings** and **Payable & Receivable**.
3. Select **Save**.

## Fields

| Field | Required | Notes |
|-------|----------|--------|
| Name | Yes | Displayed on accounts |
| Code | Yes | Used for CSV matching |
| Description | No | Optional |
| Active | — | Inactive types drop out of new account pickers |

## Errors & edge cases

- Empty list: **No cash types yet. Tap + to add one.**
- Validation for name/code mirrors Account Type.
- Accounts still keep historical type labels even if you later rename a type.

## Related links

- [Account Type](./14-settings-account-type.md)
- [Settings](./12-settings.md)
- [Cash & Savings](./05-cash-savings.md)
