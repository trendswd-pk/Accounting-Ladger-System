# Daily Expense

**Version:** 1.2.3  
**Route:** `/expenses/daily`  
**Day detail:** `/expenses/daily/{YYYY-MM-DD}`  
**Who can access:** Signed-in users.

## Screenshot

![Daily Expense](./images/10-expenses-daily.png)

## What this page does

Day-wise expense totals for a selected month. Tap or click a day to open that day’s expense accounts on a full page. Credit amounts count as spend; debit reverses spend.

## Layout at a glance

- Title **Daily Expense** with info tip
- Month and year filters (right drawer; filter icon on the title row)
- Desktop table: **Day**, **Date**, **Expense**
- Footer: **Total Month Expenses**
- Day detail page with account breakdown and **Total** (mobile: Expenses-style brand-sky account cards; desktop: table)
- Mobile: day cards with weekday labels and a **Today** marker on the current day

## Steps

### Choose a month

1. Open **Expenses** → **Daily Expense**.
2. Open the filter drawer and select the month (for example **October**) and year.
3. The day list refreshes for that month.

### Read daily totals

1. Scan the **Expense** column (or amounts on mobile cards).
2. Spend appears in red; reverse amounts in green.
3. Check **Total Month Expenses** at the bottom.

### Inspect a day

1. Select a day row or card.
2. The day page (`/expenses/daily/2026-10-29`) lists expense accounts and amounts.
3. Select an account name to open [Transactions](./03-transactions.md) for that account and day (return path: the day page).
4. Use **Back** to return to Daily Expense for the same month.

## Table columns

| Column | Description |
|--------|-------------|
| Day | Day number in the month |
| Date | Full date with weekday; **Today** on the current day |
| Expense | Net spend for that day |

## Errors & edge cases

- Days with no activity still appear with a zero amount.
- Day page with no activity: **No expense account activity this day.**
- Invalid date in the URL shows an error with a link back to Daily Expense.
- Load failures show a calm banner (for example failed to load expenses).
- Info tip: day-wise totals; tap a day for expense accounts; credit = spend, debit reverses.

## Related links

- [Expenses](./08-expenses.md)
- [Monthly Expense](./10-expenses-monthly.md)
- [Transactions](./03-transactions.md)
