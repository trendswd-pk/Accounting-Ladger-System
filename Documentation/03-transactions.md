# Transactions

**Version:** 1.0.0  
**Route:** `/transactions`  
**Who can access:** Signed-in users. Editors and Admins can add and edit; Viewers primarily browse.

## Screenshots

![Transactions journal](./images/04-transactions.png)

![Add transaction modal](./images/17-transactions-add-modal.png)

## What this page does

The journal of every debit, credit, and transfer. Search and filter entries, open an account’s ledger, add or edit transactions, attach documents, and use row actions such as edit or delete.

## Layout at a glance

- Title **Transactions** with info tip
- Search: **Search transactions…**
- Filter control (funnel) for date range, type, and related filters
- **Add** button
- Table columns: **SR.**, **TRANSACTION DATE**, **ACCOUNT NAME**, **NARRATION**, **TYPE**, **BALANCE**, **RUNNING BALANCE**, **ACTION**
- Optional back link when opened from another page with a return path

## Steps

### Browse the journal

1. Open **Transactions** from the sidebar (or from a dashboard / account link).
2. Review rows newest-first by transaction date.
3. **TYPE** shows **Credit** (green) or **Debit** (red).
4. **BALANCE** shows signed amounts; **RUNNING BALANCE** shows the cumulative position for context.

### Search

1. Enter text in **Search transactions…**.
2. Matching rows filter by account name, narration, and related fields.

### Filter

1. Select the filter (funnel) control.
2. Set date range and type filters as needed (for example Credit or Debit).
3. Apply filters; active filters appear as chips you can clear.
4. Use clear-all when you want the full journal again.

### Add a transaction

1. Select **Add**.
2. In **Add Transaction**, choose **Normal Entry** or **Transfer**.
3. Fill **Transaction Date**, account fields, **Narration**, type (Credit/Debit for normal), and **Balance**.
4. Optionally attach files.
5. Select **Add** (or **Save** when editing), or **Cancel**.

### Row actions

1. Open the **ACTION** menu (⋯) on a row.
2. Typical options include **Edit** and **Delete** (confirm in **Delete** dialogs).
3. Other actions may include messaging or PDF export when available for that row.

### Open an account ledger

1. Select an **ACCOUNT NAME** link.
2. Or arrive from Cash & Savings / Payable / Receivable / Expenses with `accountId` already set — a filter chip shows the account.
3. Use the back control when a return path was provided.

## Table columns

| Column | Description |
|--------|-------------|
| SR. | Row number on the current page |
| TRANSACTION DATE | Display date (DD-MM-YYYY) |
| ACCOUNT NAME | Linked account |
| NARRATION | Description |
| TYPE | Credit or Debit badge |
| BALANCE | Signed amount in the default currency |
| RUNNING BALANCE | Cumulative balance context |
| ACTION | Row menu |

## Errors & edge cases

- Validation in the modal mirrors the dashboard form (required date, narration, amount, accounts).
- Delete asks for confirmation before removing an entry.
- Empty search or filters: a calm empty state explains that nothing matches.
- Date filters from **Today Expense** / **Yesterday Expense** on the dashboard pre-fill the journal range.

## Related links

- [Dashboard](./02-dashboard.md)
- [Accounts](./04-accounts.md)
- [Settings](./12-settings.md) (default entry mode)
