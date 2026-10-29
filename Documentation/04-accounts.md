# Accounts

**Version:** 1.0.0  
**Route:** `/accounts`  
**Who can access:** Signed-in users. Admins and Editors manage accounts; Viewers can browse.

## Screenshot

![Accounts list](./images/05-accounts.png)

## What this page does

Master list of ledger accounts (parties, cash wallets, expense heads, investments, and more). Create and edit accounts, assign **Account Type** and **Cash Type**, search the list, and open an account’s transactions.

## Layout at a glance

- Title **Accounts** with info tip
- Search: **Search accounts…**
- **Add** button
- Table: **SR.**, **ACC Name**, **Phone Number**, **ACC Type**, **Cash Type**, **Balance**, actions
- Pagination when the list exceeds the page size
- Modals: **Add Account** / **Edit Account**, **Export ledger**, **Delete Account?**

## Steps

### Browse accounts

1. Open **Accounts** from the sidebar.
2. Review name, phone, types, and current **Balance**.
3. Select an account name to open [Transactions](./03-transactions.md) filtered to that account.

### Search

1. Type in **Search accounts…**.
2. Results match name, phone, types, and balance text.

### Add an account

1. Select **Add**.
2. In **Add Account**, fill:
   - **ACC Name** (required)
   - **Phone Number** (optional)
   - **Account Type**
   - **Cash Type**
3. Select **Add** to save, or **Cancel**.

### Edit an account

1. Open the row **Actions** menu.
2. Choose **Edit**.
3. Update fields in **Edit Account**.
4. Select **Save**.

### Export a ledger

1. Open **Actions** for an account.
2. Choose **Export ledger**.
3. Pick a format and select **Download**.

### Delete an account

1. Open **Actions** → **Delete**.
2. Confirm in **Delete Account?**
3. Select **Delete** to remove, or **Cancel** to keep the account.

## Fields (Add / Edit Account)

| Field | Required | Notes |
|-------|----------|--------|
| ACC Name | Yes | Display name on journals and lists |
| Phone Number | No | Used for call / message shortcuts |
| Account Type | Recommended | From Settings → Account Type |
| Cash Type | Recommended | From Settings → Cash Type |

If no active types exist, the form points you to **Settings → Account Type** or **Settings → Cash Type**.

## Errors & edge cases

- Missing name: **Account name is required.**
- Empty list: **No accounts yet. Click Add to create one.**
- No search matches: a calm empty message appears.
- Balances update from posted transactions; opening balances may appear as early journal lines.

## Related links

- [Transactions](./03-transactions.md)
- [Account Type](./14-settings-account-type.md)
- [Cash Type](./15-settings-cash-type.md)
- [Cash & Savings](./05-cash-savings.md)
