// 03-state.js
// App state, activeGroup, getGroupsByMode, normalization

let appState = null;
let isUnlocked = false;

function defaultAppState() {
  const g1 = {
    id: uuid(),
    name: "Group 1",
    archived: false,
    data: defaultGroupData(15.0)
  };
  return {
    activeGroupId: g1.id,
    lastActiveGroupIdActive: g1.id,
    lastActiveGroupIdArchive: "",
    groups: [g1],
    workspaceMode: "active",
    grandMode: "active",
    lastReviewGrandMode: "active",
    uiMode: "review",
  };
}

function emptyRow() {
  return { id: uuid(), customer: "", city: "", gross: "", net: "", done: "none" };
}

function defaultGroupData(rate = 15.0) {
  return {
    defaultRatePercent: clampRate(rate),
    periods: [{ id: uuid(), from: "", to: "", rows: [emptyRow()] }],
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
    rows: Array.isArray(p?.rows) && p.rows.length
      ? p.rows.map((r) => ({
          id: r?.id || uuid(),
          customer: r?.customer ?? "",
          city: r?.city ?? "",
          gross: r?.gross ?? "",
          net: r?.net ?? "",
          done: ["none", "done", "fail", "fixed"].includes(r?.done) ? r.done : "none",
        }))
      : [emptyRow()],
  }));
  return out;
}

function normalizeAppState(s) {
  const groups = Array.isArray(s?.groups) ? s.groups : [];
  const out = {
    activeGroupId: s?.activeGroupId || "",
    lastActiveGroupIdActive: s?.lastActiveGroupIdActive || "",
    lastActiveGroupIdArchive: s?.lastActiveGroupIdArchive || "",
    groups: [],
    workspaceMode: s?.workspaceMode === "archive" ? "archive" : "active",
    grandMode: s?.grandMode === "all" ? "all" : "active",
    lastReviewGrandMode: s?.lastReviewGrandMode === "all" ? "all" : "active",
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

async function initAppState() {
  const loadedState = await loadState();
  appState = loadedState;
  return appState;
}

function getAppState() {
  if (!appState) {
    console.warn("appState accessed before initialization, using default");
    return defaultAppState();
  }
  return appState;
}

async function setAppState(newState, save = true) {
  appState = newState;
  if (save) await saveState();
}

function activeGroup() {
  const state = getAppState();
  const current = state.groups.find((g) => g.id === state.activeGroupId);
  if (current && (state.workspaceMode === "archive" ? current.archived === true : current.archived !== true)) {
    return current;
  }
  const firstInWorkspace = state.groups.find((g) =>
    state.workspaceMode === "archive" ? g.archived === true : g.archived !== true
  );
  return firstInWorkspace || state.groups[0] || null;
}

function getGroupsByMode(mode = null) {
  const state = getAppState();
  const effectiveMode = mode !== null ? mode : state.grandMode;
  const workspaceGroups = state.groups.filter((g) =>
    state.workspaceMode === "archive" ? g.archived === true : g.archived !== true
  );
  if (effectiveMode === "active") {
    const current = activeGroup();
    return current ? [current] : [];
  }
  return workspaceGroups;
}