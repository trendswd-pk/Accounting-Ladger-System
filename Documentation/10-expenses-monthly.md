# Monthly Expense

**Version:** 1.2.3  
**Route:** `/expenses/monthly`  
**Month detail:** `/expenses/monthly/{YYYY-MM}`  
**Who can access:** Signed-in users.

## Screenshot

![Monthly Expense](./images/11-expenses-monthly.png)

## What this page does

Year overview of expense spend by calendar month. Select a month to open that month’s expense accounts on a full page. Credit counts as spend; debit reverses.

## Layout at a glance

- Page heading **Monthly Expense** with info tip
- Year selector
- Desktop table: **SR.**, **Month**, **Expense**
- Footer: **Total Year Expenses**
- Month detail page with account breakdown and **Total** (mobile: Expenses-style brand-sky account cards; desktop: table)
- **Current** / **Current month** marker on the active month

## Steps

### Choose a year

1. Open **Expenses** → **Monthly Expense**.
2. Select a year from the dropdown.
3. All twelve months list with totals for that year.

### Read monthly totals

1. Review **Expense** per month.
2. Check **Total Year Expenses**.

### Inspect a month

1. Select a month row or card (for example **October**).
2. The month page (`/expenses/monthly/2026-10`) lists expense accounts and amounts.
3. Select an account to open filtered [Transactions](./03-transactions.md) for that month (return path: the month page).
4. Use **Back** to return to Monthly Expense for the same year.

## Table columns

| Column | Description |
|--------|-------------|
| SR. | 1–12 |
| Month | January–December; current month marked |
| Expense | Net spend for that month |

## Errors & edge cases

- Months with no postings show zero.
- Month page with no activity: **No expense account activity this month.**
- Invalid month in the URL shows an error with a link back to Monthly Expense.
- Info tip: tap a month for expense accounts; credit = spend, debit reverses.

## Related links

- [Expenses](./08-expenses.md)
- [Daily Expense](./09-expenses-daily.md)
- [Dashboard](./02-dashboard.md) (Monthly expenses chart)
