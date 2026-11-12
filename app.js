// Budget Planner — beginner-friendly single-file app logic.
// Data is stored in the browser with localStorage (no server required).

const STORAGE_KEY = "budgetPlannerData";

const state = {
  calcMode: "auto",
  activeBudgetId: null,
  nextId: 1,
  workingDraft: null,
  budgets: [],
  displayedTotal: 0,
  totalsStale: false,
  selectedItemId: null,
  editingBudgetId: null,
  pendingAction: null,
  modalKind: null
};

function createEmptyDraft(budgetId) {
  return {
    budgetId: budgetId,
    cartId: null,
    name: "",
    items: []
  };
}

function generateId() {
  const id = String(state.nextId);
  state.nextId += 1;
  return id;
}

function nowIso() {
  return new Date().toISOString();
}

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

function formatMoney(value) {
  return "₹" + roundMoney(value).toFixed(2);
}

function lineTotal(item) {
  return roundMoney(Number(item.quantity) * Number(item.unitPrice));
}

function cartTotal(items) {
  let total = 0;
  items.forEach(function (item) {
    total += lineTotal(item);
  });
  return roundMoney(total);
}

function compareToBudget(total, limit) {
  const t = roundMoney(total);
  const l = roundMoney(limit);
  if (t < l) {
    return "below";
  }
  if (t > l) {
    return "above";
  }
  return "equal";
}

function statusLabel(status) {
  if (status === "below") {
    return "Below budget";
  }
  if (status === "equal") {
    return "Equal to budget";
  }
  if (status === "above") {
    return "Above budget";
  }
  return "No budget selected";
}

function cloneItems(items) {
  return items.map(function (item) {
    return {
      id: item.id,
      name: item.name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice)
    };
  });
}

function cloneItemsWithNewIds(items) {
  return items.map(function (item) {
    return {
      id: generateId(),
      name: item.name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice)
    };
  });
}

function defaultAppData() {
  return {
    calcMode: "auto",
    activeBudgetId: null,
    nextId: 1,
    workingDraft: null,
    budgets: []
  };
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map(function (item) {
    return {
      id: String(item.id || generateId()),
      name: String(item.name || ""),
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0
    };
  });
}

function sanitizeCarts(carts) {
  if (!Array.isArray(carts)) {
    return [];
  }
  return carts.map(function (cart) {
    return {
      id: String(cart.id || generateId()),
      name: String(cart.name || "Untitled cart"),
      items: sanitizeItems(cart.items),
      favorite: cart.favorite === true,
      updatedAt: cart.updatedAt || nowIso()
    };
  });
}

function loadApp() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      Object.assign(state, defaultAppData());
      return;
    }

    const data = JSON.parse(raw);
    state.calcMode = data.calcMode === "manual" ? "manual" : "auto";
    state.nextId = Number(data.nextId) || 1;
    state.budgets = (Array.isArray(data.budgets) ? data.budgets : []).map(function (budget) {
      return {
        id: String(budget.id || generateId()),
        name: String(budget.name || "Untitled budget"),
        limit: roundMoney(budget.limit || 0),
        carts: sanitizeCarts(budget.carts),
        updatedAt: budget.updatedAt || nowIso()
      };
    });
    state.activeBudgetId = data.activeBudgetId || null;
    state.workingDraft = data.workingDraft || null;

    if (state.workingDraft) {
      state.workingDraft = {
        budgetId: state.workingDraft.budgetId || state.activeBudgetId,
        cartId: state.workingDraft.cartId || null,
        name: state.workingDraft.name || "",
        items: sanitizeItems(state.workingDraft.items)
      };
    }

    if (state.activeBudgetId && !getBudgetById(state.activeBudgetId)) {
      state.activeBudgetId = state.budgets[0] ? state.budgets[0].id : null;
    }

    if (!state.workingDraft && state.activeBudgetId) {
      state.workingDraft = createEmptyDraft(state.activeBudgetId);
    }
  } catch (error) {
    Object.assign(state, defaultAppData());
  }

  state.displayedTotal = state.workingDraft ? cartTotal(state.workingDraft.items) : 0;
  state.totalsStale = false;
  state.selectedItemId = null;
}

function persistApp() {
  const data = {
    calcMode: state.calcMode,
    activeBudgetId: state.activeBudgetId,
    nextId: state.nextId,
    workingDraft: state.workingDraft,
    budgets: state.budgets
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getBudgetById(id) {
  return state.budgets.find(function (budget) {
    return budget.id === id;
  }) || null;
}

function getActiveBudget() {
  return getBudgetById(state.activeBudgetId);
}

function getSavedCart(budget, cartId) {
  if (!budget || !cartId) {
    return null;
  }
  return budget.carts.find(function (cart) {
    return cart.id === cartId;
  }) || null;
}

function itemsAreEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].id !== b[i].id ||
      a[i].name !== b[i].name ||
      Number(a[i].quantity) !== Number(b[i].quantity) ||
      Number(a[i].unitPrice) !== Number(b[i].unitPrice)
    ) {
      return false;
    }
  }
  return true;
}

function isDraftDirty() {
  const draft = state.workingDraft;
  if (!draft) {
    return false;
  }

  const hasContent = draft.name.trim() !== "" || draft.items.length > 0;
  if (!draft.cartId) {
    return hasContent;
  }

  const budget = getBudgetById(draft.budgetId) || getActiveBudget();
  const saved = getSavedCart(budget, draft.cartId);
  if (!saved) {
    return hasContent;
  }

  return draft.name.trim() !== saved.name || !itemsAreEqual(draft.items, saved.items);
}

function showError(id, message) {
  const el = document.getElementById(id);
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = message;
}

function parseNonNegativeNumber(rawValue, fieldName) {
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    return { ok: false, message: fieldName + " is required." };
  }
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    return { ok: false, message: fieldName + " must be a number." };
  }
  if (value < 0) {
    return { ok: false, message: fieldName + " cannot be negative." };
  }
  return { ok: true, value: value };
}

function readItemForm() {
  const name = document.getElementById("item-name").value.trim();
  const qtyResult = parseNonNegativeNumber(document.getElementById("item-qty").value, "Quantity");
  const priceResult = parseNonNegativeNumber(document.getElementById("item-price").value, "Unit price");

  if (!name) {
    return { ok: false, message: "Item name is required." };
  }
  if (!qtyResult.ok) {
    return qtyResult;
  }
  if (!priceResult.ok) {
    return priceResult;
  }

  return {
    ok: true,
    name: name,
    quantity: qtyResult.value,
    unitPrice: roundMoney(priceResult.value)
  };
}

function clearItemForm() {
  document.getElementById("item-name").value = "";
  document.getElementById("item-qty").value = "1";
  document.getElementById("item-price").value = "0";
}

function ensureDraft() {
  if (!state.workingDraft && state.activeBudgetId) {
    state.workingDraft = createEmptyDraft(state.activeBudgetId);
  }
}

function markTotalsFromChange() {
  if (state.calcMode === "auto") {
    state.displayedTotal = state.workingDraft ? cartTotal(state.workingDraft.items) : 0;
    state.totalsStale = false;
  } else {
    state.totalsStale = true;
  }
}

function calculateDisplayedTotal() {
  const items = state.workingDraft ? state.workingDraft.items : [];
  state.displayedTotal = cartTotal(items);
  state.totalsStale = false;
}

function saveCartFromDraft() {
  const budget = getActiveBudget();
  if (!budget) {
    showError("cart-form-error", "Create or select a budget before saving a cart.");
    return false;
  }

  ensureDraft();
  state.workingDraft.name = document.getElementById("cart-name").value;
  const name = state.workingDraft.name.trim();
  if (!name) {
    showError("cart-form-error", "Cart name is required before saving.");
    return false;
  }

  const existingCart = getSavedCart(budget, state.workingDraft.cartId);
  const cartData = {
    id: state.workingDraft.cartId || generateId(),
    name: name,
    items: cloneItems(state.workingDraft.items),
    favorite: existingCart ? existingCart.favorite === true : false,
    updatedAt: nowIso()
  };

  if (state.workingDraft.cartId) {
    const index = budget.carts.findIndex(function (cart) {
      return cart.id === state.workingDraft.cartId;
    });
    if (index >= 0) {
      budget.carts[index] = cartData;
    } else {
      budget.carts.push(cartData);
    }
  } else {
    budget.carts.push(cartData);
    state.workingDraft.cartId = cartData.id;
  }

  budget.updatedAt = nowIso();
  showError("cart-form-error", "");
  persistApp();
  return true;
}

function loadCartIntoDraft(cart) {
  const budget = getActiveBudget();
  state.workingDraft = {
    budgetId: budget ? budget.id : null,
    cartId: cart.id,
    name: cart.name,
    items: cloneItems(cart.items)
  };
  state.selectedItemId = null;
  clearItemForm();
  calculateDisplayedTotal();
}

function startNewDraft() {
  const budget = getActiveBudget();
  state.workingDraft = budget ? createEmptyDraft(budget.id) : null;
  state.selectedItemId = null;
  calculateDisplayedTotal();
  clearItemForm();
}

function runGuarded(action) {
  if (!isDraftDirty()) {
    performAction(action);
    return;
  }
  state.pendingAction = action;
  openModal(
    "unsaved",
    "Unsaved changes",
    "You have unsaved changes in the current cart. Save them, discard them, or cancel to stay here.",
    [
      { id: "modal-save", label: "Save", className: "btn btn-primary" },
      { id: "modal-discard", label: "Discard", className: "btn btn-danger" },
      { id: "modal-cancel", label: "Cancel", className: "btn btn-secondary" }
    ]
  );
}

function performAction(action) {
  if (!action) {
    return;
  }
  if (action.type === "switchBudget") {
    switchBudget(action.budgetId);
  } else if (action.type === "createBudget") {
    finishCreateBudget(action.name, action.limit);
  } else if (action.type === "openCart") {
    const budget = getActiveBudget();
    const cart = getSavedCart(budget, action.cartId);
    if (cart) {
      loadCartIntoDraft(cart);
    }
  } else if (action.type === "newCart") {
    startNewDraft();
  } else if (action.type === "duplicateCart") {
    finishDuplicateCart(action.cartId);
  }
  persistApp();
  render();
}

function switchBudget(budgetId) {
  const budget = getBudgetById(budgetId);
  if (!budget) {
    return;
  }
  state.activeBudgetId = budgetId;
  state.editingBudgetId = null;
  state.workingDraft = createEmptyDraft(budgetId);
  state.selectedItemId = null;
  clearItemForm();
  calculateDisplayedTotal();
}

function finishCreateBudget(name, limit) {
  const budget = {
    id: generateId(),
    name: name,
    limit: roundMoney(limit),
    carts: [],
    updatedAt: nowIso()
  };
  state.budgets.push(budget);
  state.activeBudgetId = budget.id;
  state.editingBudgetId = null;
  state.workingDraft = createEmptyDraft(budget.id);
  state.selectedItemId = null;
  clearItemForm();
  calculateDisplayedTotal();
  document.getElementById("budget-name").value = "";
  document.getElementById("budget-limit").value = "";
}

function finishDuplicateCart(cartId) {
  const budget = getActiveBudget();
  const cart = getSavedCart(budget, cartId);
  if (!cart) {
    return;
  }
  state.workingDraft = {
    budgetId: budget.id,
    cartId: null,
    name: cart.name + " (copy)",
    items: cloneItemsWithNewIds(cart.items)
  };
  state.selectedItemId = null;
  clearItemForm();
  calculateDisplayedTotal();
}

function deleteBudgetById(budgetId) {
  const index = state.budgets.findIndex(function (budget) {
    return budget.id === budgetId;
  });
  if (index < 0) {
    return;
  }

  const wasActive = state.activeBudgetId === budgetId;
  state.budgets.splice(index, 1);

  if (wasActive) {
    const nextBudget = state.budgets[0] || null;
    state.activeBudgetId = nextBudget ? nextBudget.id : null;
    state.workingDraft = nextBudget ? createEmptyDraft(nextBudget.id) : null;
    state.selectedItemId = null;
    calculateDisplayedTotal();
  } else if (state.workingDraft && state.workingDraft.budgetId === budgetId) {
    startNewDraft();
  }

  if (state.editingBudgetId === budgetId) {
    state.editingBudgetId = null;
  }
}

function toggleCartFavorite(cartId) {
  const budget = getActiveBudget();
  const cart = getSavedCart(budget, cartId);
  if (!cart) {
    return;
  }
  cart.favorite = !cart.favorite;
  budget.updatedAt = nowIso();
  persistApp();
  render();
}

function deleteSavedCartById(cartId) {
  const budget = getActiveBudget();
  if (!budget) {
    return;
  }
  budget.carts = budget.carts.filter(function (cart) {
    return cart.id !== cartId;
  });
  budget.updatedAt = nowIso();

  if (state.workingDraft && state.workingDraft.cartId === cartId) {
    state.workingDraft.cartId = null;
  }
}

function openModal(kind, title, message, actions) {
  state.modalKind = kind;
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-message").textContent = message;

  const actionsEl = document.getElementById("modal-actions");
  actionsEl.innerHTML = "";
  actions.forEach(function (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = action.id;
    button.className = action.className;
    button.textContent = action.label;
    actionsEl.appendChild(button);
  });

  const overlay = document.getElementById("modal-overlay");
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
}

function closeModal() {
  state.modalKind = null;
  const overlay = document.getElementById("modal-overlay");
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  document.getElementById("modal-actions").innerHTML = "";
}

function handleModalAction(buttonId) {
  if (state.modalKind === "unsaved") {
    if (buttonId === "modal-cancel") {
      state.pendingAction = null;
      closeModal();
      return;
    }
    if (buttonId === "modal-discard") {
      const action = state.pendingAction;
      state.pendingAction = null;
      closeModal();
      performAction(action);
      return;
    }
    if (buttonId === "modal-save") {
      const saved = saveCartFromDraft();
      if (!saved) {
        closeModal();
        render();
        return;
      }
      const action = state.pendingAction;
      state.pendingAction = null;
      closeModal();
      performAction(action);
      return;
    }
  }

  if (state.modalKind === "delete-budget") {
    if (buttonId === "modal-cancel") {
      state.pendingAction = null;
      closeModal();
      return;
    }
    if (buttonId === "modal-confirm") {
      const budgetId = state.pendingAction && state.pendingAction.budgetId;
      state.pendingAction = null;
      closeModal();
      deleteBudgetById(budgetId);
      persistApp();
      render();
    }
  }

  if (state.modalKind === "delete-cart") {
    if (buttonId === "modal-cancel") {
      state.pendingAction = null;
      closeModal();
      return;
    }
    if (buttonId === "modal-confirm") {
      const cartId = state.pendingAction && state.pendingAction.cartId;
      state.pendingAction = null;
      closeModal();
      deleteSavedCartById(cartId);
      persistApp();
      render();
    }
  }
}

function renderModeToggle() {
  const radios = document.querySelectorAll("input[name='calc-mode']");
  radios.forEach(function (radio) {
    radio.checked = radio.value === state.calcMode;
  });
}

function renderBudgetForm() {
  const submit = document.getElementById("budget-submit");
  const cancel = document.getElementById("budget-cancel-edit");
  if (state.editingBudgetId) {
    submit.textContent = "Save budget details";
    cancel.hidden = false;
  } else {
    submit.textContent = "Add budget";
    cancel.hidden = true;
  }
}

function renderBudgets() {
  const list = document.getElementById("budget-list");
  const empty = document.getElementById("budgets-empty");
  list.innerHTML = "";

  if (state.budgets.length === 0) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  state.budgets.forEach(function (budget) {
    const item = document.createElement("li");
    item.className = "budget-card" + (budget.id === state.activeBudgetId ? " active" : "");
    item.dataset.budgetId = budget.id;

    const title = document.createElement("p");
    title.className = "card-title";
    title.textContent = budget.name;

    const meta = document.createElement("p");
    meta.className = "card-meta";
    meta.textContent = "Limit " + formatMoney(budget.limit) + " · " + budget.carts.length + " cart option(s)";

    const actions = document.createElement("div");
    actions.className = "button-row";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn btn-primary btn-small";
    openBtn.dataset.action = "switch-budget";
    openBtn.textContent = budget.id === state.activeBudgetId ? "Active" : "Open";
    if (budget.id === state.activeBudgetId) {
      openBtn.disabled = true;
    }

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-secondary btn-small";
    editBtn.dataset.action = "edit-budget";
    editBtn.textContent = "Edit";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger btn-small";
    deleteBtn.dataset.action = "delete-budget";
    deleteBtn.textContent = "Delete";

    actions.appendChild(openBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

function renderActiveBanner() {
  const banner = document.getElementById("active-budget-text");
  const budget = getActiveBudget();
  if (!budget) {
    banner.textContent = "Create a budget to start adding cart options.";
    return;
  }
  banner.textContent = "Active budget: " + budget.name + " — " + formatMoney(budget.limit);
}

function renderDraftEditor() {
  const hasBudget = Boolean(getActiveBudget());
  const editorControls = [
    "cart-name",
    "item-name",
    "item-qty",
    "item-price",
    "add-item-btn",
    "replace-item-btn",
    "new-cart-btn",
    "calculate-btn",
    "save-cart-btn"
  ];
  editorControls.forEach(function (id) {
    document.getElementById(id).disabled = !hasBudget;
  });

  const draft = state.workingDraft;
  const nameInput = document.getElementById("cart-name");
  if (document.activeElement !== nameInput) {
    nameInput.value = draft ? draft.name : "";
  }

  const label = document.getElementById("draft-label");
  if (!hasBudget) {
    label.textContent = "Select a budget first.";
  } else if (draft && draft.cartId) {
    label.textContent = "Editing a saved cart. Changes stay in this draft until you click Save cart.";
  } else {
    label.textContent = "New unsaved cart";
  }

  const hint = document.getElementById("item-selection-hint");
  hint.hidden = !state.selectedItemId;
}

function renderItems() {
  const body = document.getElementById("item-table-body");
  const empty = document.getElementById("items-empty");
  const items = state.workingDraft ? state.workingDraft.items : [];
  body.innerHTML = "";

  if (items.length === 0) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  items.forEach(function (item) {
    const row = document.createElement("tr");
    row.dataset.itemId = item.id;
    if (item.id === state.selectedItemId) {
      row.classList.add("selected");
    }

    const nameCell = document.createElement("td");
    nameCell.textContent = item.name;

    const qtyCell = document.createElement("td");
    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "0";
    qtyInput.step = "1";
    qtyInput.value = item.quantity;
    qtyInput.dataset.field = "quantity";
    qtyCell.appendChild(qtyInput);

    const priceCell = document.createElement("td");
    const priceInput = document.createElement("input");
    priceInput.type = "number";
    priceInput.min = "0";
    priceInput.step = "0.01";
    priceInput.value = item.unitPrice;
    priceInput.dataset.field = "unitPrice";
    priceCell.appendChild(priceInput);

    const totalCell = document.createElement("td");
    totalCell.textContent = formatMoney(lineTotal(item));

    const actionCell = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger btn-small";
    deleteBtn.dataset.action = "delete-item";
    deleteBtn.textContent = "Delete";
    actionCell.appendChild(deleteBtn);

    row.appendChild(nameCell);
    row.appendChild(qtyCell);
    row.appendChild(priceCell);
    row.appendChild(totalCell);
    row.appendChild(actionCell);
    body.appendChild(row);
  });
}

function renderTotals() {
  const budget = getActiveBudget();
  const total = state.displayedTotal;
  document.getElementById("cart-total").textContent = formatMoney(total);

  const statusEl = document.getElementById("budget-status");
  if (!budget) {
    statusEl.className = "status-badge status-none";
    statusEl.textContent = "No budget selected";
  } else {
    const status = compareToBudget(total, budget.limit);
    statusEl.className = "status-badge status-" + status;
    statusEl.textContent = statusLabel(status);
  }

  const stale = document.getElementById("totals-stale");
  stale.hidden = !(state.calcMode === "manual" && state.totalsStale);
}

function renderSavedCarts() {
  const list = document.getElementById("saved-cart-list");
  const empty = document.getElementById("saved-empty");
  const budget = getActiveBudget();
  list.innerHTML = "";

  if (!budget || budget.carts.length === 0) {
    empty.hidden = false;
    empty.textContent = budget
      ? "No saved carts for this budget."
      : "No saved carts yet. Create a budget first.";
    return;
  }

  empty.hidden = true;
  budget.carts.forEach(function (cart) {
    const total = cartTotal(cart.items);
    const status = compareToBudget(total, budget.limit);
    const item = document.createElement("li");
    item.className = "saved-card";
    item.dataset.cartId = cart.id;

    const header = document.createElement("div");
    header.className = "saved-card-header";

    const title = document.createElement("p");
    title.className = "card-title";
    title.textContent = cart.name;

    const starBtn = document.createElement("button");
    starBtn.type = "button";
    starBtn.className = "star-btn" + (cart.favorite ? " favorite" : "");
    starBtn.dataset.action = "toggle-favorite";
    starBtn.setAttribute("aria-pressed", cart.favorite ? "true" : "false");
    starBtn.setAttribute(
      "aria-label",
      cart.favorite ? "Remove " + cart.name + " from favorites" : "Mark " + cart.name + " as favorite"
    );
    starBtn.textContent = cart.favorite ? "★" : "☆";

    header.appendChild(title);
    header.appendChild(starBtn);

    const meta = document.createElement("p");
    meta.className = "card-meta";
    meta.textContent = formatMoney(total) + " · " + statusLabel(status);

    const actions = document.createElement("div");
    actions.className = "button-row";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn btn-primary btn-small";
    openBtn.dataset.action = "open-cart";
    openBtn.textContent = "Open";

    const duplicateBtn = document.createElement("button");
    duplicateBtn.type = "button";
    duplicateBtn.className = "btn btn-secondary btn-small";
    duplicateBtn.dataset.action = "duplicate-cart";
    duplicateBtn.textContent = "Duplicate";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger btn-small";
    deleteBtn.dataset.action = "delete-cart";
    deleteBtn.textContent = "Delete";

    actions.appendChild(openBtn);
    actions.appendChild(duplicateBtn);
    actions.appendChild(deleteBtn);
    item.appendChild(header);
    item.appendChild(meta);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

function render() {
  renderModeToggle();
  renderBudgetForm();
  renderBudgets();
  renderActiveBanner();
  renderDraftEditor();
  renderItems();
  renderTotals();
  renderSavedCarts();
}

function fillItemFormFromItem(item) {
  document.getElementById("item-name").value = item.name;
  document.getElementById("item-qty").value = item.quantity;
  document.getElementById("item-price").value = item.unitPrice;
}

function onAddItem(event) {
  event.preventDefault();
  if (!getActiveBudget()) {
    return;
  }
  const result = readItemForm();
  if (!result.ok) {
    showError("item-form-error", result.message);
    return;
  }

  ensureDraft();
  state.workingDraft.items.push({
    id: generateId(),
    name: result.name,
    quantity: result.quantity,
    unitPrice: result.unitPrice
  });
  state.selectedItemId = null;
  showError("item-form-error", "");
  clearItemForm();
  markTotalsFromChange();
  persistApp();
  render();
}

function onReplaceItem() {
  if (!getActiveBudget()) {
    return;
  }
  if (!state.selectedItemId) {
    showError("item-form-error", "Select an item in the table first, then click Replace selected.");
    return;
  }

  const result = readItemForm();
  if (!result.ok) {
    showError("item-form-error", result.message);
    return;
  }

  const item = state.workingDraft.items.find(function (entry) {
    return entry.id === state.selectedItemId;
  });
  if (!item) {
    showError("item-form-error", "The selected item is no longer in this cart.");
    state.selectedItemId = null;
    render();
    return;
  }

  item.name = result.name;
  item.quantity = result.quantity;
  item.unitPrice = result.unitPrice;
  showError("item-form-error", "");
  markTotalsFromChange();
  persistApp();
  render();
}

function onDeleteItem(itemId) {
  if (!state.workingDraft) {
    return;
  }
  state.workingDraft.items = state.workingDraft.items.filter(function (item) {
    return item.id !== itemId;
  });
  if (state.selectedItemId === itemId) {
    state.selectedItemId = null;
    clearItemForm();
  }
  showError("item-form-error", "");
  markTotalsFromChange();
  persistApp();
  render();
}

function onItemFieldChange(itemId, field, rawValue) {
  const item = state.workingDraft.items.find(function (entry) {
    return entry.id === itemId;
  });
  if (!item) {
    return;
  }

  const label = field === "quantity" ? "Quantity" : "Unit price";
  const parsed = parseNonNegativeNumber(rawValue, label);
  if (!parsed.ok) {
    showError("item-form-error", parsed.message);
    render();
    return;
  }

  item[field] = field === "unitPrice" ? roundMoney(parsed.value) : parsed.value;
  showError("item-form-error", "");
  markTotalsFromChange();
  persistApp();
  render();
}

function onCartNameInput() {
  ensureDraft();
  if (!state.workingDraft) {
    return;
  }
  state.workingDraft.name = document.getElementById("cart-name").value;
  persistApp();
}

function onBudgetSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("budget-name").value.trim();
  const limitResult = parseNonNegativeNumber(document.getElementById("budget-limit").value, "Spending limit");

  if (!name) {
    showError("budget-form-error", "Budget name is required.");
    return;
  }
  if (!limitResult.ok) {
    showError("budget-form-error", limitResult.message);
    return;
  }

  showError("budget-form-error", "");

  if (state.editingBudgetId) {
    const budget = getBudgetById(state.editingBudgetId);
    if (budget) {
      budget.name = name;
      budget.limit = roundMoney(limitResult.value);
      budget.updatedAt = nowIso();
    }
    state.editingBudgetId = null;
    document.getElementById("budget-name").value = "";
    document.getElementById("budget-limit").value = "";
    persistApp();
    render();
    return;
  }

  runGuarded({
    type: "createBudget",
    name: name,
    limit: limitResult.value
  });
}

function onEditBudget(budgetId) {
  const budget = getBudgetById(budgetId);
  if (!budget) {
    return;
  }
  state.editingBudgetId = budgetId;
  document.getElementById("budget-name").value = budget.name;
  document.getElementById("budget-limit").value = budget.limit;
  showError("budget-form-error", "");
  render();
}

function onCancelBudgetEdit() {
  state.editingBudgetId = null;
  document.getElementById("budget-name").value = "";
  document.getElementById("budget-limit").value = "";
  showError("budget-form-error", "");
  render();
}

function requestDeleteBudget(budgetId) {
  const budget = getBudgetById(budgetId);
  if (!budget) {
    return;
  }
  state.pendingAction = { type: "deleteBudget", budgetId: budgetId };
  openModal(
    "delete-budget",
    "Delete budget?",
    'Delete budget "' + budget.name + '"? All cart options saved under this budget will also be deleted. This cannot be undone.',
    [
      { id: "modal-confirm", label: "Confirm delete", className: "btn btn-danger" },
      { id: "modal-cancel", label: "Cancel", className: "btn btn-secondary" }
    ]
  );
}

function requestDeleteCart(cartId) {
  const budget = getActiveBudget();
  const cart = getSavedCart(budget, cartId);
  if (!cart) {
    return;
  }
  state.pendingAction = { type: "deleteCart", cartId: cartId };
  openModal(
    "delete-cart",
    "Delete cart option?",
    'Delete saved cart "' + cart.name + '"? This cannot be undone.',
    [
      { id: "modal-confirm", label: "Confirm delete", className: "btn btn-danger" },
      { id: "modal-cancel", label: "Cancel", className: "btn btn-secondary" }
    ]
  );
}

function bindEvents() {
  document.getElementById("budget-form").addEventListener("submit", onBudgetSubmit);
  document.getElementById("budget-cancel-edit").addEventListener("click", onCancelBudgetEdit);
  document.getElementById("item-form").addEventListener("submit", onAddItem);
  document.getElementById("replace-item-btn").addEventListener("click", onReplaceItem);
  document.getElementById("cart-name").addEventListener("input", onCartNameInput);
  document.getElementById("new-cart-btn").addEventListener("click", function () {
    runGuarded({ type: "newCart" });
  });
  document.getElementById("calculate-btn").addEventListener("click", function () {
    calculateDisplayedTotal();
    showError("cart-form-error", "");
    persistApp();
    render();
  });
  document.getElementById("save-cart-btn").addEventListener("click", function () {
    if (saveCartFromDraft()) {
      persistApp();
      render();
    }
  });

  document.querySelectorAll("input[name='calc-mode']").forEach(function (radio) {
    radio.addEventListener("change", function () {
      const previous = state.calcMode;
      state.calcMode = radio.value;
      if (state.calcMode === "auto" && previous === "manual") {
        calculateDisplayedTotal();
      }
      persistApp();
      render();
    });
  });

  document.getElementById("budget-list").addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }
    const card = button.closest("[data-budget-id]");
    const budgetId = card && card.dataset.budgetId;
    if (button.dataset.action === "switch-budget") {
      runGuarded({ type: "switchBudget", budgetId: budgetId });
    } else if (button.dataset.action === "edit-budget") {
      onEditBudget(budgetId);
    } else if (button.dataset.action === "delete-budget") {
      requestDeleteBudget(budgetId);
    }
  });

  document.getElementById("saved-cart-list").addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }
    const card = button.closest("[data-cart-id]");
    const cartId = card && card.dataset.cartId;
    if (button.dataset.action === "toggle-favorite") {
      toggleCartFavorite(cartId);
    } else if (button.dataset.action === "open-cart") {
      runGuarded({ type: "openCart", cartId: cartId });
    } else if (button.dataset.action === "duplicate-cart") {
      runGuarded({ type: "duplicateCart", cartId: cartId });
    } else if (button.dataset.action === "delete-cart") {
      requestDeleteCart(cartId);
    }
  });

  document.getElementById("item-table-body").addEventListener("click", function (event) {
    const deleteBtn = event.target.closest("[data-action='delete-item']");
    const row = event.target.closest("tr");
    if (!row) {
      return;
    }
    if (deleteBtn) {
      event.stopPropagation();
      onDeleteItem(row.dataset.itemId);
      return;
    }
    if (event.target.tagName === "INPUT") {
      return;
    }
    const item = state.workingDraft && state.workingDraft.items.find(function (entry) {
      return entry.id === row.dataset.itemId;
    });
    if (!item) {
      return;
    }
    state.selectedItemId = item.id;
    fillItemFormFromItem(item);
    showError("item-form-error", "");
    render();
  });

  document.getElementById("item-table-body").addEventListener("change", function (event) {
    const input = event.target;
    if (input.tagName !== "INPUT") {
      return;
    }
    const row = input.closest("tr");
    if (!row) {
      return;
    }
    onItemFieldChange(row.dataset.itemId, input.dataset.field, input.value);
  });

  document.getElementById("modal-overlay").addEventListener("click", function (event) {
    if (event.target.id === "modal-overlay") {
      handleModalAction("modal-cancel");
    }
  });

  document.getElementById("modal-actions").addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (button) {
      handleModalAction(button.id);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && state.modalKind) {
      handleModalAction("modal-cancel");
    }
  });
}

function init() {
  loadApp();
  bindEvents();
  if (state.calcMode === "auto") {
    calculateDisplayedTotal();
  }
  render();
}

init();
