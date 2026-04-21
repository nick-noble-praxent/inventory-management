---
name: vue-analyze
description: Analyze Vue 3 component structure and suggest optimizations for performance and code reuse. Scans all .vue files for anti-patterns, redundancy, and improvement opportunities.
---

# Vue Component Analysis

Analyze every `.vue` file under `client/src/` for performance issues and code reuse opportunities. Produce a prioritized report, then implement the highest-value fixes — delegating all `.vue` edits to the **vue-expert** agent.

## Step 1 — Collect the files

Glob `client/src/**/*.vue` to get the full list. Read each file completely before analyzing.

## Step 2 — Performance checks

For each component, flag any of the following:

### Reactivity

- Methods called in templates that should be `computed` properties (called on every render, not cached)
- `ref()` used for objects that never need to be replaced — prefer `reactive()`
- `reactive()` used for primitives — use `ref()` instead
- Deep watchers (`{ deep: true }`) on large arrays or objects where targeted watchers would suffice
- `watch` with `immediate: true` when `watchEffect` is simpler
- Computed properties that depend on entire reactive arrays but only need a subset

### Template efficiency

- `v-for` + `v-if` on the same element — `v-if` should move to a wrapping `<template>` or the list should be pre-filtered in a computed
- `v-for` using array index as `:key` — use a stable unique id (`sku`, `id`, `month`, etc.)
- Expensive inline expressions in templates (string formatting, math, method calls with arguments) — extract to computed
- `v-show` used for elements that are rarely toggled — `v-if` may be cheaper on initial render
- Missing `v-memo` on large static sub-trees inside `v-for`

### Lifecycle & async

- `async` setup without `<Suspense>` or error handling
- Missing `onUnmounted` cleanup for timers, event listeners, or abort controllers started in `onMounted`
- API calls triggered inside watchers that aren't debounced — parallel calls possible on fast filter changes

### SVG / chart rendering

- Inline SVG paths or `<path d="...">` values computed in the template — move to `computed` or a constant
- Chart data arrays rebuilt on every render instead of being derived from a `computed`

---

## Step 3 — Code reuse checks

### Duplicated logic across views

Look for functions with the same name or structure defined in multiple view files:

- `formatCurrency`, `formatDate`, `formatNumber`, or similar formatters
- Status-to-CSS-class mappings (e.g. `getStatusClass`, `statusColor`)
- Loading/error state management (`isLoading`, `error`, try/catch fetch wrappers)
- Filter application logic repeated across `Inventory.vue`, `Orders.vue`, `Demand.vue`, etc.

If 2+ views share ≥5 lines of identical or near-identical logic, flag for extraction into a **composable** under `client/src/composables/`.

### Repeated template patterns

Look for structurally identical blocks appearing in 2+ files:

- Empty-state messages (`<div class="...">No data found</div>`)
- Loading spinners
- Status badge markup (`<span :class="...">{{ status }}</span>`)
- Modal headers/footers
- Stat cards (icon + label + value layout)

If a template block appears in 3+ places, flag for extraction into a reusable component under `client/src/components/`.

### Modal component redundancy

The codebase has multiple detail modals (`BacklogDetailModal`, `CostDetailModal`, `InventoryDetailModal`, `ProductDetailModal`). Check whether they share:

- Close button logic
- Backdrop/overlay structure
- Header slot pattern

If yes, suggest a `BaseModal.vue` wrapper.

---

## Step 4 — Report format

After analysis, output a structured report:

```
## Vue Component Analysis Report

### Critical (breaks correctness or causes visible lag)
1. [File:line] Issue — Recommended fix

### High (noticeable performance impact)
1. ...

### Medium (code quality, maintainability)
1. ...

### Code Reuse Opportunities
- [Opportunity] — Files affected — Suggested extraction target

### Already Well-Optimized
- List patterns that are done correctly to confirm what to keep
```

---

## Step 5 — Implement fixes

After presenting the report, ask the user which priority tiers to fix (default: Critical + High).

For each approved fix:

- **Delegate all `.vue` file changes to the vue-expert agent** with a precise prompt that includes the file path, the line range, the current pattern, and the exact replacement
- For new composables (`.js` files under `client/src/composables/`), write them directly
- For new component extractions, delegate the new `.vue` file creation to vue-expert and update all callers via vue-expert as well

After all edits, spawn the **code-reviewer** agent to verify the changes.

---

## Patterns specific to this codebase

- Views use `allOrders`, `inventoryItems`, etc. as raw `ref()` arrays; derived/filtered versions should always be `computed`
- Filter state (`selectedWarehouse`, `selectedCategory`, etc.) lives in `App.vue` and flows down as props — watchers on these props that re-fetch data are intentional
- SVG charts are hand-drawn — check that path calculations are in `computed`, not inline
- No Vuex/Pinia — state is passed via props and emits; composables are the right extraction target for shared logic
- The `client/src/api.js` module handles all fetch calls — views should not call `fetch` directly
