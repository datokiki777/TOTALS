/* =========================================================
   Client Totals (Groups Edition) — GitHub Pages friendly
   - Multiple groups (each group has its own data)
   - Grand Total mode: Active group / All groups combined
   - Custom confirm modal (Yes/No) for delete/reset actions
   - Export/Import:
       * Active group
       * All groups (single JSON)
       * Import ALL supports MERGE or REPLACE
   - Scroll-to-top button
========================================================= */

/* =========================
   1) Storage + DOM
========================= */

const STORAGE_KEY = "client_totals_groups_v1";

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
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const resetBtn = document.getElementById("resetBtn");

const grandGrossEl = document.getElementById("grandGross");
const grandNetEl = document.getElementById("grandNet");
const grandMyEl = document.getElementById("grandMy");

// Groups UI
const groupSelect = document.getElementById("groupSelect");
const addGroupBtn = document.getElementById("addGroupBtn");
const renameGroupBtn = document.getElementById("renameGroupBtn");
const deleteGroupBtn = document.getElementById("deleteGroupBtn");

// Grand Total toggle (Active / All)
const totalsActiveBtn = document.getElementById("totalsActiveBtn");
const totalsAllBtn = document.getElementById("totalsAllBtn");

// Export/Import ALL groups
const pdfAllBtn = document.getElementById("pdfAllBtn");
const exportAllBtn = document.getElementById("exportAllBtn");
const importLabel = document.getElementById("importLabel");
const importAllLabel = document.getElementById("importAllLabel");
const importAllInput = document.getElementById("importAllInput");

// Scroll-to-top
const toTopBtn = document.getElementById("toTopBtn");

// Confirm modal elements (must exist in HTML)
const confirmBackdrop = document.getElementById("confirmModal");
const confirmTitleEl = document.getElementById("confirmTitle");
const confirmTextEl = document.getElementById("confirmText");
const confirmNoBtn = document.getElementById("confirmNo");
const confirmYesBtn = document.getElementById("confirmYes");

/* =========================
   2) App State
========================= */

let appState = loadState();

/* =========================
   3) Utilities
========================= */

function uuid() {
  return crypto?.randomUUID?.() ?? `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function fmt(n) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Accepts:
 *  - "1,234.56"
 *  - "1.234,56"
 *  - "1234,56"
 */
function parseMoney(value) {
  if (value == null) return 0;

  let s = String(value).trim();
  if (!s) return 0;

  s = s.replace(/\s+/g, "");

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    // Both present -> last symbol is decimal separator
    if (lastComma > lastDot) {
      // comma decimal, dots thousands
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // dot decimal, commas thousands
      s = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1 && lastDot === -1) {
    // only comma -> decimal
    s = s.replace(",", ".");
  } else {
    // only dot or none -> remove commas just in case
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

/* =========================
   4) Confirm Modal (Yes/No)
========================= */

function hasCustomConfirm() {
  return !!(confirmBackdrop && confirmTitleEl && confirmTextEl && confirmNoBtn && confirmYesBtn);
}

function askConfirm(message, title = "Confirm") {
  return new Promise((resolve) => {
    // Fallback if modal is not present
    if (!hasCustomConfirm()) {
      resolve(window.confirm(message));
      return;
    }

    confirmTitleEl.textContent = title;
    confirmTextEl.textContent = message;
    confirmBackdrop.style.display = "flex";

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

    // Click outside -> No
    confirmBackdrop.onclick = (e) => {
      if (e.target === confirmBackdrop) {
        cleanup();
        resolve(false);
      }
    };

    // ESC -> No
    document.onkeydown = (e) => {
      if (e.key === "Escape") {
        cleanup();
        resolve(false);
      }
    };
  });
}

/* =========================
   5) Data Model
========================= */

function defaultGroupData() {
  return {
    defaultRatePercent: 13.5,
    periods: [
      {
        id: uuid(),
        from: "",
        to: "",
        rows: [{ id: uuid(), customer: "", gross: "", net: "" }],
      },
    ],
  };
}

function defaultAppState() {
  const g1 = { id: uuid(), name: "Group 1", data: defaultGroupData() };
  return {
    activeGroupId: g1.id,
    groups: [g1],
    grandMode: "active",
    uiMode: "review",   // ✅ აქ
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
            gross: r?.gross ?? "",
            net: r?.net ?? "",
          }))
        : [{ id: uuid(), customer: "", gross: "", net: "" }],
  }));

  return out;
}

function normalizeAppState(s) {
  const groups = Array.isArray(s?.groups) ? s.groups : [];

  const out = {
    activeGroupId: s?.activeGroupId || "",
    groups: [],
    grandMode: s?.grandMode === "all" ? "all" : "active",
    uiMode: s?.uiMode === "edit" ? "edit" : "review",
  };

  out.groups = (groups.length ? groups : defaultAppState().groups).map((g) => ({
    id: g?.id || uuid(),
    name: (g?.name ?? "Group").toString().trim() || "Group",
    data: normalizeGroupData(g?.data),
  }));

  if (!out.groups.some((g) => g.id === out.activeGroupId)) {
    out.activeGroupId = out.groups[0].id;
  }

  return out;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
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
  return appState.groups.find((g) => g.id === appState.activeGroupId) || appState.groups[0];
}

/* =========================
   6) Groups UI
========================= */

function renderGroupSelect() {
  if (!groupSelect) return;

  groupSelect.innerHTML = "";
  appState.groups.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.name;
    groupSelect.appendChild(opt);
  });

  groupSelect.value = appState.activeGroupId;
}

function setControlsForMode(mode) {
  const isEdit = mode === "edit";

  // What should be enabled in each mode
  const enableAlways = [modeEditBtn, modeReviewBtn, totalsActiveBtn, totalsAllBtn];
  const enableInReview = [groupSelect, exportBtn, exportAllBtn, pdfAllBtn];
  const enableInEdit = [
    groupSelect, addGroupBtn, renameGroupBtn, deleteGroupBtn,
    defaultRateInput,
    addPeriodBtn, resetBtn,
    importInput, importAllInput,
    exportBtn, exportAllBtn,
  ];

  // Helper
  const setEl = (el, enabled) => {
    if (!el) return;
    if ("disabled" in el) el.disabled = !enabled;
    el.style.pointerEvents = enabled ? "" : "none";
    el.style.opacity = enabled ? "" : "0.55";
  };

  // First disable everything we manage
  const all = [
  groupSelect, addGroupBtn, renameGroupBtn, deleteGroupBtn,
  defaultRateInput,
  addPeriodBtn, exportBtn, importInput, resetBtn,
  exportAllBtn, importAllInput,
  pdfAllBtn
];
  all.forEach((el) => setEl(el, false));

  // Enable the correct set
  enableAlways.forEach((el) => setEl(el, true));
  (isEdit ? enableInEdit : enableInReview).forEach((el) => setEl(el, true));

  // Hide Import buttons in Review (so they don’t even show)
  const importLabel = importInput?.closest("label");
  const importAllLabel = importAllInput?.closest("label");
  if (importLabel) importLabel.style.display = isEdit ? "" : "none";
  if (importAllLabel) importAllLabel.style.display = isEdit ? "" : "none";
}

   function setMode(mode) {
  appState.uiMode = mode === "review" ? "review" : "edit";
  saveState();

  if (modeEditBtn && modeReviewBtn) {
    modeEditBtn.classList.toggle("active", appState.uiMode === "edit");
    modeReviewBtn.classList.toggle("active", appState.uiMode === "review");
  }

  if (editView && reviewView) {
    if (appState.uiMode === "review") {
      editView.hidden = true;
      reviewView.hidden = false;
      renderReview();
    } else {
      reviewView.hidden = true;
      editView.hidden = false;
    }
  }
  
  setControlsForMode(appState.uiMode);
  const isEdit = appState.uiMode === "edit";

// Hide imports in REVIEW (show in EDIT)
    if (importLabel) importLabel.style.display = isEdit ? "" : "none";
    if (importAllLabel) importAllLabel.style.display = isEdit ? "" : "none";
    if (pdfAllBtn) pdfAllBtn.style.display = isEdit ? "none" : "";
}

function renderReview() {
  if (!reviewView) return;

  const g = activeGroup();
  const state = g.data;

  const groupTotals = state.periods.reduce(
    (acc, p) => {
      const gross = p.rows.reduce((s, r) => s + parseMoney(r.gross), 0);
      const net = p.rows.reduce((s, r) => s + parseMoney(r.net), 0);
      const my = net * (clampRate(state.defaultRatePercent) / 100);
      acc.gross += gross;
      acc.net += net;
      acc.my += my;
      acc.periods += 1;
      acc.clients += p.rows.length;
      return acc;
    },
    { gross: 0, net: 0, my: 0, periods: 0, clients: 0 }
  );

  const header = `
    <section class="review-card">
      <div class="review-head">
        <div>
          <h3 class="review-title">${escapeHtml(g.name)} — Review</h3>
          <div class="review-sub">${groupTotals.periods} periods • ${groupTotals.clients} rows • Default ${fmt(state.defaultRatePercent)}%</div>
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

  const periodsHtml = state.periods
    .map((p) => {
      const t = calcPeriodTotals(p);
      const from = p.from || "—";
      const to = p.to || "—";

      const clients = p.rows
        .map((r) => {
          const name = r.customer?.trim() || "Client";
          return `
            <div class="client-item">
              <div class="client-name">${escapeHtml(name)}</div>
              <div class="client-values">
                <span>Gross:</span> <b>${fmt(parseMoney(r.gross))}</b>
                <span>Net:</span> <b>${fmt(parseMoney(r.net))}</b>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <details class="period-card">
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
    })
    .join("");

  reviewView.innerHTML = header + periodsHtml;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   7) Grand Toggle UI
========================= */

function updateGrandToggleUI() {
  if (!totalsActiveBtn || !totalsAllBtn) return;

  const isAll = appState.grandMode === "all";
  totalsActiveBtn.classList.toggle("active", !isAll);
  totalsAllBtn.classList.toggle("active", isAll);
}

/* =========================
   8) Calculations
========================= */

function calcPeriodTotals(period) {
  const g = activeGroup();
  const state = g.data;

  const gross = period.rows.reduce((sum, r) => sum + parseMoney(r.gross), 0);
  const net = period.rows.reduce((sum, r) => sum + parseMoney(r.net), 0);
  const my = net * (clampRate(state.defaultRatePercent) / 100);

  return { gross, net, my };
}

function calcGrandTotalsActiveGroup() {
  const g = activeGroup();
  const state = g.data;

  return state.periods.reduce(
    (acc, p) => {
      const t = calcPeriodTotals(p);
      acc.gross += t.gross;
      acc.net += t.net;
      acc.my += t.my;
      return acc;
    },
    { gross: 0, net: 0, my: 0 }
  );
}

function calcGrandTotalsAllGroups() {
  const grand = { gross: 0, net: 0, my: 0 };

  appState.groups.forEach((gr) => {
    const st = gr.data;

    st.periods.forEach((p) => {
      const gross = p.rows.reduce((sum, r) => sum + parseMoney(r.gross), 0);
      const net = p.rows.reduce((sum, r) => sum + parseMoney(r.net), 0);
      const my = net * (clampRate(st.defaultRatePercent) / 100);

      grand.gross += gross;
      grand.net += net;
      grand.my += my;
    });
  });

  return grand;
}

function recalcAndRenderTotals() {
  const g = activeGroup();
  const state = g.data;

  const grand =
    appState.grandMode === "all" ? calcGrandTotalsAllGroups() : calcGrandTotalsActiveGroup();

  if (grandGrossEl) grandGrossEl.textContent = fmt(grand.gross);
  if (grandNetEl) grandNetEl.textContent = fmt(grand.net);
  if (grandMyEl) grandMyEl.textContent = fmt(grand.my);

  // Period totals always reflect ACTIVE group (UI clarity)
  const periodSections = elPeriods?.querySelectorAll?.(".period") ?? [];
  periodSections.forEach((sec, i) => {
    const p = state.periods[i];
    if (!p) return;

    const t = calcPeriodTotals(p);
    sec.querySelector(".total-gross").textContent = fmt(t.gross);
    sec.querySelector(".total-net").textContent = fmt(t.net);
    sec.querySelector(".my-eur").textContent = fmt(t.my);
  });
}

/* =========================
   9) Rendering
========================= */

function render() {
  renderGroupSelect();
  updateGrandToggleUI();

  const g = activeGroup();
  const state = g.data;

  if (defaultRateInput) defaultRateInput.value = String(state.defaultRatePercent);

  if (!elPeriods || !tplPeriod || !tplRow) {
    // If templates are missing, avoid hard crash
    recalcAndRenderTotals();
    return;
  }

  elPeriods.innerHTML = "";
  state.periods.forEach((p, idx) => {
    const node = tplPeriod.content.cloneNode(true);

    const section = node.querySelector(".period");
    const fromEl = node.querySelector(".fromDate");
    const toEl = node.querySelector(".toDate");
    const rowsTbody = node.querySelector(".rows");
    const addRowBtn = node.querySelector(".addRow");
    const removePeriodBtn = node.querySelector(".removePeriod");

    const totalGrossEl = node.querySelector(".total-gross");
    const totalNetEl = node.querySelector(".total-net");
    const myEurEl = node.querySelector(".my-eur");

    fromEl.value = p.from;
    toEl.value = p.to;

    fromEl.addEventListener("change", () => {
      p.from = fromEl.value;
      saveState();
    });

    toEl.addEventListener("change", () => {
      p.to = toEl.value;
      saveState();
    });

    // Rows
    rowsTbody.innerHTML = "";
    p.rows.forEach((r) => {
      const rowNode = tplRow.content.cloneNode(true);

      const tr = rowNode.querySelector("tr");
      const custEl = rowNode.querySelector(".cust");
      const grossEl = rowNode.querySelector(".gross");
      const netEl = rowNode.querySelector(".net");
      const removeRowBtn = rowNode.querySelector(".removeRow");

      custEl.value = r.customer;
      grossEl.value = r.gross;
      netEl.value = r.net;

      custEl.addEventListener("input", () => {
        r.customer = custEl.value;
        saveState();
      });

      grossEl.addEventListener("input", () => {
        r.gross = grossEl.value;
        recalcAndRenderTotals();
        saveState();
      });

      netEl.addEventListener("input", () => {
        r.net = netEl.value;
        recalcAndRenderTotals();
        saveState();
      });

      removeRowBtn.addEventListener("click", async () => {
        const ok = await askConfirm("Delete this client row?", "Delete row");
        if (!ok) return;

        p.rows = p.rows.filter((x) => x.id !== r.id);
        if (p.rows.length === 0) {
          p.rows.push({ id: uuid(), customer: "", gross: "", net: "" });
        }

        saveState();
        render();
      });

      rowsTbody.appendChild(tr);
    });

    addRowBtn.addEventListener("click", () => {
      p.rows.push({ id: uuid(), customer: "", gross: "", net: "" });
      saveState();
      render();
    });

    removePeriodBtn.addEventListener("click", async () => {
      const ok = await askConfirm("Delete this period?", "Delete period");
      if (!ok) return;

      state.periods = state.periods.filter((x) => x.id !== p.id);
      if (state.periods.length === 0) state.periods = defaultGroupData().periods;

      saveState();
      render();
    });

    // Totals for this period
    const totals = calcPeriodTotals(p);
    totalGrossEl.textContent = fmt(totals.gross);
    totalNetEl.textContent = fmt(totals.net);
    myEurEl.textContent = fmt(totals.my);

    section.dataset.index = String(idx + 1);
    elPeriods.appendChild(node);
  });

  recalcAndRenderTotals();
}

/* =========================
   10) File Helpers
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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}`;
}

/* =========================
   11) Import ALL — Merge logic
========================= */

function findGroupByName(name) {
  const key = (name ?? "").toString().trim().toLowerCase();
  if (!key) return null;
  return appState.groups.find((g) => g.name.toLowerCase() === key) || null;
}

function cloneAndReIdGroup(group) {
  // Ensure no id collisions when importing/merging
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

    // Merge into existing group:
    // - Keep existing name and defaultRate
    // - Append incoming periods (re-id to avoid collisions)
    const incomingData = normalizeGroupData(incomingGroup.data);

    const appended = incomingData.periods.map((p) => ({
      ...p,
      id: uuid(),
      rows: p.rows.map((r) => ({ ...r, id: uuid() })),
    }));

    existing.data.periods = [...existing.data.periods, ...appended];
  });

  // Keep current activeGroupId if still valid; else fix it
  if (!appState.groups.some((g) => g.id === appState.activeGroupId)) {
    appState.activeGroupId = appState.groups[0]?.id || appState.activeGroupId;
  }
}

/* =========================
   12) Event Wiring
========================= */

  modeEditBtn?.addEventListener("click", () =>     setMode("edit"));
  modeReviewBtn?.addEventListener("click", () =>   setMode("review"));
  pdfAllBtn?.addEventListener("click", () => {
  if (!pdfAllBtn) return;

  // prevent double taps / freeze
  pdfAllBtn.disabled = true;
  const oldText = pdfAllBtn.textContent;
  pdfAllBtn.textContent = "Generating PDF...";

  setTimeout(() => {
    try {
      exportPdfAllGroups();
    } finally {
      // re-enable after a short delay (download dialog may appear)
      setTimeout(() => {
        pdfAllBtn.disabled = false;
        pdfAllBtn.textContent = oldText;
      }, 1200);
    }
  }, 50);
});

// Group switching

groupSelect?.addEventListener("change", () => {
  appState.activeGroupId = groupSelect.value;
  saveState();
  render();

  // If we are in REVIEW, refresh the review HTML too
  if (appState.uiMode === "review") renderReview();
});

// Add group
addGroupBtn?.addEventListener("click", () => {
  const name = prompt("Group name?", `Group ${appState.groups.length + 1}`);
  if (!name) return;

  const g = {
    id: uuid(),
    name: name.toString().trim() || `Group ${appState.groups.length + 1}`,
    data: defaultGroupData(),
  };

  appState.groups.push(g);
  appState.activeGroupId = g.id;

  saveState();
  // Always start in REVIEW on page load
    appState.uiMode = "review";
    saveState();

    render();
    setMode("review");
});

// Rename group
renameGroupBtn?.addEventListener("click", () => {
  const g = activeGroup();
  const name = prompt("New group name:", g.name);
  if (!name) return;

  g.name = name.toString().trim() || g.name;
  saveState();
  renderGroupSelect();
});

// Delete group (keep at least 1)
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
});

// Default %
defaultRateInput?.addEventListener("input", () => {
  const g = activeGroup();
  g.data.defaultRatePercent = clampRate(defaultRateInput.value);

  saveState();
  recalcAndRenderTotals();
});

// Add period
addPeriodBtn?.addEventListener("click", () => {
  const g = activeGroup();

  g.data.periods.push({
    id: uuid(),
    from: "",
    to: "",
    rows: [{ id: uuid(), customer: "", gross: "", net: "" }],
  });

  saveState();
  render();
});

// Export ACTIVE group only
exportBtn?.addEventListener("click", () => {
  const g = activeGroup();

  const payload = {
    type: "client-totals-group-backup",
    version: 1,
    group: g,
  };

  downloadJson(`client-totals-${safeFileName(g.name)}_${nowStamp()}.json`, payload);
});

// Import into CURRENT group (replaces its data)
importInput?.addEventListener("change", async () => {
  const file = importInput.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (parsed?.type === "client-totals-group-backup" && parsed?.group?.data) {
      const g = activeGroup();

      const ok = await askConfirm(
        `Import will REPLACE data inside "${g.name}". Continue?`,
        "Import group"
      );
      if (!ok) return;

      g.name = (parsed.group.name ?? g.name).toString().trim() || g.name;
      g.data = normalizeGroupData(parsed.group.data);

      saveState();
      render();
      alert("Imported into current group.");
    } else {
      alert("Import failed: wrong format.");
    }
  } catch {
    alert("Import failed: invalid JSON file.");
  } finally {
    importInput.value = "";
  }
});

/* =========================================
   EXPORT / IMPORT ALL GROUPS (ONE JSON FILE)
========================================= */

/* Export ALL: saves full appState (all groups, activeGroupId, settings) */
exportAllBtn?.addEventListener("click", () => {
  const payload = {
    __type: "client_totals_all_groups",
    __ver: 1,
    exportedAt: new Date().toISOString(),
    data: appState,
  };

  downloadJson(`client-totals-ALL-groups_${nowStamp()}.json`, payload);
});

/* Import ALL: MERGE or REPLACE */
importAllInput?.addEventListener("change", async () => {
  const file = importAllInput.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    // Accept wrapped format (recommended) OR raw appState fallback
    let incoming = null;

    if (parsed?.__type === "client_totals_all_groups" && parsed?.data) {
      incoming = parsed.data;
    } else if (parsed?.groups && parsed?.activeGroupId) {
      incoming = parsed;
    }

    if (!incoming) {
      alert("Import failed: wrong file format.");
      return;
    }

    // Choose mode with 2-button modal:
    // 1) Ask MERGE?
    // 2) If No -> Ask REPLACE?
    const doMerge = await askConfirm(
      "Import mode: MERGE into current data? (Yes = Merge, No = Next)",
      "Import all groups"
    );

    if (doMerge) {
      mergeAppState(incoming);
      saveState();
      render();
      alert("Merged successfully. You can continue working now.");
      return;
    }

    const doReplace = await askConfirm(
      "Import mode: REPLACE all current data on this device? (Yes = Replace, No = Cancel)",
      "Import all groups"
    );

    if (!doReplace) return;

    appState = normalizeAppState(incoming); // IMPORTANT: normalize!
    saveState();
    render();
    alert("Imported successfully. You can continue working now.");
  } catch {
    alert("Import failed: invalid JSON file.");
  } finally {
    importAllInput.value = "";
  }
});

// Reset CURRENT group only
resetBtn?.addEventListener("click", async () => {
  const g = activeGroup();
  const ok = await askConfirm(`Reset group "${g.name}"? This will clear all its data.`, "Reset group");
  if (!ok) return;

  g.data = defaultGroupData();
  saveState();
  render();
});

// Grand Total toggle: Active / All
totalsActiveBtn?.addEventListener("click", () => {
  appState.grandMode = "active";
  saveState();
  updateGrandToggleUI();
  recalcAndRenderTotals();
});

totalsAllBtn?.addEventListener("click", () => {
  appState.grandMode = "all";
  saveState();
  updateGrandToggleUI();
  recalcAndRenderTotals();
});

/* =========================
   13) Scroll-to-top
========================= */

function toggleToTop() {
  if (!toTopBtn) return;
  if (window.scrollY > 450) toTopBtn.classList.add("show");
  else toTopBtn.classList.remove("show");
}

window.addEventListener("scroll", toggleToTop);
toggleToTop();

toTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

 function exportPdfAllGroups() {
  // Check jsPDF
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

  let y = margin;

  const lineH = 6;

  const addPageIfNeeded = (need = lineH) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const textLine = (txt, size = 11, bold = false) => {
    addPageIfNeeded(lineH);
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

  // --- Build totals ---
  const overall = { gross: 0, net: 0, my: 0, groups: appState.groups.length };

  const groupsData = appState.groups.map((gr) => {
    const st = gr.data;

    const groupTotals = st.periods.reduce(
      (acc, p) => {
        const pg = p.rows.reduce((s, r) => s + parseMoney(r.gross), 0);
        const pn = p.rows.reduce((s, r) => s + parseMoney(r.net), 0);
        const pm = pn * (clampRate(st.defaultRatePercent) / 100);

        acc.gross += pg;
        acc.net += pn;
        acc.my += pm;
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

  // --- Header ---
  textLine("Client Totals — PDF Report (ALL Groups)", 16, true);
  textLine(`Exported: ${new Date().toLocaleString()}`, 10, false);
  hr();

  // --- Overall summary ---
  textLine("OVERALL SUMMARY", 12, true);
  textLine(`Groups: ${overall.groups}`, 11, false);
  textLine(`Gross: ${money(overall.gross)}   Net: ${money(overall.net)}   My €: ${money(overall.my)}`, 11, true);
  hr();

  // --- Per group ---
  groupsData.forEach(({ gr, st, groupTotals }, gi) => {
    textLine(`GROUP: ${gr.name}`, 13, true);
    textLine(`Default %: ${money(st.defaultRatePercent)}%   Periods: ${groupTotals.periods}   Rows: ${groupTotals.rows}`, 10, false);
    textLine(`Gross: ${money(groupTotals.gross)}   Net: ${money(groupTotals.net)}   My €: ${money(groupTotals.my)}`, 11, true);
    hr();

    // Periods
    st.periods.forEach((p, pi) => {
      const from = p.from || "—";
      const to = p.to || "—";

      const pg = p.rows.reduce((s, r) => s + parseMoney(r.gross), 0);
      const pn = p.rows.reduce((s, r) => s + parseMoney(r.net), 0);
      const pm = pn * (clampRate(st.defaultRatePercent) / 100);

      textLine(`Period ${pi + 1}: ${from} → ${to}`, 11, true);
      textLine(`Gross: ${money(pg)}   Net: ${money(pn)}   My €: ${money(pm)}   (Clients: ${p.rows.length})`, 10, false);

      // Simple rows list (no horizontal scroll in PDF)
      p.rows.forEach((r) => {
        const name = (r.customer || "Client").toString().trim() || "Client";
        const rg = money(parseMoney(r.gross));
        const rn = money(parseMoney(r.net));
        textLine(`• ${name} | Gross: ${rg} | Net: ${rn}`, 10, false);
      });

      hr();
    });

    if (gi !== groupsData.length - 1) {
      addPageIfNeeded(20);
    }
  });

  const fileName = `client-totals_ALL_${nowStamp()}.pdf`;

// Give UI time before triggering the download dialog (prevents freeze)
setTimeout(() => {
  try {
    doc.save(fileName);
  } catch (e) {
    console.error(e);
    alert("PDF export failed (device download issue). Try again or use Chrome.");
  }
}, 150);
}

/* =========================
   14) Init
========================= */

// Always start in REVIEW on page load
appState.uiMode = "review";
saveState();

render();
setMode("review");