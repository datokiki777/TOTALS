// 20-actions-groups.js
// Group management functions - add, rename, delete, archive, switch, merge

/* =========================
   Add Group
========================= */

async function addGroup() {
  const name = await askText(
    "New Group",
    "Enter group name:",
    `Group ${appState.groups.length + 1}`,
    "Add"
  );

  if (!name) return;

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
  appState.lastActiveGroupIdActive = g.id;
  await saveState();

  await setMode("edit");
  render();
}

/* =========================
   Rename Group
========================= */

async function renameGroup() {
  const g = activeGroup();

  const name = await askText(
    "Rename Group",
    "Enter new group name:",
    g.name,
    "Rename"
  );

  if (!name) return;

  g.name = name.toString().trim() || g.name;
  await saveState();
  renderGroupSelect();
  render();
  if (appState.uiMode === "review") renderReview();
}

/* =========================
   Delete Group
========================= */

async function deleteGroup() {
  const g = activeGroup();
  const ok = await askConfirm(
    `Delete group "${g.name}"?`,
    "Delete group",
    { type: "danger", okText: "Delete" }
  );
  if (!ok) return;

  appState.groups = appState.groups.filter((x) => x.id !== g.id);
  // თუ აღარ დარჩა ჯგუფები → შექმენი ახალი ცარიელი
  if (appState.groups.length === 0) {
    const newGroup = {
      id: uuid(),
      name: "New Group",
      archived: false,
      data: defaultGroupData()
    };
    appState.groups.push(newGroup);
    appState.activeGroupId = newGroup.id;
    appState.lastActiveGroupIdActive = newGroup.id;
  }

  const nextGroup = appState.groups.find((x) =>
    appState.workspaceMode === "archive"
      ? x.archived === true
      : x.archived !== true
  ) || appState.groups[0];

  appState.activeGroupId = nextGroup?.id || "";

  if (appState.workspaceMode === "archive") {
    appState.lastActiveGroupIdArchive = appState.activeGroupId;
  } else {
    appState.lastActiveGroupIdActive = appState.activeGroupId;
  }

  await saveState();
  render();
  if (appState.uiMode === "review") renderReview();
}

/* =========================
   Archive / Unarchive Group
========================= */

async function toggleArchiveGroup(groupId) {
  const group = appState.groups.find(g => g.id === groupId);
  if (!group) return;

  group.archived = !group.archived;

  if (group.archived) {
    appState.workspaceMode = "archive";
  } else {
    appState.workspaceMode = "active";
  }

  const firstInWorkspace = appState.groups.find((g) =>
    appState.workspaceMode === "archive"
      ? g.archived === true
      : g.archived !== true
  );

  if (firstInWorkspace) {
    appState.activeGroupId = firstInWorkspace.id;

    if (appState.workspaceMode === "archive") {
      appState.lastActiveGroupIdArchive = firstInWorkspace.id;
    } else {
      appState.lastActiveGroupIdActive = firstInWorkspace.id;
    }
  }

  if (appState.uiMode === "edit") {
    appState.grandMode = "active";
  } else {
    appState.grandMode = "all";
  }

  await saveState();
  updateWorkspaceSwitchUI();
  renderGroupSelect();
  render();

  if (appState.uiMode === "review") renderReview();
}

/* =========================
   Switch Group
========================= */

async function switchGroup(groupId) {
  if (!groupId) return;

  const group = appState.groups.find(g => g.id === groupId);
  if (!group) return;

  appState.activeGroupId = groupId;

  if (group.archived) {
    appState.lastActiveGroupIdArchive = groupId;
  } else {
    appState.lastActiveGroupIdActive = groupId;
  }

  await saveState();
  render();
  if (appState.uiMode === "review") renderReview();
}

/* =========================
   Find Group by Name (for merge)
========================= */

function findGroupByName(name) {
  const key = (name ?? "").toString().trim().toLowerCase();
  if (!key) return null;
  return appState.groups.find((g) => g.name.toLowerCase() === key) || null;
}

/* =========================
   Clone and Re-ID Group (for import)
========================= */

function cloneAndReIdGroup(group) {
  const g = {
    id: uuid(),
    name: (group?.name ?? "Group").toString().trim() || "Group",
    archived: group?.archived === true,
    data: normalizeGroupData(group?.data),
  };

  g.data.periods = g.data.periods.map((p) => ({
    ...p,
    id: uuid(),
    rows: (p.rows || []).map((r) => ({
      ...r,
      id: uuid(),
    })),
  }));

  return g;
}

/* =========================
   Merge App State (for JSON import)
========================= */

function normalizeMergeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isSameMergeRow(a, b) {
  return (
    normalizeMergeText(a?.customer) === normalizeMergeText(b?.customer) &&
    normalizeMergeText(a?.city) === normalizeMergeText(b?.city) &&
    parseMoney(a?.gross) === parseMoney(b?.gross) &&
    parseMoney(a?.net) === parseMoney(b?.net) &&
    normalizeMergeText(a?.done || "none") === normalizeMergeText(b?.done || "none")
  );
}

function mergeAppState(incomingState) {
  const incoming = normalizeAppState(incomingState);

  if (!incoming?.groups?.length) {
    return {
      groupsAdded: 0,
      periodsAdded: 0,
      rowsAdded: 0,
      rowsSkipped: 0
    };
  }

  const mergeTotals = {
    groupsAdded: 0,
    periodsAdded: 0,
    rowsAdded: 0,
    rowsSkipped: 0,
    ratesChanged: 0
  };

  incoming.groups.forEach((incomingGroup) => {
    const existing = appState.groups.find((g) => {
      const sameName =
        (g?.name ?? "").toString().trim().toLowerCase() ===
        (incomingGroup?.name ?? "").toString().trim().toLowerCase();

      const sameArchive =
        (g?.archived === true) === (incomingGroup?.archived === true);

      return sameName && sameArchive;
    });

    // თუ ასეთი group საერთოდ არ არსებობს → დაამატე მთლიანად
    if (!existing) {
      const cloned = cloneAndReIdGroup(incomingGroup);
      cloned.archived = incomingGroup.archived === true;
      appState.groups.push(cloned);

      mergeTotals.groupsAdded++;
      mergeTotals.periodsAdded += (cloned.data?.periods || []).length;
      mergeTotals.rowsAdded += (cloned.data?.periods || []).reduce(
        (sum, p) => sum + ((p.rows || []).length),
        0
      );

      return;
    }

    const incomingPeriods = normalizeGroupData(incomingGroup.data).periods;

    incomingPeriods.forEach((incomingPeriod) => {
      const existingPeriod = (existing.data?.periods || []).find((p) =>
        (p?.from || "") === (incomingPeriod?.from || "") &&
        (p?.to || "") === (incomingPeriod?.to || "")
      );

      // თუ ასეთი period არ არსებობს → დაამატე მთლიანად
      if (!existingPeriod) {
        existing.data.periods.push({
          ...incomingPeriod,
          id: uuid(),
          rows: (incomingPeriod.rows || []).map((row) => ({
            ...row,
            id: uuid()
          }))
        });

        mergeTotals.periodsAdded++;
        mergeTotals.rowsAdded += (incomingPeriod.rows || []).length;
        return;
      }

      // თუ period არსებობს → დაამატე მხოლოდ ახალი rows
      (incomingPeriod.rows || []).forEach((incomingRow) => {
        const alreadyExists = (existingPeriod.rows || []).some((existingRow) =>
          isSameMergeRow(existingRow, incomingRow)
        );

        if (alreadyExists) {
          mergeTotals.rowsSkipped++;
          return;
        }

        existingPeriod.rows.push({
          ...incomingRow,
          id: uuid()
        });

        mergeTotals.rowsAdded++;
      });
    });

    const incomingRate = clampRate(
      incomingGroup?.data?.defaultRatePercent ?? existing.data.defaultRatePercent
    );

    const oldRate = existing.data.defaultRatePercent;

    if (oldRate !== incomingRate) {
      mergeTotals.ratesChanged++;
    }

    existing.data.defaultRatePercent = incomingRate;
  });

  appState = normalizeAppState(appState);
  return mergeTotals;
}