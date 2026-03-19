/* =========================================================
   Client Totals (Groups Edition) — Stable + Clean
========================================================= */

/* =========================
   1) Storage Keys
========================= */

const STORAGE_KEY = "client_totals_groups_v1";
const CONTROLS_KEY = "ct_controls_collapsed";
const THEME_KEY = "ct_theme_v1";
const SUMMARY_COLLAPSED_KEY = "ct_summary_collapsed";
const MONTH_CURSOR_KEY = "ct_month_cursor";
const PERIODS_COLLAPSED_KEY = "ct_periods_collapsed";

/* =========================
   2) DOM
========================= */

const rootEl = document.documentElement;

// Main UI
const modeEditBtn = document.getElementById("modeEditBtn");
const modeReviewBtn = document.getElementById("modeReviewBtn");
const editView = document.getElementById("editView");
const reviewView = document.getElementById("reviewView");
const elPeriods = document.getElementById("periods");
const tplPeriod = document.getElementById("periodTpl");
const tplRow = document.getElementById("rowTpl");

const defaultRateInput = document.getElementById("defaultRate");
const addPeriodBtn = document.getElementById("addPeriodBtn");
const resetBtn = document.getElementById("resetBtn");

const grandGrossEl = document.getElementById("grandGross");
const grandNetEl = document.getElementById("grandNet");
const grandMyEl = document.getElementById("grandMy");

// Summary + Monthly stats
const summarySection = document.querySelector(".summary.card");
const summaryCollapseBtn = document.getElementById("summaryCollapseBtn");
const monthPrevBtn = document.getElementById("monthPrevBtn");
const monthNextBtn = document.getElementById("monthNextBtn");
const monthLabel = document.getElementById("monthLabel");
const monthGrossEl = document.getElementById("monthGross");
const monthNetEl = document.getElementById("monthNet");
const monthMyEl = document.getElementById("monthMy");

// Groups UI
const groupSelect = document.getElementById("groupSelect");
const addGroupBtn = document.getElementById("addGroupBtn");
const renameGroupBtn = document.getElementById("renameGroupBtn");
const deleteGroupBtn = document.getElementById("deleteGroupBtn");

// Grand Total toggle
const totalsActiveBtn = document.getElementById("totalsActiveBtn");
const totalsAllBtn = document.getElementById("totalsAllBtn");
const totalsArchivedBtn = document.getElementById("totalsArchivedBtn");

// Review group toggle
const reviewGroupToggle = document.getElementById("reviewGroupToggle");
const reviewActiveBtn = document.getElementById("reviewActiveBtn");
const reviewArchivedBtn = document.getElementById("reviewArchivedBtn");

// Export/Import ALL groups
const pdfAllBtn = document.getElementById("pdfAllBtn");
const exportAllBtn = document.getElementById("exportAllBtn");
const importAllInput = document.getElementById("importAllInput");

// Action groups for edit/review modes
const editActions = document.querySelector('.edit-actions');
const reviewActions = document.querySelector('.review-actions');

// Scroll-to-top
const toTopBtn = document.getElementById("toTopBtn");

// Controls collapse
const controlsToggle = document.getElementById("controlsToggle");

// Floating add client
const fabAddClient = document.getElementById("fabAddClient");

// Confirm modal
const confirmBackdrop = document.getElementById("confirmModal");
const confirmTitleEl = document.getElementById("confirmTitle");
const confirmTextEl = document.getElementById("confirmText");
const confirmNoBtn = document.getElementById("confirmNo");
const confirmYesBtn = document.getElementById("confirmYes");

// Status list modal
const statusListModal = document.getElementById("statusListModal");
const statusListTitle = document.getElementById("statusListTitle");
const statusListBody = document.getElementById("statusListBody");
const statusListClose = document.getElementById("statusListClose");

// Theme controls
const themeSwitch = document.getElementById("themeSwitch");

// Archive controls
let showArchived = false;

// Text prompt modal
const textPromptModal = document.getElementById("textPromptModal");
const textPromptTitle = document.getElementById("textPromptTitle");
const textPromptText = document.getElementById("textPromptText");
const textPromptInput = document.getElementById("textPromptInput");
const textPromptCancel = document.getElementById("textPromptCancel");
const textPromptOk = document.getElementById("textPromptOk");

/* =========================
   3) App State
========================= */

let appState = loadState();

/* =========================
   4) Utilities
========================= */

function uuid() {
  return crypto?.randomUUID?.() ?? `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function fmt(n) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function animateNumber(el, to, duration = 380) {
  if (!el) return;

  const target = Number(to) || 0;
  const prev = Number(el.dataset.value || 0);

  if (Math.abs(target - prev) < 0.01) {
    el.textContent = fmt(target);
    el.dataset.value = String(target);
    return;
  }

  const start = performance.now();

  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = prev + (target - prev) * eased;

    el.textContent = fmt(current);

    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = fmt(target);
      el.dataset.value = String(target);
    }
  }

  requestAnimationFrame(step);
}

function parseMoney(value) {
  if (value == null) return 0;

  let s = String(value).trim();
  if (!s) return 0;

  s = s.replace(/\s+/g, "");

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1 && lastDot === -1) {
    s = s.replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }

  const num = Number(s);
  return Number.isFinite(num) ? num : 0;
}

function clampRate(percent) {
  let p = Number(percent);
  if (!Number.isFinite(p)) p = 0;
  if (p < 0) p = 0;
  if (p > 100) p = 100;
  return p;
}

function safeFileName(name) {
  return (name || "group").toString().trim().replace(/[^\w\-]+/g, "_");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSavedSummaryCollapsed() {
  try {
    return localStorage.getItem(SUMMARY_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function setSummaryCollapsed(v) {
  rootEl.classList.toggle("summary-collapsed", !!v);
  try {
    localStorage.setItem(SUMMARY_COLLAPSED_KEY, v ? "1" : "0");
  } catch {}
}

function getSavedMonthCursor() {
  try {
    return localStorage.getItem(MONTH_CURSOR_KEY) || "";
  } catch {
    return "";
  }
}

function setSavedMonthCursor(v) {
  try {
    localStorage.setItem(MONTH_CURSOR_KEY, v || "");
  } catch {}
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetweenInclusive(a, b) {
  const ms = startOfDay(b) - startOfDay(a);
  return Math.floor(ms / 86400000) + 1;
}

function parseDateOnly(dateStr) {
  if (!dateStr) return null;

  const s = String(dateStr).trim();

  if (s.includes("-")) {
    const parts = s.split("-");
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      const out = new Date(y, m, d);
      if (!Number.isNaN(out.getTime())) return out;
    }
  }

  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length === 3) {
      const d = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const y = Number(parts[2]);
      const out = new Date(y, m, d);
      if (!Number.isNaN(out.getTime())) return out;
    }
  }

  return null;
}

function monthKeyFromDateObj(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthKey(monthKey) {
  if (!monthKey) return "No data";
  const [y, m] = monthKey.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function getMonthStart(monthKey) {
  const [y, m] = monthKey.split("-");
  return new Date(Number(y), Number(m) - 1, 1);
}

function getMonthEnd(monthKey) {
  const [y, m] = monthKey.split("-");
  return new Date(Number(y), Number(m), 0);
}

function getAllMonthKeysForMode(mode = appState.grandMode) {
  const groups = getGroupsByMode(mode);
  const keys = new Set();

  groups.forEach((gr) => {
    (gr?.data?.periods || []).forEach((p) => {
      const from = parseDateOnly(p?.from);
      const to = parseDateOnly(p?.to);
      if (!from || !to) return;

      let cur = new Date(from.getFullYear(), from.getMonth(), 1);
      const last = new Date(to.getFullYear(), to.getMonth(), 1);

      while (cur <= last) {
        keys.add(monthKeyFromDateObj(cur));
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
    });
  });

  return [...keys].sort();
}

function getCurrentMonthKey(mode = appState.grandMode) {
  const keys = getAllMonthKeysForMode(mode);
  if (!keys.length) return "";

  const saved = getSavedMonthCursor();
  if (saved && keys.includes(saved)) return saved;

  return keys[keys.length - 1];
}

function getOverlapDaysInclusive(periodFrom, periodTo, monthStart, monthEnd) {
  const start = periodFrom > monthStart ? periodFrom : monthStart;
  const end = periodTo < monthEnd ? periodTo : monthEnd;
  if (start > end) return 0;
  return daysBetweenInclusive(start, end);
}

function formatDateLocal(d) {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatPeriodPreview(from, to) {
  const left = formatDateLocal(from);
  const right = formatDateLocal(to);
  return `${left} → ${right}`;
}

function getClientsByStatus(status) {
  const list = [];
  const groups = getGroupsByMode();

  groups.forEach((group) => {
    (group.data?.periods || []).forEach((period) => {
      (period.rows || []).forEach((row) => {
        if (row.done === status) {
          list.push({
            groupId: group.id,
            groupName: group.name,
            groupArchived: group.archived === true,
            periodId: period.id,
            periodFrom: period.from,
            periodTo: period.to,
            rowId: row.id,
            customer: row.customer || "Client",
            city: row.city || ""
          });
        }
      });
    });
  });

  return list;
}

function closeStatusListModal() {
  if (!statusListModal) return;
  statusListModal.style.display = "none";
  if (statusListBody) statusListBody.innerHTML = "";
}

function openStatusListModal(status, clients) {
  if (!statusListModal || !statusListTitle || !statusListBody) return;

  const statusLabel =
    status === "done" ? "Done" :
    status === "fail" ? "Fail" :
    status === "fixed" ? "Fixed" :
    "Status";
    const statusColor =
  status === "done" ? "status-badge-done" :
  status === "fail" ? "status-badge-fail" :
  status === "fixed" ? "status-badge-fixed" :
  "";

  statusListTitle.innerHTML = `
  <span class="status-badge ${statusColor}">
    ${statusLabel}
  </span>
`;

  if (!clients.length) {
    statusListBody.innerHTML = `<div class="status-list-empty">No clients found with this status.</div>`;
    statusListModal.style.display = "flex";
    history.pushState({ modal: "statusList" }, "");
    return;
  }
  
  function goToClientFromStatusList(item) {
  if (!item) return;

  appState.activeGroupId = item.groupId;
  saveState();

  setPeriodCollapsed(item.periodId, false);
  setMode("edit");
  render();

  requestAnimationFrame(() => {
    const periodEl = document.querySelector(`.period[data-period-id="${item.periodId}"]`);
    const rowEl = document.querySelector(`tr[data-row-id="${item.rowId}"]`);

    if (periodEl) {
      periodEl.classList.remove("is-collapsed");
    }

    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
      rowEl.classList.add("row-highlight");

      setTimeout(() => {
        rowEl.classList.remove("row-highlight");
      }, 1800);
    }
  });
}

function bindStatusListItemClicks(clients) {
  const items = document.querySelectorAll(".status-list-item");

  items.forEach((el, index) => {
    const item = clients[index];
    if (!item) return;

    el.onclick = async () => {
        closeStatusListModal();

    const ok = await askConfirm(
        "Do you really want to go to Edit?",
        "Edit"
       );

     if (!ok) return;

         goToClientFromStatusList(item);
     };
  });
}

  statusListBody.innerHTML = clients.map((item) => `
    <div class="status-list-item">
      <div class="status-list-name">${item.groupArchived ? '📦 ' : ''}${escapeHtml(item.customer)}</div>
      <div class="status-list-meta">
        <span><b>City:</b> ${escapeHtml(item.city || "—")}</span>
        <span><b>Period:</b> ${escapeHtml(formatDateLocal(item.periodFrom))} → ${escapeHtml(formatDateLocal(item.periodTo))}</span>
        <span><b>Group:</b> ${item.groupArchived ? '📦 ' : ''}${escapeHtml(item.groupName)}</span>
      </div>
    </div>
  `).join("");

  statusListModal.style.display = "flex";
  history.pushState({ modal: "statusList" }, "");
  bindStatusListItemClicks(clients);
}

/* =========================
   5) Theme
========================= */

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function setTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  rootEl.setAttribute("data-theme", t);

  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {}

  if (themeSwitch && "checked" in themeSwitch) {
    themeSwitch.checked = t === "light";
  }
}

function toggleTheme() {
  const cur = rootEl.getAttribute("data-theme") === "light" ? "light" : "dark";
  setTheme(cur === "light" ? "dark" : "light");
}

function initTheme() {
  const t = getSavedTheme() || "dark";
  setTheme(t);

  themeSwitch?.addEventListener("change", () => {
    setTheme(themeSwitch.checked ? "light" : "dark");
    render();
    if (appState.uiMode === "review") renderReview();
  });
}

/* =========================
   6) Confirm Modal
========================= */

function hasCustomConfirm() {
  return !!(confirmBackdrop && confirmTitleEl && confirmTextEl && confirmNoBtn && confirmYesBtn);
}

function askConfirm(message, title = "Confirm") {
  return new Promise((resolve) => {
    if (!hasCustomConfirm()) {
      resolve(window.confirm(message));
      return;
    }

    confirmTitleEl.textContent = title;
    confirmTextEl.textContent = message;
    confirmBackdrop.style.display = "flex";
    history.pushState({ modal: "confirm" }, "");

    const cleanup = () => {
      confirmBackdrop.style.display = "none";
      confirmNoBtn.onclick = null;
      confirmYesBtn.onclick = null;
      confirmBackdrop.onclick = null;
      document.onkeydown = null;
    };

    confirmNoBtn.onclick = () => {
      cleanup();
      resolve(false);
    };

    confirmYesBtn.onclick = () => {
      cleanup();
      resolve(true);
    };

    confirmBackdrop.onclick = (e) => {
      if (e.target === confirmBackdrop) {
        cleanup();
        resolve(false);
      }
    };

    document.onkeydown = (e) => {
      if (e.key === "Escape") {
        cleanup();
        resolve(false);
      }
    };
  });
}

function askText(title, message, defaultValue = "", okLabel = "Save") {
  return new Promise((resolve) => {
    if (
      !textPromptModal ||
      !textPromptTitle ||
      !textPromptText ||
      !textPromptInput ||
      !textPromptCancel ||
      !textPromptOk
    ) {
      resolve(window.prompt(message, defaultValue) || "");
      return;
    }

    textPromptTitle.textContent = title;
    textPromptText.textContent = message;
    textPromptInput.value = defaultValue || "";
    textPromptOk.textContent = okLabel;

    textPromptModal.style.display = "flex";
    history.pushState({ modal: "textPrompt" }, "");

    const cleanup = () => {
      textPromptModal.style.display = "none";
      textPromptCancel.onclick = null;
      textPromptOk.onclick = null;
      textPromptModal.onclick = null;
      document.onkeydown = null;
    };

    const submit = () => {
      const value = textPromptInput.value.trim();
      cleanup();
      resolve(value);
    };

    const cancel = () => {
      cleanup();
      resolve("");
    };

    textPromptCancel.onclick = cancel;
    textPromptOk.onclick = submit;

    textPromptModal.onclick = (e) => {
      if (e.target === textPromptModal) cancel();
    };

    document.onkeydown = (e) => {
      if (e.key === "Escape") cancel();
      if (e.key === "Enter") submit();
    };

    setTimeout(() => {
      textPromptInput.focus();
      textPromptInput.select();
    }, 30);
  });
}

/* =========================
   7) Data Model
========================= */

function emptyRow() {
  return { id: uuid(), customer: "", city: "", gross: "", net: "", done: "none" };
}

function defaultGroupData(rate = 15.0) {
  return {
    defaultRatePercent: clampRate(rate),
    periods: [{ id: uuid(), from: "", to: "", rows: [emptyRow()] }],
  };
}

function defaultAppState() {
  const g1 = { 
    id: uuid(), 
    name: "Group 1", 
    archived: false, 
    data: defaultGroupData(15.0) 
  };
  return {
    activeGroupId: g1.id,
    groups: [g1],
    grandMode: "active",
    uiMode: "review",
  };
}

function normalizeGroupData(d) {
  const out = {
    defaultRatePercent: clampRate(d?.defaultRatePercent ?? 13.5),
    periods: Array.isArray(d?.periods) ? d.periods : [],
  };

  if (out.periods.length === 0) out.periods = defaultGroupData().periods;

  out.periods = out.periods.map((p) => ({
    id: p?.id || uuid(),
    from: p?.from || "",
    to: p?.to || "",
    rows:
      Array.isArray(p?.rows) && p.rows.length
        ? p.rows.map((r) => ({
            id: r?.id || uuid(),
            customer: r?.customer ?? "",
            city: r?.city ?? "",
            gross: r?.gross ?? "",
            net: r?.net ?? "",
            done: ["none", "done", "fail", "fixed"].includes(r?.done)
              ? r.done
              : (r?.done === true ? "done" : "none"),
          }))
        : [emptyRow()],
  }));

  return out;
}

function normalizeAppState(s) {
  const groups = Array.isArray(s?.groups) ? s.groups : [];

  const out = {
    activeGroupId: s?.activeGroupId || "",
    groups: [],
    grandMode: s?.grandMode === "all" ? "all" : s?.grandMode === "archived" ? "archived" : "active",
    uiMode: s?.uiMode === "edit" ? "edit" : "review",
  };

  out.groups = (groups.length ? groups : defaultAppState().groups).map((g) => ({
    id: g?.id || uuid(),
    name: (g?.name ?? "Group").toString().trim() || "Group",
    archived: g?.archived === true,
    data: normalizeGroupData(g?.data),
  }));

  if (!out.groups.some((g) => g.id === out.activeGroupId)) {
    out.activeGroupId = out.groups[0].id;
  }

  return out;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAppState();
    return normalizeAppState(JSON.parse(raw));
  } catch {
    return defaultAppState();
  }
}

function activeGroup() {
  const current = appState.groups.find((g) => g.id === appState.activeGroupId);
  if (current) return current;

  const firstActive = appState.groups.find(g => !g.archived);
  return firstActive || appState.groups[0];
}

function getGroupsByMode(mode = appState.grandMode) {
  if (mode === "active") {
    return [activeGroup()];
  } else if (mode === "archived") {
    return appState.groups.filter(g => g.archived);
  } else { // "all"
    return appState.groups.filter(g => !g.archived);
  }
}

function getSavedCollapsedPeriods() {
  try {
    return JSON.parse(localStorage.getItem(PERIODS_COLLAPSED_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCollapsedPeriods(map) {
  try {
    localStorage.setItem(PERIODS_COLLAPSED_KEY, JSON.stringify(map || {}));
  } catch {}
}

function isPeriodCollapsed(periodId) {
  const map = getSavedCollapsedPeriods();
  return !!map[periodId];
}

function setPeriodCollapsed(periodId, collapsed) {
  const map = getSavedCollapsedPeriods();
  map[periodId] = !!collapsed;
  saveCollapsedPeriods(map);
}

/* =========================
   8) Collapse helpers
========================= */

function setControlsCollapsed(v) {
  rootEl.classList.toggle("controls-collapsed", !!v);
  try {
    localStorage.setItem(CONTROLS_KEY, v ? "1" : "0");
  } catch {}
}

function initControlsToggle() {
  controlsToggle?.addEventListener("click", () => {
    const next = !rootEl.classList.contains("controls-collapsed");
    setControlsCollapsed(next);
  });
}

function initSummaryPanel() {
  setSummaryCollapsed(getSavedSummaryCollapsed());

  summaryCollapseBtn?.addEventListener("click", () => {
    const next = !rootEl.classList.contains("summary-collapsed");
    setSummaryCollapsed(next);
  });

  monthPrevBtn?.addEventListener("click", () => shiftMonthCursor(-1));
  monthNextBtn?.addEventListener("click", () => shiftMonthCursor(1));
}

/* =========================
   9) UI helpers
========================= */

function syncRootModeClass(mode = appState.uiMode) {
  rootEl.classList.toggle("is-edit", mode === "edit");
}

function renderGroupSelect() {
  if (!groupSelect) return;

  groupSelect.innerHTML = "";

  const activeGroups = appState.groups.filter(g => !g.archived);
  const archivedGroups = appState.groups.filter(g => g.archived);

  const groupColors = [
    'rgba(93, 212, 255, 0.15)',
    'rgba(52, 211, 153, 0.15)',
    'rgba(251, 191, 36, 0.15)',
    'rgba(248, 113, 113, 0.15)',
    'rgba(192, 132, 252, 0.15)',
    'rgba(45, 212, 191, 0.15)',
    'rgba(251, 146, 60, 0.15)',
    'rgba(232, 121, 249, 0.15)',
  ];

  activeGroups.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.name;
    const globalIdx = appState.groups.findIndex(gr => gr.id === g.id);
    opt.style.backgroundColor = groupColors[globalIdx % groupColors.length];
    groupSelect.appendChild(opt);
  });

  if (archivedGroups.length > 0) {
    const separator = document.createElement("option");
    separator.disabled = true;
    separator.textContent = "──────────";
    groupSelect.appendChild(separator);

    archivedGroups.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = "📦 " + g.name;
      opt.style.opacity = "0.6";
      groupSelect.appendChild(opt);
    });
  }

  if (appState.activeGroupId) {
    groupSelect.value = appState.activeGroupId;
  }
}

function updateGrandToggleUI() {
  if (!totalsActiveBtn || !totalsAllBtn || !totalsArchivedBtn) return;

  const currentGroup = activeGroup();
  const isEditWithArchived = appState.uiMode === "edit" && currentGroup?.archived;

  // Edit-ში archived ჯგუფი: All ღილაკი იმალება, grandMode forced "active"
  if (totalsAllBtn) totalsAllBtn.style.display = isEditWithArchived ? "none" : "";

  // თუ edit-ში archived ჯგუფია, grandMode-ს active-ზე ვაყენებთ
  if (isEditWithArchived && appState.grandMode !== "active") {
    appState.grandMode = "active";
    saveState();
  }

  totalsActiveBtn.classList.toggle("active", appState.grandMode === "active");
  totalsAllBtn.classList.toggle("active", appState.grandMode === "all");
  totalsArchivedBtn.classList.toggle("active", appState.grandMode === "archived");

  if (reviewActiveBtn && reviewArchivedBtn) {
    reviewActiveBtn.classList.toggle("active", appState.grandMode !== "archived");
    reviewArchivedBtn.classList.toggle("active", appState.grandMode === "archived");
  }
}

function updateFloatingAddClientVisibility() {
  const allPeriods = elPeriods?.querySelectorAll?.(".period") ?? [];
  if (!allPeriods.length) {
    rootEl.classList.remove("all-periods-collapsed");
    return;
  }

  const hasOpenPeriod = [...allPeriods].some((sec) => !sec.classList.contains("is-collapsed"));
  rootEl.classList.toggle("all-periods-collapsed", !hasOpenPeriod);
}

function setControlsForMode(mode) {
  const isEdit = mode === "edit";
  syncRootModeClass(mode);

  // აჩვენე/დამალე შესაბამისი ღილაკების ჯგუფები
  if (editActions) editActions.style.display = isEdit ? "flex" : "none";
  if (reviewActions) reviewActions.style.display = isEdit ? "none" : "flex";

  const archiveGroupBtn = document.getElementById("archiveGroupBtn");

  // Edit: Active + All; Review: Active + All + Archived
  if (totalsArchivedBtn) totalsArchivedBtn.style.display = isEdit ? "none" : "";

  // Review group toggle (Active/Archived) — summary კარტის ქვეშ
  if (reviewGroupToggle) reviewGroupToggle.style.display = isEdit ? "none" : "flex";

  const enableAlways = [modeEditBtn, modeReviewBtn, totalsActiveBtn, totalsAllBtn, controlsToggle];
  if (!isEdit) enableAlways.push(totalsArchivedBtn);

  const enableInReview = [groupSelect, pdfAllBtn];
  const enableInEdit = [
    groupSelect, addGroupBtn, renameGroupBtn, deleteGroupBtn, archiveGroupBtn,
    defaultRateInput,
    addPeriodBtn, resetBtn,
  ];

  const all = [
    groupSelect, addGroupBtn, renameGroupBtn, deleteGroupBtn, archiveGroupBtn,
    defaultRateInput,
    addPeriodBtn, resetBtn,
    pdfAllBtn,
  ];

  const setEl = (el, enabled) => {
    if (!el) return;
    if ("disabled" in el) el.disabled = !enabled;
    el.style.pointerEvents = enabled ? "" : "none";
    el.style.opacity = enabled ? "" : "0.55";
  };

  all.forEach((el) => setEl(el, false));
  enableAlways.forEach((el) => setEl(el, true));
  (isEdit ? enableInEdit : enableInReview).forEach((el) => setEl(el, true));

  if (pdfAllBtn) pdfAllBtn.style.display = isEdit ? "none" : "";
}

function setMode(mode) {
  appState.uiMode = mode === "edit" ? "edit" : "review";
  saveState();

  modeEditBtn?.classList.toggle("active", appState.uiMode === "edit");
  modeReviewBtn?.classList.toggle("active", appState.uiMode === "review");

  if (editView && reviewView) {
  const globalSearchCard = document.getElementById("globalSearchCard");

  if (appState.uiMode === "review") {
    editView.hidden = true;
    reviewView.hidden = false;
    if (globalSearchCard) globalSearchCard.hidden = false;
    renderReview();
  } else {
    reviewView.hidden = true;
    reviewView.innerHTML = "";
    if (globalSearchCard) globalSearchCard.hidden = true;
    editView.hidden = false;
  }
}

  setControlsForMode(appState.uiMode);
  updateFloatingAddClientVisibility();
}

/* =========================
   10) Calculations
========================= */

function calcPeriodTotals(period, ratePercent) {
  const gross = period.rows.reduce((sum, r) => sum + parseMoney(r.gross), 0);
  const net = period.rows.reduce((sum, r) => sum + parseMoney(r.net), 0);
  const my = net * (clampRate(ratePercent) / 100);
  return { gross, net, my };
}

function calcGrandTotalsActiveGroup() {
  const g = activeGroup();
  const st = g.data;

  return st.periods.reduce(
    (acc, p) => {
      const t = calcPeriodTotals(p, st.defaultRatePercent);
      acc.gross += t.gross;
      acc.net += t.net;
      acc.my += t.my;
      return acc;
    },
    { gross: 0, net: 0, my: 0 }
  );
}

function calcGrandTotalsByMode(mode = appState.grandMode) {
  const grand = { gross: 0, net: 0, my: 0 };
  const groups = getGroupsByMode(mode);

  groups.forEach((gr) => {
    const st = gr.data;
    st.periods.forEach((p) => {
      const t = calcPeriodTotals(p, st.defaultRatePercent);
      grand.gross += t.gross;
      grand.net += t.net;
      grand.my += t.my;
    });
  });

  return grand;
}

function calcMonthlyTotals(monthKey, mode = appState.grandMode) {
  if (!monthKey) return { gross: 0, net: 0, my: 0 };

  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
  const groups = getGroupsByMode(mode);
  const totals = { gross: 0, net: 0, my: 0 };

  groups.forEach((gr) => {
    const st = gr.data;

    (st.periods || []).forEach((p) => {
      const from = parseDateOnly(p.from);
      const to = parseDateOnly(p.to);
      if (!from || !to || to < from) return;

      const totalDays = daysBetweenInclusive(from, to);
      const overlapDays = getOverlapDaysInclusive(from, to, monthStart, monthEnd);
      if (overlapDays <= 0 || totalDays <= 0) return;

      const ratio = overlapDays / totalDays;
      const t = calcPeriodTotals(p, st.defaultRatePercent);

      totals.gross += t.gross * ratio;
      totals.net += t.net * ratio;
      totals.my += t.my * ratio;
    });
  });

  return totals;
}

function calcMonthlyStatus(monthKey, mode = appState.grandMode) {
  const groups = getGroupsByMode(mode);
  let done = 0, fail = 0, fixed = 0;

  groups.forEach((gr) => {
    (gr.data?.periods || []).forEach((p) => {
      (p.rows || []).forEach((r) => {
        if (r.done === "done") done++;
        else if (r.done === "fail") fail++;
        else if (r.done === "fixed") fixed++;
      });
    });
  });

  return { done, fail, fixed };
}

function renderMonthlyStats() {
  if (!monthLabel || !monthGrossEl || !monthNetEl || !monthMyEl) return;

  const keys = getAllMonthKeysForMode(appState.grandMode);
  const currentKey = getCurrentMonthKey(appState.grandMode);
  const totals = calcMonthlyTotals(currentKey, appState.grandMode);
  const status = calcMonthlyStatus(currentKey, appState.grandMode);

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

function shiftMonthCursor(dir) {
  const keys = getAllMonthKeysForMode(appState.grandMode);
  if (!keys.length) return;

  const currentKey = getCurrentMonthKey(appState.grandMode);
  let idx = keys.indexOf(currentKey);
  if (idx === -1) idx = keys.length - 1;

  idx += dir;
  if (idx < 0) idx = 0;
  if (idx > keys.length - 1) idx = keys.length - 1;

  setSavedMonthCursor(keys[idx]);
  renderMonthlyStats();
}

function recalcAndRenderTotals() {
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

  if (appState.uiMode === "edit") {
    const g = activeGroup();
    const st = g.data;
    const periodSections = elPeriods?.querySelectorAll?.(".period") ?? [];
    periodSections.forEach((sec, i) => {
      const p = st.periods[i];
      if (!p) return;

      const t = calcPeriodTotals(p, st.defaultRatePercent);
      const gEl = sec.querySelector(".total-gross");
      const nEl = sec.querySelector(".total-net");
      const mEl = sec.querySelector(".my-eur");
      if (gEl) gEl.textContent = fmt(t.gross);
      if (nEl) nEl.textContent = fmt(t.net);
      if (mEl) mEl.textContent = fmt(t.my);
    });
  }

  renderMonthlyStats();
}

/* =========================
   11) Period validation
========================= */

function periodsStrictlyOverlap(aFrom, aTo, bFrom, bTo) {
  if (!aFrom || !aTo || !bFrom || !bTo) return false;

  const aStart = parseDateOnly(aFrom);
  const aEnd = parseDateOnly(aTo);
  const bStart = parseDateOnly(bFrom);
  const bEnd = parseDateOnly(bTo);

  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  if (aEnd < aStart || bEnd < bStart) return false;

  return aStart < bEnd && aEnd > bStart;
}

function hasOverlappingPeriodInActiveGroup(periodId, from, to) {
  const g = activeGroup();
  const periods = g?.data?.periods || [];

  return periods.some((p) => {
    if (!p || p.id === periodId) return false;
    return periodsStrictlyOverlap(from, to, p.from, p.to);
  });
}

function isPeriodReversed(from, to) {
  if (!from || !to) return false;

  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);

  if (!fromDate || !toDate) return false;
  return fromDate > toDate;
}

async function validatePeriodWarnings(periodId, from, to, revertFn) {
  if (from && to && isPeriodReversed(from, to)) {
    const ok = await askConfirm(
      "From date is later than To date. Is that correct?",
      "Invalid period"
    );
    if (!ok) {
      revertFn();
      return false;
    }
  }

  if (from && to && hasOverlappingPeriodInActiveGroup(periodId, from, to)) {
    const ok = await askConfirm(
      "This period overlaps with another period in this group. Is that correct?",
      "Overlapping period"
    );
    if (!ok) {
      revertFn();
      return false;
    }
  }

  return true;
}

/* =========================
   12) Render: EDIT
========================= */

function render() {
  renderGroupSelect();
  updateGrandToggleUI();

  const g = activeGroup();
  const st = g.data;

  if (defaultRateInput) defaultRateInput.value = String(st.defaultRatePercent);

  if (!elPeriods || !tplPeriod || !tplRow) {
    recalcAndRenderTotals();
    return;
  }

  elPeriods.innerHTML = "";

  st.periods.forEach((p, idx) => {
    const node = tplPeriod.content.cloneNode(true);

    const section = node.querySelector(".period");
    const collapseBtn = node.querySelector(".period-collapse-btn");
    const collapseMeta = node.querySelector(".period-range-preview");
    const collapseGroupPreview = node.querySelector(".period-group-preview");
    const groupBox = node.querySelector(".period-group-box");

    const fromEl = node.querySelector(".fromDate");
    const toEl = node.querySelector(".toDate");
    const rowsTbody = node.querySelector(".rows");
    const addRowBtn = node.querySelector(".addRow");
    const addPeriodInlineBtn = node.querySelector(".addPeriodInline");
    const removePeriodBtn = node.querySelector(".removePeriod");

    const totalGrossEl = node.querySelector(".total-gross");
    const totalNetEl = node.querySelector(".total-net");
    const myEurEl = node.querySelector(".my-eur");

    if (fromEl) fromEl.value = p.from;
    if (toEl) toEl.value = p.to;

    if (collapseMeta) {
      collapseMeta.textContent = formatPeriodPreview(p.from, p.to);
    }

    if (collapseGroupPreview) {
      collapseGroupPreview.textContent = g.archived ? `📦 ${g.name}` : (g.name || "Group");
    }

    if (groupBox) {
      groupBox.textContent = g.archived ? `📦 Group: ${g.name}` : `Group: ${g.name || "Group"}`;
    }

    if (section) {
      const collapsed = isPeriodCollapsed(p.id);
      section.classList.toggle("is-collapsed", collapsed);
      section.dataset.index = String(idx + 1);
      section.dataset.periodId = p.id;
    }

    collapseBtn?.addEventListener("click", () => {
      const next = !section.classList.contains("is-collapsed");
      section.classList.toggle("is-collapsed", next);
      setPeriodCollapsed(p.id, next);
      updateFloatingAddClientVisibility();
    });

    fromEl?.addEventListener("change", async () => {
      const oldFrom = p.from;
      p.from = fromEl.value;

      if (collapseMeta) collapseMeta.textContent = formatPeriodPreview(p.from, p.to);

      const ok = await validatePeriodWarnings(p.id, p.from, p.to, () => {
        p.from = oldFrom;
        fromEl.value = oldFrom || "";
        if (collapseMeta) collapseMeta.textContent = formatPeriodPreview(p.from, p.to);
      });

      if (!ok) return;

      saveState();
      recalcAndRenderTotals();
      if (appState.uiMode === "review") renderReview();
    });

    toEl?.addEventListener("change", async () => {
      const oldTo = p.to;
      p.to = toEl.value;

      if (collapseMeta) collapseMeta.textContent = formatPeriodPreview(p.from, p.to);

      const ok = await validatePeriodWarnings(p.id, p.from, p.to, () => {
        p.to = oldTo;
        toEl.value = oldTo || "";
        if (collapseMeta) collapseMeta.textContent = formatPeriodPreview(p.from, p.to);
      });

      if (!ok) return;

      saveState();
      recalcAndRenderTotals();
      if (appState.uiMode === "review") renderReview();
    });

    if (rowsTbody) rowsTbody.innerHTML = "";

    p.rows.forEach((r) => {
      const rowNode = tplRow.content.cloneNode(true);
      const tr = rowNode.querySelector("tr");
      if (tr) {
  tr.dataset.rowId = r.id;
}

      const custEl = rowNode.querySelector(".cust");
      const cityEl = rowNode.querySelector(".city");
      const grossEl = rowNode.querySelector(".gross");
      const netEl = rowNode.querySelector(".net");
      const doneBtn = rowNode.querySelector(".doneBtn");
      const removeRowBtn = rowNode.querySelector(".removeRow");

      if (custEl) custEl.value = r.customer ?? "";
      if (cityEl) cityEl.value = r.city ?? "";
      if (grossEl) grossEl.value = r.gross ?? "";
      if (netEl) netEl.value = r.net ?? "";

      if (doneBtn) {
        const state = ["none", "done", "fail", "fixed"].includes(r.done) ? r.done : "none";
        doneBtn.classList.remove("state-none", "state-done", "state-fail", "state-fixed");
        doneBtn.classList.add(`state-${state}`);
      }

      custEl?.addEventListener("input", () => {
        r.customer = custEl.value;
        saveState();
      });

      cityEl?.addEventListener("input", () => {
        r.city = cityEl.value;
        saveState();
      });

      grossEl?.addEventListener("input", () => {
        r.gross = grossEl.value;
        recalcAndRenderTotals();
        saveState();
      });

      netEl?.addEventListener("input", () => {
        r.net = netEl.value;
        recalcAndRenderTotals();
        saveState();
      });

      doneBtn?.addEventListener("click", () => {
        const current = ["none", "done", "fail", "fixed"].includes(r.done) ? r.done : "none";

        if (current === "none") r.done = "done";
        else if (current === "done") r.done = "fail";
        else if (current === "fail") r.done = "fixed";
        else r.done = "none";

        doneBtn.classList.remove("state-none", "state-done", "state-fail", "state-fixed");
        doneBtn.classList.add(`state-${r.done}`);

        saveState();
        renderMonthlyStats();

        if (appState.uiMode === "review") {
          renderReview();
        }
      });

      removeRowBtn?.addEventListener("click", async () => {
        const ok = await askConfirm("Delete this client row?", "Delete row");
        if (!ok) return;

        p.rows = p.rows.filter((x) => x.id !== r.id);
        if (p.rows.length === 0) p.rows.push(emptyRow());

        saveState();
        render();
        if (appState.uiMode === "review") renderReview();
      });

      rowsTbody?.appendChild(tr);
    });

    addRowBtn?.addEventListener("click", () => {
      p.rows.push(emptyRow());
      saveState();
      render();
      if (appState.uiMode === "review") renderReview();

      setTimeout(() => {
        const inputs = elPeriods?.querySelectorAll?.("input.cust");
        const lastInput = inputs?.[inputs.length - 1];
        if (lastInput) lastInput.focus();
      }, 50);
    });

    addPeriodInlineBtn?.addEventListener("click", () => {
      st.periods.push({
        id: uuid(),
        from: "",
        to: "",
        rows: [emptyRow()],
      });

      saveState();
      render();
      if (appState.uiMode === "review") renderReview();
    });

    removePeriodBtn?.addEventListener("click", async () => {
      const ok = await askConfirm("Delete this period?", "Delete period");
      if (!ok) return;

      st.periods = st.periods.filter((x) => x.id !== p.id);
      if (st.periods.length === 0) st.periods = defaultGroupData().periods;

      saveState();
      render();
      if (appState.uiMode === "review") renderReview();
    });

    const totals = calcPeriodTotals(p, st.defaultRatePercent);
    if (totalGrossEl) totalGrossEl.textContent = fmt(totals.gross);
    if (totalNetEl) totalNetEl.textContent = fmt(totals.net);
    if (myEurEl) myEurEl.textContent = fmt(totals.my);

    elPeriods.appendChild(node);
  });

  recalcAndRenderTotals();
  updateFloatingAddClientVisibility();
}

/* =========================
   13) Review Search
========================= */

let reviewSearchOutsideHandlerAttached = false;

function buildReviewSearchIndex() {
  const rows = [];

  (appState.groups || []).forEach((gr) => {
    const gName = gr?.name ?? "Group";
    const gArchived = gr?.archived === true;
    const periods = gr?.data?.periods || [];

    periods.forEach((p) => {
      const from = formatDateLocal(p?.from) || "—";
      const to = formatDateLocal(p?.to) || "—";

      (p?.rows || []).forEach((r) => {
        const customer = (r?.customer ?? "").toString().trim();
        const city = (r?.city ?? "").toString().trim();
        if (!customer && !city) return;

        rows.push({
          groupId: gr.id,
          periodId: p.id,
          rowId: r.id,
          group: gName,
          groupArchived: gArchived,
          from,
          to,
          customer,
          city,
          gross: fmt(parseMoney(r?.gross)),
          net: fmt(parseMoney(r?.net)),
          status: ["done", "fail", "fixed"].includes(r?.done) ? r.done : "none",
        });
      });
    });
  });

  return rows;
}

  function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);

  const safe = escapeHtml(text);
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reg = new RegExp(`(${escapedQuery})`, "ig");

  return safe.replace(reg, `<mark class="search-highlight">$1</mark>`);
}

function goToClientFromSearch(item) {
  if (!item) return;

  appState.activeGroupId = item.groupId;
  saveState();

  setPeriodCollapsed(item.periodId, false);
  setMode("edit");
  render();

  requestAnimationFrame(() => {
    const periodEl = document.querySelector(`.period[data-period-id="${item.periodId}"]`);
    const rowEl = document.querySelector(`tr[data-row-id="${item.rowId}"]`);

    if (periodEl) {
      periodEl.classList.remove("is-collapsed");
    }

    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
      rowEl.classList.add("row-highlight");

      setTimeout(() => {
        rowEl.classList.remove("row-highlight");
      }, 1800);
    }
  });
}

function initReviewSearch() {
  const searchEl = document.getElementById("reviewSearch");
  const resultsEl = document.getElementById("reviewSearchResults");

  if (!searchEl || !resultsEl) return;

  const index = buildReviewSearchIndex();

  const hide = () => {
    resultsEl.style.display = "none";
    resultsEl.innerHTML = "";
  };

  const clear = () => {
    searchEl.value = "";
    hide();
  };
  
  const bindSearchResultClicks = (list) => {
  const items = resultsEl.querySelectorAll(".review-search-item");

  items.forEach((el, index) => {
    const item = list[index];
    if (!item) return;

    el.style.cursor = "pointer";

    el.onclick = async () => {
      const ok = await askConfirm(
        "Open this client in Edit mode?",
        "Open client"
      );

      if (!ok) return;

      searchEl.value = "";
      resultsEl.style.display = "none";
      resultsEl.innerHTML = "";

      goToClientFromSearch(item);
    };
  });
};

   const renderResults = (list, q) => {
  const limited = list.slice(0, 40);

  if (!limited.length) {
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `<div class="review-search-empty">No results</div>`;
    return;
  }

  resultsEl.style.display = "block";
  resultsEl.innerHTML = limited.map(x => `
    <div class="review-search-item">
      <div class="review-search-name-row">
        <div class="review-search-name">${x.groupArchived ? '📦 ' : ''}${highlightMatch(x.customer || "Client", q)}</div>
        ${
          x.status === "done"
            ? `<span class="search-status search-status-done">Done</span>`
            : x.status === "fail"
            ? `<span class="search-status search-status-fail">Fail</span>`
            : x.status === "fixed"
            ? `<span class="search-status search-status-fixed">Fixed</span>`
            : ``
        }
      </div>

      <div class="review-search-meta">
        <span><b>Group:</b> ${x.groupArchived ? '📦 ' : ''}${escapeHtml(x.group)}</span>
        <span><b>Period:</b> ${escapeHtml(x.from)} → ${escapeHtml(x.to)}</span>
        <span><b>City:</b> ${highlightMatch(x.city || "—", q)}</span>
        <span><b>Gross:</b> ${escapeHtml(x.gross)}</span>
        <span><b>Net:</b> ${escapeHtml(x.net)}</span>
      </div>
    </div>
  `).join("");

  bindSearchResultClicks(limited);
};

  searchEl.oninput = () => {
    const q = searchEl.value.trim().toLowerCase();
    if (!q) {
      hide();
      return;
    }

    const filtered = index.filter(x =>
      (x.customer || "").toLowerCase().includes(q) ||
      (x.city || "").toLowerCase().includes(q)
    );

    renderResults(filtered, q);
  };

  searchEl.onkeydown = (e) => {
    if (e.key === "Escape") clear();
  };

  if (!reviewSearchOutsideHandlerAttached) {
    reviewSearchOutsideHandlerAttached = true;

    document.addEventListener("pointerdown", (e) => {
      const wrap = document.querySelector(".review-search");
      const currentSearch = document.getElementById("reviewSearch");
      const currentResults = document.getElementById("reviewSearchResults");
      if (!wrap || !currentSearch || !currentResults) return;
      if (wrap.contains(e.target)) return;

      currentSearch.value = "";
      currentResults.style.display = "none";
      currentResults.innerHTML = "";
    }, { passive: true });
  }
}

/* =========================
   14) Render: REVIEW
========================= */

function renderReview() {
  if (!reviewView) return;

  const groupsToShow = getGroupsByMode();

  // Empty state
  if (groupsToShow.length === 0) {
    const emptyMessage = appState.grandMode === "archived"
      ? "📦 No archived groups"
      : appState.grandMode === "active"
      ? "👤 No active group selected"
      : "👥 No active groups";

    reviewView.innerHTML = `
      <div class="review-card" style="text-align:center; padding:50px 20px;">
        <div style="font-size:64px; margin-bottom:20px; opacity:0.6;">📭</div>
        <div style="font-size:20px; font-weight:500; opacity:0.8;">${emptyMessage}</div>
        <div style="font-size:14px; margin-top:12px; opacity:0.5;">Create a group or add periods to get started</div>
      </div>
    `;
    initReviewSearch();
    return;
  }

  let fullHtml = "";

  groupsToShow.forEach((g) => {
    const st = g.data;
    const groupIndex = appState.groups.findIndex(gr => gr.id === g.id);
    const colorClass = `group-color-${groupIndex % 8}`;

    const groupTotals = st.periods.reduce(
      (acc, p) => {
        const t = calcPeriodTotals(p, st.defaultRatePercent);
        acc.gross += t.gross;
        acc.net += t.net;
        acc.my += t.my;
        acc.periods += 1;
        acc.clients += p.rows.length;
        return acc;
      },
      { gross: 0, net: 0, my: 0, periods: 0, clients: 0 }
    );

    fullHtml += `
      <section class="review-card ${colorClass}" style="${g.archived ? 'opacity:0.7;' : ''}">
        <div class="review-head">
          <div>
            <h3 class="review-title">${escapeHtml(g.name)}${g.archived ? ' 📦' : ''} — Review</h3>
            <div class="review-sub">${groupTotals.periods} periods • ${groupTotals.clients} rows • Default ${fmt(st.defaultRatePercent)}%</div>
          </div>
        </div>

        <div class="review-kpis">
          <div class="kpi">
            <div class="kpi-label">Gross</div>
            <div class="kpi-value">${fmt(groupTotals.gross)}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Net</div>
            <div class="kpi-value">${fmt(groupTotals.net)}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">My €</div>
            <div class="kpi-value">${fmt(groupTotals.my)}</div>
          </div>
        </div>
      </section>
    `;

    st.periods.forEach((p) => {
      const t = calcPeriodTotals(p, st.defaultRatePercent);
      const from = formatDateLocal(p.from) || "—";
      const to = formatDateLocal(p.to) || "—";

      const clients = p.rows.map((r) => {
        const name = r.customer?.trim() || "Client";
        const city = r.city?.trim() || "—";
        const state = ["none", "done", "fail", "fixed"].includes(r.done) ? r.done : "none";

        let statusHtml = "";
        if (state === "done") {
          statusHtml = `<span class="review-status review-status-done">Done</span>`;
        } else if (state === "fail") {
          statusHtml = `<span class="review-status review-status-fail">Fail</span>`;
        } else if (state === "fixed") {
          statusHtml = `<span class="review-status review-status-fixed">Fixed</span>`;
        }

        return `
          <div class="client-item">
            <div>
              <div class="client-name-row">
                <div class="client-name">${g.archived ? '📦 ' : ''}${escapeHtml(name)}</div>
                ${statusHtml}
              </div>
              <div class="review-sub" style="margin:2px 0 0 0;">City: <b>${escapeHtml(city)}</b></div>
            </div>
            <div class="client-values">
              <span>Gross:</span> <b>${fmt(parseMoney(r.gross))}</b>
              <span>Net:</span> <b>${fmt(parseMoney(r.net))}</b>
            </div>
          </div>
        `;
      }).join("");

      fullHtml += `
        <details class="period-card ${colorClass}">
          <summary>
            <div class="period-meta">
              <div class="period-range">${escapeHtml(from)} → ${escapeHtml(to)}</div>
              <div class="period-mini">${p.rows.length} clients</div>
            </div>

            <div class="period-sum">
              <span class="badge">Gross: <b>${fmt(t.gross)}</b></span>
              <span class="badge">Net: <b>${fmt(t.net)}</b></span>
              <span class="badge">My €: <b>${fmt(t.my)}</b></span>
            </div>
          </summary>

          <div class="period-body">
            <div class="client-list">
              ${clients || `<div class="hint">No clients.</div>`}
            </div>
          </div>
        </details>
      `;
    });
  });

  reviewView.innerHTML = fullHtml;
  initReviewSearch();
}

/* =========================
   15) File Helpers
========================= */

function downloadJson(filename, dataObj) {
  const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/* =========================
   16) Import ALL — Merge
========================= */

function findGroupByName(name) {
  const key = (name ?? "").toString().trim().toLowerCase();
  if (!key) return null;
  return appState.groups.find((g) => g.name.toLowerCase() === key) || null;
}

function cloneAndReIdGroup(group) {
  const g = {
    id: uuid(),
    name: (group?.name ?? "Group").toString().trim() || "Group",
    data: normalizeGroupData(group?.data),
  };

  g.data.periods = g.data.periods.map((p) => ({
    ...p,
    id: uuid(),
    rows: p.rows.map((r) => ({ ...r, id: uuid() })),
  }));

  return g;
}

function mergeAppState(incomingState) {
  const inc = normalizeAppState(incomingState);

  inc.groups.forEach((incomingGroup) => {
    const existing = findGroupByName(incomingGroup.name);

    if (!existing) {
      appState.groups.push(cloneAndReIdGroup(incomingGroup));
      return;
    }

    const incomingData = normalizeGroupData(incomingGroup.data);

    const appended = incomingData.periods.map((p) => ({
      ...p,
      id: uuid(),
      rows: p.rows.map((r) => ({ ...r, id: uuid() })),
    }));

    existing.data.periods = [...existing.data.periods, ...appended];
  });

  if (!appState.groups.some((g) => g.id === appState.activeGroupId)) {
    appState.activeGroupId = appState.groups[0]?.id || appState.activeGroupId;
  }
}

  function calcGroupStatusCounts(group) {
  let done = 0;
  let fail = 0;
  let fixed = 0;

  (group?.data?.periods || []).forEach((p) => {
    (p.rows || []).forEach((r) => {
      if (r.done === "done") done++;
      else if (r.done === "fail") fail++;
      else if (r.done === "fixed") fixed++;
    });
  });

  return { done, fail, fixed };
}

  function calcOverallStatusCounts() {
  let done = 0;
  let fail = 0;
  let fixed = 0;

  (appState.groups || []).forEach((g) => {
    (g.data?.periods || []).forEach((p) => {
      (p.rows || []).forEach((r) => {
        if (r.done === "done") done++;
        else if (r.done === "fail") fail++;
        else if (r.done === "fixed") fixed++;
      });
    });
  });

  return { done, fail, fixed };
}

/* =========================
   17) PDF Export
========================= */

function exportPdfAllGroups() {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    alert("PDF library not loaded. Check jsPDF script tag.");
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const margin = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  const lineH = 6;

  let y = margin;

  const addPageIfNeeded = (need = lineH) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const textLine = (txt, size = 11, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);

    const lines = doc.splitTextToSize(String(txt), maxW);
    lines.forEach((ln) => {
      addPageIfNeeded(lineH);
      doc.text(ln, margin, y);
      y += lineH;
    });
  };

  const hr = () => {
    addPageIfNeeded(4);
    doc.setDrawColor(180);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  const money = (n) => fmt(Number(n || 0));

  // PDF ყოველთვის ყველა ჯგუფს ბეჭდავს (archived-ებითურთ)
  const groupsForPdf = appState.groups;
  const overall = { gross: 0, net: 0, my: 0, groups: groupsForPdf.length };

  const groupsData = groupsForPdf.map((gr) => {
    const st = gr.data;

    const groupTotals = st.periods.reduce(
      (acc, p) => {
        const t = calcPeriodTotals(p, st.defaultRatePercent);
        acc.gross += t.gross;
        acc.net += t.net;
        acc.my += t.my;
        acc.periods += 1;
        acc.rows += p.rows.length;
        return acc;
      },
      { gross: 0, net: 0, my: 0, periods: 0, rows: 0 }
    );

    overall.gross += groupTotals.gross;
    overall.net += groupTotals.net;
    overall.my += groupTotals.my;

    return { gr, st, groupTotals };
  });

  textLine("Client Totals — PDF Report (ALL Groups)", 16, true);
  textLine(`Exported: ${new Date().toLocaleString()}`, 10, false);
  hr();

  textLine("OVERALL SUMMARY", 12, true);
  const overallStatus = calcOverallStatusCounts();
  textLine(`Groups: ${overall.groups}`, 11, false);
  textLine(
    `Gross: ${money(overall.gross)}   Net: ${money(overall.net)}   My €: ${money(overall.my)}`,
    11,
    true
  );
  addPageIfNeeded(lineH);

doc.setFont("helvetica", "bold");
doc.setFontSize(11);

doc.setTextColor(30, 160, 80);
doc.text(`Done: ${overallStatus.done}`, margin, y);

doc.setTextColor(220, 60, 60);
doc.text(`Fail: ${overallStatus.fail}`, margin + 40, y);

doc.setTextColor(215, 170, 20);
doc.text(`Fixed: ${overallStatus.fixed}`, margin + 70, y);

doc.setTextColor(0, 0, 0);
y += lineH;
  hr();

  groupsData.forEach(({ gr, st, groupTotals }, gi) => {
    const statusCounts = calcGroupStatusCounts(gr);
    const archivedMark = gr.archived ? " [ARCHIVED]" : "";
    textLine(`GROUP: ${gr.name}${archivedMark}`, 13, true);
    textLine(
      `Default %: ${money(st.defaultRatePercent)}%   Periods: ${groupTotals.periods}   Rows: ${groupTotals.rows}`,
      10,
      false
    );
    addPageIfNeeded(lineH);
     doc.setFont("helvetica", "bold");
     doc.setFontSize(10);

     doc.setTextColor(30, 160, 80);
     doc.text(`Done: ${statusCounts.done}`, margin, y);

     doc.setTextColor(220, 60, 60);
     doc.text(`Fail: ${statusCounts.fail}`, margin + 34, y);

     doc.setTextColor(215, 170, 20);
     doc.text(`Fixed: ${statusCounts.fixed}`, margin + 64, y);

    doc.setTextColor(0, 0, 0);
      y += lineH;
        textLine(
      `Gross: ${money(groupTotals.gross)}   Net: ${money(groupTotals.net)}   My €: ${money(groupTotals.my)}`,
      11,
      true
    );
    hr();

    st.periods.forEach((p, pi) => {
      const from = formatDateLocal(p.from) || "—";
      const to = formatDateLocal(p.to) || "—";
      const t = calcPeriodTotals(p, st.defaultRatePercent);

      textLine(`Period ${pi + 1}: ${from} - ${to}`, 11, true);
      textLine(
        `Gross: ${money(t.gross)}   Net: ${money(t.net)}   My €: ${money(t.my)}   (Clients: ${p.rows.length})`,
        10,
        false
      );

      p.rows.forEach((r) => {
        const customerName = (r.customer || "Client").toString().trim() || "Client";
        const name = gr.archived ? `[ARCHIVED] ${customerName}` : customerName;
        const city = (r.city || "—").toString().trim() || "—";
        const rg = money(parseMoney(r.gross));
        const rn = money(parseMoney(r.net));

        const state = ["none", "done", "fail", "fixed"].includes(r.done) ? r.done : "none";

const baseText = `• ${name} [${city}] | Gross: ${rg} | Net: ${rn}`;
const statusLabel =
  state === "done" ? " Done"
  : state === "fail" ? " Fail"
  : state === "fixed" ? " Fixed"
  : "";

doc.setFont("helvetica", "normal");
doc.setFontSize(10);

const baseLines = doc.splitTextToSize(baseText, maxW);

baseLines.forEach((ln, lineIndex) => {
  addPageIfNeeded(lineH);

  doc.setTextColor(0, 0, 0);
  doc.text(ln, margin, y);

  if (lineIndex === baseLines.length - 1 && statusLabel) {
    const baseWidth = doc.getTextWidth(ln);
    const statusX = margin + baseWidth + 2;

    if (state === "done") doc.setTextColor(30, 160, 80);
    else if (state === "fail") doc.setTextColor(220, 60, 60);
    else if (state === "fixed") doc.setTextColor(215, 170, 20);

    doc.text(statusLabel, statusX, y);
  }

  y += lineH;
});

doc.setTextColor(0, 0, 0);
      });

      hr();
    });

    if (gi !== groupsData.length - 1) addPageIfNeeded(20);
  });

  const fileName = `client-totals_ALL_${nowStamp()}.pdf`;

  setTimeout(() => {
    try {
      doc.save(fileName);
    } catch (e) {
      console.error(e);
      alert("PDF export failed (download issue). Try Chrome.");
    }
  }, 150);
}

/* =========================
   18) Scroll + Keyboard
========================= */

function toggleToTop() {
  if (!toTopBtn) return;
  if (window.scrollY > 450) toTopBtn.classList.add("show");
  else toTopBtn.classList.remove("show");
}

(function initKeyboardDetect() {
  let baseH = window.innerHeight;

  window.addEventListener("resize", () => {
    const h = window.innerHeight;
    const opened = h < baseH - 120;
    rootEl.classList.toggle("keyboard-open", opened);
    if (!opened) baseH = h;
  });
})();

/* =========================
   19) Floating Add Client
========================= */

function addClientToLastPeriod() {
  const g = activeGroup();
  const st = g.data;
  const last = st.periods[st.periods.length - 1];
  if (!last) return;

  last.rows.push(emptyRow());
  saveState();
  render();

  setTimeout(() => {
    const inputs = elPeriods?.querySelectorAll?.("input.cust");
    const lastInput = inputs?.[inputs.length - 1];
    if (lastInput) lastInput.focus();
  }, 50);
}

/* =========================
   20) Events
========================= */

modeEditBtn?.addEventListener("click", () => setMode("edit"));
modeReviewBtn?.addEventListener("click", async () => {
  const g = activeGroup();
  if (g?.archived) {
    const ok = await askConfirm(
      "The selected group is archived. Switch to an active group to use Review mode. Would you like to select a group now?",
      "Archived Group"
    );
    if (ok) {
      // Controls გახსნა თუ დახურულია
      if (rootEl.classList.contains("controls-collapsed")) {
        setControlsCollapsed(false);
      }
      // პირდაპირ groupSelect-ზე ფოკუსი
      groupSelect?.focus();
    }
    return;
  }
  setMode("review");
});

groupSelect?.addEventListener("change", () => {
  appState.activeGroupId = groupSelect.value;
  saveState();
  render();
  if (appState.uiMode === "review") renderReview();
});

addGroupBtn?.addEventListener("click", async () => {
  const name = await askText(
    "New Group",
    "Enter group name:",
    `Group ${appState.groups.length + 1}`,
    "Add"
  );

  if (!name) return;

  // პროცენტის შეყვანა
  const rateStr = await askText(
    "Default Rate",
    "Enter default percentage (%):",
    "15.0",
    "Save"
  );

  const rate = parseFloat(rateStr);
  const validRate = !isNaN(rate) && rate >= 0 && rate <= 100 ? rate : 15.0;

  const g = {
    id: uuid(),
    name: name.toString().trim() || `Group ${appState.groups.length + 1}`,
    archived: false,
    data: defaultGroupData(validRate),
  };

  appState.groups.push(g);
  appState.activeGroupId = g.id;
  saveState();

  render();
  setMode("edit");
});

renameGroupBtn?.addEventListener("click", async () => {
  const g = activeGroup();

  const name = await askText(
    "Rename Group",
    "Enter new group name:",
    g.name,
    "Rename"
  );

  if (!name) return;

  g.name = name.toString().trim() || g.name;
  saveState();
  renderGroupSelect();
  render();
  if (appState.uiMode === "review") renderReview();
});

deleteGroupBtn?.addEventListener("click", async () => {
  if (appState.groups.length <= 1) {
    alert("You must keep at least 1 group.");
    return;
  }

  const g = activeGroup();
  const ok = await askConfirm(`Delete group "${g.name}"?`, "Delete group");
  if (!ok) return;

  appState.groups = appState.groups.filter((x) => x.id !== g.id);
  appState.activeGroupId = appState.groups[0].id;

  saveState();
  render();
  if (appState.uiMode === "review") renderReview();
});

defaultRateInput?.addEventListener("input", () => {
  const g = activeGroup();
  g.data.defaultRatePercent = clampRate(defaultRateInput.value);
  saveState();
  recalcAndRenderTotals();
  if (appState.uiMode === "review") renderReview();
});

addPeriodBtn?.addEventListener("click", () => {
  const g = activeGroup();
  g.data.periods.push({ id: uuid(), from: "", to: "", rows: [emptyRow()] });

  saveState();
  render();
  if (appState.uiMode === "review") renderReview();
});

resetBtn?.addEventListener("click", async () => {
  const g = activeGroup();
  const ok = await askConfirm(`Reset group "${g.name}"? This will clear all its data.`, "Reset group");
  if (!ok) return;

  g.data = defaultGroupData();
  saveState();
  render();
  if (appState.uiMode === "review") renderReview();
});

exportAllBtn?.addEventListener("click", () => {
  const payload = {
    __type: "client_totals_all_groups",
    __ver: 1,
    exportedAt: new Date().toISOString(),
    data: appState,
  };
  downloadJson(`client-totals-ALL-groups_${nowStamp()}.json`, payload);
});

importAllInput?.addEventListener("change", async () => {
  const file = importAllInput.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    let incoming = null;
    if (parsed?.__type === "client_totals_all_groups" && parsed?.data) incoming = parsed.data;
    else if (parsed?.groups && parsed?.activeGroupId) incoming = parsed;

    if (!incoming) {
      alert("Import failed: wrong file format.");
      return;
    }

    const doMerge = await askConfirm(
      "Import mode: MERGE into current data? (Yes = Merge, No = Next)",
      "Import all groups"
    );

    if (doMerge) {
      mergeAppState(incoming);
      saveState();
      render();
      if (appState.uiMode === "review") renderReview();
      alert("Merged successfully.");
      return;
    }

    const doReplace = await askConfirm(
      "Import mode: REPLACE all current data on this device? (Yes = Replace, No = Cancel)",
      "Import all groups"
    );

    if (!doReplace) return;

    appState = normalizeAppState(incoming);
    saveState();
    render();
    if (appState.uiMode === "review") renderReview();
    alert("Imported successfully.");
  } catch {
    alert("Import failed: invalid JSON file.");
  } finally {
    importAllInput.value = "";
  }
});

totalsActiveBtn?.addEventListener("click", () => {
  appState.grandMode = "active";
  saveState();

  const current = getCurrentMonthKey("active");
  setSavedMonthCursor(current);

  updateGrandToggleUI();
  recalcAndRenderTotals();
  if (appState.uiMode === "review") renderReview();
});

totalsAllBtn?.addEventListener("click", () => {
  appState.grandMode = "all";
  saveState();

  const current = getCurrentMonthKey("all");
  setSavedMonthCursor(current);

  updateGrandToggleUI();
  recalcAndRenderTotals();
  if (appState.uiMode === "review") renderReview();
});

totalsArchivedBtn?.addEventListener("click", () => {
  appState.grandMode = "archived";
  saveState();

  const current = getCurrentMonthKey("archived");
  setSavedMonthCursor(current);

  updateGrandToggleUI();
  recalcAndRenderTotals();
  if (appState.uiMode === "review") renderReview();
});

reviewActiveBtn?.addEventListener("click", () => {
  appState.grandMode = "active";
  saveState();

  const current = getCurrentMonthKey("active");
  setSavedMonthCursor(current);

  updateGrandToggleUI();
  recalcAndRenderTotals();
  renderReview();
});

reviewArchivedBtn?.addEventListener("click", () => {
  appState.grandMode = "archived";
  saveState();

  const current = getCurrentMonthKey("archived");
  setSavedMonthCursor(current);

  updateGrandToggleUI();
  recalcAndRenderTotals();
  renderReview();
});

pdfAllBtn?.addEventListener("click", () => {
  if (!pdfAllBtn) return;

  pdfAllBtn.disabled = true;
  const oldText = pdfAllBtn.textContent;
  pdfAllBtn.textContent = "Generating PDF...";

  setTimeout(() => {
    try {
      exportPdfAllGroups();
    } finally {
      setTimeout(() => {
        pdfAllBtn.disabled = false;
        pdfAllBtn.textContent = oldText;
      }, 1200);
    }
  }, 50);
});

window.addEventListener("scroll", toggleToTop);
toggleToTop();

toTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

fabAddClient?.addEventListener("click", () => {
  if (appState.uiMode !== "edit") return;
  addClientToLastPeriod();
});

statusListClose?.addEventListener("click", closeStatusListModal);

statusListModal?.addEventListener("click", (e) => {
  if (e.target === statusListModal) {
    closeStatusListModal();
  }
});

function initStatusBadgeActions() {
  const doneEl = document.getElementById("monthDone");
  const failEl = document.getElementById("monthFail");
  const fixedEl = document.getElementById("monthFixed");

  [doneEl, failEl, fixedEl].forEach((el) => {
    if (!el) return;

    el.style.cursor = "pointer";

    el.onclick = () => {
      const status = el.dataset.status;
      if (!status) return;

      const clients = getClientsByStatus(status);
      openStatusListModal(status, clients);
    };
  });
}

/* =========================
   Archive Group
========================= */

function toggleArchiveGroup(groupId) {
  const group = appState.groups.find(g => g.id === groupId);
  if (!group) return;

  group.archived = !group.archived;

  // თუ მიმდინარე ჯგუფს ვხურავთ, გადავრთეთ სხვაზე
  if (group.archived && appState.activeGroupId === groupId) {
    const firstActive = appState.groups.find(g => !g.archived);
    if (firstActive) {
      appState.activeGroupId = firstActive.id;
    }
  }

  saveState();
  renderGroupSelect();
  render();
  if (appState.uiMode === "review") renderReview();
}

function addArchiveButtonToGroupSelect() {
  // HTML-ში უკვე გვაქვს ღილაკი, მხოლოდ event-ს ვაბამთ
  const archiveBtn = document.getElementById("archiveGroupBtn");
  if (!archiveBtn) return;

  archiveBtn.addEventListener("click", () => {
    const g = appState.groups.find(x => x.id === appState.activeGroupId) || activeGroup();
    if (!g) return;
    const label = g.archived ? "Unarchive" : "Archive";
    askConfirm(`${label} group "${g.name}"?`, `${label} Group`).then((ok) => {
      if (!ok) return;
      toggleArchiveGroup(g.id);
    });
  });
}

/* =========================
   21) Init
========================= */

initTheme();
initControlsToggle();
initSummaryPanel();
addArchiveButtonToGroupSelect();
render();
initStatusBadgeActions();
setMode(appState.uiMode);

requestAnimationFrame(() => {
  document.body.classList.remove("booting");
});

window.addEventListener("load", () => {
  const splash = document.getElementById("splash");

  setTimeout(() => {
    splash?.classList.add("splash-hide");

    document.documentElement.classList.remove("app-preload");
    document.documentElement.classList.add("app-ready");
    document.documentElement.classList.add("ready");

    setTimeout(() => {
      splash?.remove();
    }, 300);
  }, 120);
});

/* =========================
   22) Service Worker
========================= */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").then((reg) => {
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      newWorker?.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          const box = document.getElementById("updateBar");
          const btn = document.getElementById("updateBtn");
          if (box) box.style.display = "flex";
          if (btn) btn.onclick = () => window.location.reload();
        }
      });
    });
  });
}

// PWA update detection — stable version
if ("serviceWorker" in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) return;

    const showUpdateBar = (worker) => {
      const bar = document.getElementById("updateBar");
      const btn = document.getElementById("updateBtn");
      const exportBtn = document.getElementById("updateExportBtn");

      if (bar) bar.style.display = "flex";

      if (exportBtn) {
        exportBtn.onclick = () => {
          const exportAllBtn = document.getElementById("exportAllBtn");
          if (exportAllBtn) exportAllBtn.click();
        };
      }

      if (btn) {
        btn.onclick = () => {
          btn.disabled = true;
          btn.textContent = "Updating...";

          if (worker) {
            worker.postMessage({ action: "skipWaiting" });
          } else {
            window.location.reload();
          }
        };
      }
    };

    // თუ ახალი worker უკვე waiting-შია
    if (reg.waiting) {
      showUpdateBar(reg.waiting);
    }

    // თუ ახლა იპოვა ახალი worker
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          showUpdateBar(newWorker);
        }
      });
    });
  });
}

// PWA install prompt
let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;

  const installBar = document.getElementById("installBar");
  const installBtn = document.getElementById("installBtn");

  if (installBar) installBar.style.display = "flex";

  if (installBtn) {
    installBtn.onclick = async () => {
      if (!deferredInstallPrompt) return;

      deferredInstallPrompt.prompt();
      try {
        await deferredInstallPrompt.userChoice;
      } catch (err) {}

      deferredInstallPrompt = null;
      if (installBar) installBar.style.display = "none";
    };
  }
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;

  const installBar = document.getElementById("installBar");
  if (installBar) installBar.style.display = "none";
});

/* =========================
   Android Back Button
========================= */

window.addEventListener("popstate", () => {
  // confirmBackdrop
  if (confirmBackdrop && confirmBackdrop.style.display === "flex") {
    confirmBackdrop.style.display = "none";
    if (confirmNoBtn) confirmNoBtn.onclick?.();
    return;
  }

  // textPromptModal
  if (textPromptModal && textPromptModal.style.display === "flex") {
    textPromptModal.style.display = "none";
    return;
  }

  // statusListModal
  if (statusListModal && statusListModal.style.display === "flex") {
    closeStatusListModal();
    return;
  }
});

