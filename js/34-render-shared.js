// 34-render-shared.js
// Shared UI updates: grand totals, group select, controls button, floating FAB, etc.

function renderGrandTotals() {
  const grand = calcGrandTotalsByMode(appState.grandMode);

  if (grandGrossEl) {
    animateNumber(grandGrossEl, grand.gross);
    grandGrossEl.classList.add("total-flash");
    setTimeout(() => grandGrossEl.classList.remove("total-flash"), 280);
  }

  if (grandNetEl) {
    animateNumber(grandNetEl, grand.net);
    grandNetEl.classList.add("total-flash");
    setTimeout(() => grandNetEl.classList.remove("total-flash"), 280);
  }

  if (grandMyEl) {
    animateNumber(grandMyEl, grand.my);
    grandMyEl.classList.add("total-flash");
    setTimeout(() => grandMyEl.classList.remove("total-flash"), 280);
  }
}

function updateControlsButtonLabel() {
  const btn = document.getElementById("controlsToggle");
  if (!btn) return;

  const group = activeGroup();

  if (!group || !group.name || !group.name.trim()) {
    btn.textContent = "👤 Select";
    return;
  }

  let name = group.name.trim();
  name = name.split(" ")[0];
  const MAX = 8;
  if (name.length > MAX) {
    name = name.slice(0, MAX);
  }
  btn.textContent = `👤 ${name}`;
}

function renderGroupSelect() {
  if (!groupPickerBtn || !groupPickerBtnText) return;
  const g = activeGroup();
  if (!g) {
    groupPickerBtnText.textContent = "Select group";
    return;
  }
  groupPickerBtnText.textContent = g.archived ? `📦 ${g.name}` : g.name;
}

function updateFloatingAddClientVisibility() {
  if (!fabAddClient) return;
  const isEdit = appState.uiMode === "edit";
  const g = activeGroup();
  const hasPeriods = !!g?.data?.periods?.length;
  fabAddClient.hidden = !(isEdit && hasPeriods);
  fabAddClient.style.display = isEdit && hasPeriods ? "" : "none";
}

function getDigitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function isSuspiciousNetComparedToGross(grossValue, netValue) {
  const grossDigits = getDigitsOnly(grossValue);
  const netDigits = getDigitsOnly(netValue);
  if (!grossDigits || !netDigits) return false;
  return grossDigits.length === netDigits.length + 1;
}

// ========== MISSING FUNCTIONS (for bind-events and render) ==========
function updateGrandToggleUI() {
  if (!totalsActiveBtn || !totalsAllBtn) return;
  const isActive = appState.grandMode === "active";
  totalsActiveBtn.classList.toggle("active", isActive);
  totalsAllBtn.classList.toggle("active", !isActive);
}