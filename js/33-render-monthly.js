// 33-render-monthly.js
// Monthly stats section (month picker + numbers)

async function renderMonthlyStats() {
  if (!monthLabel || !monthGrossEl || !monthNetEl || !monthMyEl) return;

  const keys = getAllMonthKeysForMode(appState.grandMode);
  const currentKey = await getCurrentMonthKey(appState.grandMode);
  const totals = calcMonthlyTotals(currentKey, appState.grandMode);
  // status badges: მხოლოდ currentKey თვის rows-ები (overlap-ით)
  let status;

if (appState.grandMode === "active") {
  const current = activeGroup();
  status = current
    ? calcGroupStatusCounts(current)
    : { done: 0, fail: 0, fixed: 0 };
} else {
  status = calcStatusCountsByMode("all");
}

  const doneEl = document.getElementById("monthDone");
  const failEl = document.getElementById("monthFail");
  const fixedEl = document.getElementById("monthFixed");

  monthLabel.textContent = formatMonthKey(currentKey);
  animateNumber(monthGrossEl, totals.gross);
  animateNumber(monthNetEl, totals.net);
  animateNumber(monthMyEl, totals.my);

  if (doneEl) doneEl.textContent = status.done;
  if (failEl) failEl.textContent = status.fail;
  if (fixedEl) fixedEl.textContent = status.fixed;

  if (monthPrevBtn) monthPrevBtn.disabled = !currentKey || currentKey === keys[0];
  if (monthNextBtn) monthNextBtn.disabled = !currentKey || currentKey === keys[keys.length - 1];
}

async function renderMonthlySection() {
  await renderMonthlyStats();
}