// 17-cloud-sync.js
// Auto Cloud Sync
// Local-first app, Firestore as background sync layer

const CLOUD_SYNC_DEBOUNCE_MS = 8000;
const CLOUD_SYNC_FORCE_MS = 30000;
const CLOUD_HISTORY_COLLECTION = "backups_history";
const CLOUD_META_PENDING_HISTORY_DAY = "__cloud_pending_history_day";
const CLOUD_META_LAST_HISTORY_SAVED_DAY = "__cloud_last_history_saved_day";

let cloudSyncTimer = null;
let cloudForceTimer = null;
let cloudSyncInFlight = false;
let cloudHasPendingChanges = false;
let cloudLastSyncedAt = "";
let cloudLastError = "";

function toDayKey(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toDisplayDay(dayKey) {
  const [y, m, d] = String(dayKey || "").split("-");
  if (!y || !m || !d) return dayKey || "";
  return `${d}/${m}/${y}`;
}

function formatCloudSnapshotDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatDateForRange(date);
}

async function getCloudRefs() {
  const db = window.__db;
  if (!db) throw new Error("Firebase not initialized");

  return {
    mainRef: db.collection("backups").doc("main"),
    historyCollection: db.collection(CLOUD_HISTORY_COLLECTION)
  };
}

async function markPendingHistoryDay(dayKey = toDayKey()) {
  try {
    await dbSet(CLOUD_META_PENDING_HISTORY_DAY, dayKey);
  } catch (error) {
    console.error("Failed to mark pending history day:", error);
  }
}

async function getPendingHistoryDay() {
  try {
    return (await dbGet(CLOUD_META_PENDING_HISTORY_DAY)) || "";
  } catch {
    return "";
  }
}

async function setLastHistorySavedDay(dayKey) {
  try {
    await dbSet(CLOUD_META_LAST_HISTORY_SAVED_DAY, dayKey || "");
  } catch (error) {
    console.error("Failed to set last history saved day:", error);
  }
}

async function getLastHistorySavedDay() {
  try {
    return (await dbGet(CLOUD_META_LAST_HISTORY_SAVED_DAY)) || "";
  } catch {
    return "";
  }
}

function setCloudSyncStatus(status, at = "") {
  window.__cloudSyncStatus = status || "idle";
  window.__cloudSyncAt = at || "";
  window.__cloudSyncError = cloudLastError || "";

  if (!dbCloudSyncStatusEl) return;

  dbCloudSyncStatusEl.classList.remove(
    "backup-status-safe",
    "backup-status-old",
    "backup-status-none",
    "backup-status-pending"
  );

  if (status === "synced") {
    dbCloudSyncStatusEl.textContent = at
      ? `Synced - ${new Date(at).toLocaleTimeString()}`
      : "Synced";
    dbCloudSyncStatusEl.classList.add("backup-status-safe");
    return;
  }

  if (status === "syncing") {
    dbCloudSyncStatusEl.textContent = "Syncing...";
    dbCloudSyncStatusEl.classList.add("backup-status-pending");
    return;
  }

  if (status === "local") {
    dbCloudSyncStatusEl.textContent = "Saved locally";
    dbCloudSyncStatusEl.classList.add("backup-status-old");
    return;
  }

  if (status === "error") {
    dbCloudSyncStatusEl.textContent = "Cloud error";
    dbCloudSyncStatusEl.classList.add("backup-status-none");
    return;
  }

  dbCloudSyncStatusEl.textContent = "-";
  dbCloudSyncStatusEl.classList.add("backup-status-none");
}

async function writeCloudMainSnapshot() {
  const refs = await getCloudRefs();

  const payload = {
    data: appState,
    updatedAt: new Date().toISOString()
  };

  await refs.mainRef.set(payload);
  return payload.updatedAt;
}

async function runCloudSyncNow(reason = "auto") {
  if (cloudSyncInFlight) return false;
  if (!cloudHasPendingChanges && reason !== "manual" && reason !== "startup-check") {
    return false;
  }

  cloudSyncInFlight = true;
  setCloudSyncStatus("syncing");

  try {
    const syncedAt = await writeCloudMainSnapshot();

    cloudHasPendingChanges = false;
    cloudLastSyncedAt = syncedAt;
    cloudLastError = "";

    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;

    clearTimeout(cloudForceTimer);
    cloudForceTimer = null;

    setCloudSyncStatus("synced", syncedAt);
    return true;
  } catch (error) {
    console.error("Auto cloud sync failed:", error);
    cloudLastError = String(error?.message || error || "Cloud sync failed");
    setCloudSyncStatus("local");
    return false;
  } finally {
    cloudSyncInFlight = false;
  }
}

function ensureCloudForceTimer() {
  if (cloudForceTimer) return;

  cloudForceTimer = setTimeout(async () => {
    cloudForceTimer = null;

    if (!cloudHasPendingChanges) return;
    await runCloudSyncNow("force");
  }, CLOUD_SYNC_FORCE_MS);
}

function scheduleCloudAutoSync(reason = "edit") {
  cloudHasPendingChanges = true;
  markPendingHistoryDay(toDayKey());

  if (!navigator.onLine) {
    setCloudSyncStatus("local");
    return;
  }

  setCloudSyncStatus("local");

  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(async () => {
    cloudSyncTimer = null;
    await runCloudSyncNow(reason);
  }, CLOUD_SYNC_DEBOUNCE_MS);

  ensureCloudForceTimer();
}

async function triggerImmediateCloudSync(reason = "big-action") {
  cloudHasPendingChanges = true;
  markPendingHistoryDay(toDayKey());

  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = null;

  clearTimeout(cloudForceTimer);
  cloudForceTimer = null;

  if (!navigator.onLine) {
    setCloudSyncStatus("local");
    return false;
  }

  return await runCloudSyncNow(reason);
}

async function finalizePendingHistoryDayIfNeeded() {
	if (!window.__db) return false;
  try {
    const refs = await getCloudRefs();
    const todayKey = toDayKey();
    const pendingDay = await getPendingHistoryDay();
    if (!pendingDay) return false;
    if (pendingDay === todayKey) return false;

    const lastSavedDay = await getLastHistorySavedDay();
    if (lastSavedDay === pendingDay) {
      await dbDelete(CLOUD_META_PENDING_HISTORY_DAY);
      return false;
    }

    const historyDoc = await refs.historyCollection.doc(pendingDay).get();
    if (historyDoc.exists) {
      await setLastHistorySavedDay(pendingDay);
      await dbDelete(CLOUD_META_PENDING_HISTORY_DAY);
      return false;
    }

    const mainDoc = await refs.mainRef.get();
    if (!mainDoc.exists) return false;

    const mainPayload = mainDoc.data();
    if (!mainPayload?.data) return false;

    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + 30);

    await refs.historyCollection.doc(pendingDay).set({
      type: "daily-history",
      historyDay: pendingDay,
      historyDayDisplay: toDisplayDay(pendingDay),
      sourceUpdatedAt: mainPayload.updatedAt || "",
      savedAt: new Date().toISOString(),
      expireAt: firebase.firestore.Timestamp.fromDate(expireAt),
      data: mainPayload.data
    });

    await setLastHistorySavedDay(pendingDay);
    await dbDelete(CLOUD_META_PENDING_HISTORY_DAY);
    return true;
  } catch (error) {
    console.error("Failed to finalize pending history day:", error);
    return false;
  }
}

async function getCloudHistorySnapshots() {
  try {
    const refs = await getCloudRefs();
    const snap = await refs.historyCollection.get();
    const items = [];

    snap.forEach((doc) => {
      const data = doc.data() || {};
      items.push({
        id: doc.id,
        type: "history",
        historyDay: data.historyDay || doc.id,
        historyDayDisplay: data.historyDayDisplay || toDisplayDay(doc.id),
        savedAt: data.savedAt || "",
        sourceUpdatedAt: data.sourceUpdatedAt || "",
        data: data.data || null
      });
    });

    items.sort((a, b) => String(b.historyDay).localeCompare(String(a.historyDay)));
    return items;
  } catch (error) {
    console.error("Failed to get cloud history snapshots:", error);
    return [];
  }
}

async function chooseCloudRestoreSource() {
  const refs = await getCloudRefs();
  const mainDoc = await refs.mainRef.get();
  const historyItems = await getCloudHistorySnapshots();
  const options = [];

  if (mainDoc.exists) {
    const mainData = mainDoc.data() || {};
    const latestDate = formatCloudSnapshotDate(mainData.updatedAt);
    options.push({
      id: "latest",
      label: `Latest Cloud${latestDate ? " - " + latestDate : ""}`,
      payload: mainData
    });
  }

  historyItems.forEach((item) => {
    options.push({
      id: `history:${item.id}`,
      label: `History - ${item.historyDayDisplay}`,
      payload: item
    });
  });

  if (!options.length) return null;
  if (options.length === 1) return options[0];

  return await askRestoreSource(options);
}

async function refreshCloudSyncStatusFromServer() {
  try {
    if (!window.__db) {
      setCloudSyncStatus("idle");
      return;
    }

    const refs = await getCloudRefs();
    const doc = await refs.mainRef.get();

    if (!doc.exists) {
      setCloudSyncStatus("idle");
      return;
    }

    const payload = doc.data();
    const updatedAt = payload?.updatedAt || "";

    if (cloudHasPendingChanges) {
      setCloudSyncStatus("local");
      return;
    }

    cloudLastSyncedAt = updatedAt || "";
    setCloudSyncStatus(updatedAt ? "synced" : "idle", updatedAt);
  } catch (error) {
    console.error("Failed to refresh cloud status:", error);
    setCloudSyncStatus("error");
  }
}

async function handleCloudSave() {
  if (!window.__db) {
    await askConfirm(
      "Cloud sync is unavailable right now. Your data is still stored locally.",
      "Cloud Sync",
      { singleButton: true, okText: "OK" }
    );
    return;
  }

  try {
    cloudHasPendingChanges = true;
    const ok = await triggerImmediateCloudSync("manual");

    if (!ok) {
      await askConfirm(
        "Cloud Save failed. Data is still saved locally on this device.",
        "Cloud Sync",
        { singleButton: true, okText: "OK" }
      );
      return;
    }

    await askConfirm(
      "Cloud Save successful.",
      "Cloud Sync",
      { singleButton: true, okText: "OK" }
    );
  } catch (error) {
    console.error("Cloud Save failed:", error);
    await askConfirm(
      "Cloud Save failed.",
      "Cloud Sync",
      { singleButton: true, okText: "OK" }
    );
  }
}

async function handleCloudLoad() {
  if (!window.__db) {
    await askConfirm(
      "Cloud sync is unavailable right now. Local data is still safe on this device.",
      "Cloud Sync",
      { singleButton: true, okText: "OK" }
    );
    return;
  }

  try {
    const selected = await chooseCloudRestoreSource();
    if (!selected) {
      await askConfirm(
        "No cloud data found.",
        "Cloud Sync",
        { singleButton: true, okText: "OK" }
      );
      return;
    }

    const payload = selected.payload;
    const restoreData = payload?.data;
    if (!restoreData) {
      await askConfirm(
        "Selected cloud snapshot is invalid.",
        "Cloud Restore",
        { singleButton: true, okText: "OK" }
      );
      return;
    }

    const confirmLoad = await askConfirm(
      `Load this snapshot?\n\n${selected.label}\n\nThis will REPLACE current data.`,
      "Cloud Load",
      { type: "danger", okText: "Load" }
    );
    if (!confirmLoad) return;

    const currentUiMode = appState?.uiMode === "edit" ? "edit" : "review";
    const currentWorkspaceMode =
      appState?.workspaceMode === "archive" ? "archive" : "active";
    const currentGrandMode = appState?.grandMode === "all" ? "all" : "active";
    const currentLastReviewGrandMode =
      appState?.lastReviewGrandMode === "all" ? "all" : "active";

    appState = normalizeAppState({
      ...restoreData,
      uiMode: currentUiMode,
      workspaceMode: currentWorkspaceMode,
      grandMode: currentUiMode === "edit" ? "active" : currentGrandMode,
      lastReviewGrandMode:
        currentUiMode === "review" ? currentGrandMode : currentLastReviewGrandMode
    });
    cleanupDefaultGroup();

    await saveState({ skipCloudAutoSync: true });
    cloudHasPendingChanges = false;
    cloudLastError = "";

    if (editView && reviewView) {
      const isEdit = appState.uiMode === "edit";
      editView.hidden = !isEdit;
      reviewView.hidden = isEdit;
      if (isEdit) {
        reviewView.innerHTML = "";
      }
    }

    await refreshFullUiState();

    if (appState.uiMode === "edit") {
      render();
    } else {
      renderReview();
    }

    setCloudSyncStatus(
      "synced",
      payload?.updatedAt || payload?.savedAt || new Date().toISOString()
    );

    await askConfirm(
      "Cloud Restore successful.",
      "Cloud Restore",
      { singleButton: true, okText: "OK" }
    );
  } catch (error) {
    console.error("Cloud Load failed:", error);
    setCloudSyncStatus("error");

    await askConfirm(
      "Cloud Load failed.",
      "Cloud Sync",
      { singleButton: true, okText: "OK" }
    );
  }
}

window.addEventListener("online", () => {
  if (cloudHasPendingChanges) {
    triggerImmediateCloudSync("back-online");
  } else {
    refreshCloudSyncStatusFromServer();
  }
});

window.addEventListener("offline", () => {
  if (cloudHasPendingChanges) {
    setCloudSyncStatus("local");
  }
});

window.scheduleCloudAutoSync = scheduleCloudAutoSync;
window.triggerImmediateCloudSync = triggerImmediateCloudSync;
window.refreshCloudSyncStatusFromServer = refreshCloudSyncStatusFromServer;
window.handleCloudSave = handleCloudSave;
window.handleCloudLoad = handleCloudLoad;
window.finalizePendingHistoryDayIfNeeded = finalizePendingHistoryDayIfNeeded;
window.onCloudBackendReady = async (error) => {
  if (error) {
    if (cloudHasPendingChanges) {
      setCloudSyncStatus("local");
    } else {
      setCloudSyncStatus("idle");
    }
    return;
  }

  await refreshCloudSyncStatusFromServer();

  if (cloudHasPendingChanges && navigator.onLine) {
    await triggerImmediateCloudSync("backend-ready");
  }
};
