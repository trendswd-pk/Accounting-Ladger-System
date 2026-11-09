# Account Type

**Version:** 1.2.3  
**Route:** `/settings/account-type`  
**Linked accounts:** `/settings/account-type/{id}`  
**Who can access:** Signed-in users with permission to manage setup types (Admin in Demo Mode).

## Screenshot

![Account Type](./images/15-settings-account-type.png)

## What this page does

Maintain the catalog of account types (for example Cash in Hand, Savings, Loan, Expense, Investment). Types drive account classification and Settings filters for Cash & Savings and Payable/Receivable.

## Layout at a glance

- Title **Account Type** with info tip
- **Add** control to create a type
- Mobile: brand-sky type cards (code, status, description, linked account count)
- Desktop table: name, code, description, accounts, status, actions
- Edit (pencil) and **Delete** actions
- Add / edit modal for type fields
- Tap a type to open its linked accounts page

## Steps

### Browse types

1. Open **Settings** → **Account Type**.
2. Review existing types used across accounts.

### Add an account type

1. Select **Add** (or the + control).
2. Enter **Name** and **Code** (required).
3. Optionally enter **Description**.
4. Set **Active** as needed.
5. Save the type.

### Edit a type

1. Select the edit (pencil) control on a card or row.
2. Update fields and save.

### Delete a type

1. Select **Delete** on a card or row.
2. Confirm the deletion dialog if prompted.
3. Prefer deactivating a type that is still in use when you need to keep history tidy.

### See accounts using a type

1. Tap a type card (or the name / account count on desktop).
2. The linked accounts page lists those accounts (mobile: Expenses-style cards).
3. Tap an account to open filtered [Transactions](./03-transactions.md).
4. Use **Back** to return to Account Type.

## Fields

| Field | Required | Notes |
|-------|----------|--------|
| Name | Yes | Shown on account forms and lists |
| Code | Yes | Stored uppercase; used in CSV import matching |
| Description | No | Optional helper text |
| Active | — | Inactive types are hidden from new account pickers |

## Errors & edge cases

- Missing name or code: validation messages such as **Code is required.**
- Empty catalog: **No account types yet. Tap + to add one.**
- Linked accounts empty: **No accounts use this account type yet.**
- Expense and Investment pages look for type names **Expense** / **Expenses** and **Invest** / **Investment**.

## Related links

- [Cash Type](./15-settings-cash-type.md)
- [Accounts](./04-accounts.md)
- [Settings](./12-settings.md)
