// 35-ui-sync.js
// Centralized UI sync helpers

function refreshUiChrome() {
  setControlsForMode(appState.uiMode);
  updateGrandToggleUI();
  updateWorkspaceSwitchUI();
  renderGroupSelect();
  updateControlsButtonLabel();

  document.documentElement.classList.toggle(
    "is-edit",
    appState.uiMode === "edit"
  );

  updateFloatingAddClientVisibility();
}

async function refreshFullUiState() {
  refreshUiChrome();
  await updateAfterGlobalChange();
}

async function updateDataBackupInfo() {
  // Best available storage estimate for this origin
  let sizeMB = "0.00";
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = Number(estimate?.usage || 0);
      sizeMB = (usage / 1024 / 1024).toFixed(2);
    } else {
      const raw = JSON.stringify(appState || {});
      sizeMB = (new Blob([raw]).size / 1024 / 1024).toFixed(2);
    }
  } catch {
    try {
      const raw = JSON.stringify(appState || {});
      sizeMB = (new Blob([raw]).size / 1024 / 1024).toFixed(2);
    } catch {}
  }

  const groups = appState?.groups || [];

  const activeGroups = groups.filter(g => !g.archived);
  const archiveGroups = groups.filter(g => !!g.archived);

  let activePeriods = 0;
  let activeRows = 0;
  let archivePeriods = 0;
  let archiveRows = 0;

  activeGroups.forEach((group) => {
    const periods = group?.data?.periods || [];
    activePeriods += periods.length;
    periods.forEach((period) => {
      activeRows += (period?.rows || []).length;
    });
  });

  archiveGroups.forEach((group) => {
    const periods = group?.data?.periods || [];
    archivePeriods += periods.length;
    periods.forEach((period) => {
      archiveRows += (period?.rows || []).length;
    });
  });

  const meta = await getBackupMeta();
  const count = Number(meta?.count || 0);
  const lastBackupAt = meta?.lastBackupAt || "";

  let status = "No backup";
  if (lastBackupAt) {
    const diffDays = (Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60 * 24);
    status = diffDays <= 7 ? "Safe" : "Backup old";
  }

  if (dbStorageEl) {
    dbStorageEl.textContent = `${sizeMB} MB`;
  }

  if (dbActiveEl) {
    dbActiveEl.textContent = `${activeGroups.length} g • ${activePeriods} periods • ${activeRows} rows`;
  }

  if (dbArchiveEl) {
    dbArchiveEl.textContent = `${archiveGroups.length} g • ${archivePeriods} periods • ${archiveRows} rows`;
  }

  if (dbLastBackupEl) {
    dbLastBackupEl.textContent = lastBackupAt
      ? new Date(lastBackupAt).toLocaleString()
      : "Never";
  }

  if (dbCountEl) {
    dbCountEl.textContent = String(count);
  }

  if (dbStatusEl) {
    dbStatusEl.textContent = status;
    dbStatusEl.classList.remove("backup-status-safe", "backup-status-old", "backup-status-none");

    if (status === "Safe") {
      dbStatusEl.classList.add("backup-status-safe");
    } else if (status === "Backup old") {
      dbStatusEl.classList.add("backup-status-old");
    } else {
      dbStatusEl.classList.add("backup-status-none");
    }
  }
  if (typeof refreshCloudSyncStatusFromServer === "function") {
    refreshCloudSyncStatusFromServer();
  }
}