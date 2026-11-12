# Budget Planner

A beginner-friendly, browser-only app for comparing cart options against named spending budgets.

No install, no server, and no paid services are required. Open `index.html` in a web browser.

## What it does

- Create multiple **budgets** (for example Birthday Party ₹10,000 and Home Renovation ₹50,000).
- Add several **cart options** under the active budget.
- Add, replace, and delete items. Each item row has an **Action** column with **Delete**.
- Compare each cart total with that budget’s spending limit: Below, Equal, or Above.
- Choose **Auto** totals (update as you type) or **Manual** totals (update when you click Calculate Total). This setting is shared across the whole app.
- Saved carts are stored only when you click **Save cart**.
- Mark any number of saved carts as **favorites** with the star next to each cart. Favorites belong to that budget only.
- Data is remembered in the browser with Local Storage.

## How to open

1. Go to the project folder.
2. Double-click `index.html`, or right-click it and open it with Chrome, Edge, or Firefox.

Files:

- `index.html` — page structure
- `styles.css` — layout and colors
- `app.js` — application logic and Local Storage

## Typical workflow

1. Add a budget name and spending limit, then click **Add budget**.
2. Name a cart option.
3. Add items with quantity and unit price.
4. Click a table row to select an item, change the form, then **Replace selected**.
5. Use **Delete** in the Action column to remove one item.
6. Watch the total and Below / Equal / Above status (Auto mode), or click **Calculate Total** in Manual mode.
7. Click **Save cart**. The cart appears under **Saved cart options** for the active budget.
8. Open, duplicate, or delete saved carts. Duplicate creates a draft named `Name (copy)` that you save yourself.
9. Click the star next to a saved cart to favorite or unfavorite it. You can favorite more than one cart in the same budget.
10. Switch budgets with **Open**. Only that budget’s carts (and their stars) are listed.

## Confirmations

- Leaving a cart with unsaved changes (switch budget, create budget, open another cart, New cart, or Duplicate) asks **Save / Discard / Cancel**.
- Deleting a budget explains that **all cart options under it will also be deleted**, and only continues after **Confirm delete**.

## Notes

- Amounts are shown with two decimal places and a ₹ symbol.
- Refreshing the page restores budgets, the active budget, calculation mode, and the current working draft.
- Clearing site data for this page will remove saved budgets and carts.

## Tools Used

- Cursor
- ChatGPT
