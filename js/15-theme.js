// 15-theme.js
// Theme, UI mode, workspace, collapse functions (full)

async function initThemeAsync() {
  const saved = (await dbGet(DB_KEY_THEME)) || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  if (themeSwitch) {
    themeSwitch.checked = saved === "light";
    themeSwitch.addEventListener("change", async () => {
      const next = themeSwitch.checked ? "light" : "dark";
      await dbSet(DB_KEY_THEME, next);
      document.documentElement.setAttribute("data-theme", next);
    });
  }
}

async function initControlsToggleAsync() {
  try {
    const saved = await dbGet(DB_KEY_CONTROLS_COLLAPSED);
    if (saved === true) rootEl.classList.add("controls-collapsed");
    else rootEl.classList.remove("controls-collapsed");
  } catch(e) { console.error(e); }
  controlsToggle?.addEventListener("click", async () => {
    const next = !rootEl.classList.contains("controls-collapsed");
    rootEl.classList.toggle("controls-collapsed", next);
    await dbSet(DB_KEY_CONTROLS_COLLAPSED, next);
  });
}

async function initSummaryPanel() {
  const savedCollapsed = await getSavedSummaryCollapsed();
  await setSummaryCollapsed(savedCollapsed);
  summaryCollapseBtn?.addEventListener("click", async () => {
    const next = !rootEl.classList.contains("summary-collapsed");
    await setSummaryCollapsed(next);
  });
  monthPrevBtn?.addEventListener("click", () => shiftMonthCursor(-1));
  monthNextBtn?.addEventListener("click", () => shiftMonthCursor(1));
}

function updateWorkspaceSwitchUI() {
  const groups = Array.isArray(appState?.groups) ? appState.groups : [];
  const activeCount = groups.filter(g => g?.archived !== true).length;
  const archiveCount = groups.filter(g => g?.archived === true).length;
  if (workspaceActiveBtn) {
    workspaceActiveBtn.classList.toggle("active", appState.workspaceMode !== "archive");
    workspaceActiveBtn.innerHTML = `Active <span class="ws-badge">${activeCount}</span>`;
  }
  if (workspaceArchiveBtn) {
    workspaceArchiveBtn.classList.toggle("active", appState.workspaceMode === "archive");
    workspaceArchiveBtn.innerHTML = `Archive <span class="ws-badge">${archiveCount}</span>`;
  }
}

async function setWorkspaceMode(mode) {
  const next = mode === "archive" ? "archive" : "active";
  if (appState.workspaceMode === next) return;
  const currentGroup = activeGroup();
  if (appState.workspaceMode === "active") {
    appState.lastActiveGroupIdActive = currentGroup?.id || "";
  } else {
    appState.lastActiveGroupIdArchive = currentGroup?.id || "";
  }
  appState.workspaceMode = next;
  const rememberedId = next === "archive" ? appState.lastActiveGroupIdArchive : appState.lastActiveGroupIdActive;
  const rememberedGroup = appState.groups.find(g => g.id === rememberedId && (next === "archive" ? g.archived : !g.archived));
  const firstInWorkspace = appState.groups.find(g => next === "archive" ? g.archived : !g.archived);
  if (rememberedGroup) appState.activeGroupId = rememberedGroup.id;
  else if (firstInWorkspace) appState.activeGroupId = firstInWorkspace.id;
  if (appState.uiMode === "edit") appState.grandMode = "active";
  else appState.grandMode = appState.lastReviewGrandMode === "all" ? "all" : "active";
  await saveState();

  // REFACTORED: use refreshFullUiState
  if (appState.uiMode === "edit") {
    render();
    await refreshFullUiState();
  } else {
    if (editView) editView.hidden = true;
    if (reviewView) reviewView.hidden = false;
    await refreshFullUiState();
  }
}

function initWorkspaceSwitch() {
  workspaceActiveBtn?.addEventListener("click", () => setWorkspaceMode("active"));
  workspaceArchiveBtn?.addEventListener("click", () => setWorkspaceMode("archive"));
}

function setControlsForMode(mode) {
  const isEdit = mode === "edit";
  if (editActions) editActions.style.display = isEdit ? "flex" : "none";
  if (reviewActions) reviewActions.style.display = isEdit ? "none" : "flex";
  const allBtns = [groupPickerBtn, addGroupBtn, renameGroupBtn, deleteGroupBtn, document.getElementById("archiveGroupBtn"), defaultRateInput, addPeriodBtn, resetBtn, topMenuBtn];
  allBtns.forEach(btn => { if (btn) btn.disabled = !(isEdit || btn === topMenuBtn || btn === groupPickerBtn); });
}

async function setMode(mode) {
  const nextMode = mode === "edit" ? "edit" : "review";
  if (nextMode === "edit") {
    appState.lastReviewGrandMode = appState.grandMode === "all" ? "all" : "active";
    appState.uiMode = "edit";
    appState.grandMode = "active";
    const current = await getCurrentMonthKey("active");
    await setSavedMonthCursor(current);
  } else {
    appState.uiMode = "review";
    appState.grandMode = appState.lastReviewGrandMode === "all" ? "all" : "active";
  }
  await saveState();

  modeEditBtn?.classList.toggle("active", appState.uiMode === "edit");
  modeReviewBtn?.classList.toggle("active", appState.uiMode === "review");

  if (editView && reviewView) {
    const isEdit = appState.uiMode === "edit";
    const isReview = appState.uiMode === "review";

    editView.hidden = !isEdit;
    reviewView.hidden = !isReview;

    if (isEdit) {
      reviewView.innerHTML = "";
    }
  }

  // REFACTORED: use centralized UI sync
  await refreshFullUiState();
}

async function shiftMonthCursor(dir) {
  const keys = getAllMonthKeysForMode(appState.grandMode);
  if (!keys.length) return;
  let currentKey = await getCurrentMonthKey(appState.grandMode);
  let idx = keys.indexOf(currentKey);
  if (idx === -1) idx = keys.length - 1;
  idx += dir;
  if (idx < 0) idx = 0;
  if (idx >= keys.length) idx = keys.length - 1;
  await setSavedMonthCursor(keys[idx]);
  await renderMonthlySection();
}