// 17-cloud-sync.js
// Auto Cloud Sync (phase 1)
// Local-first app, Firestore as background sync layer

const CLOUD_SYNC_DEBOUNCE_MS = 8000;
const CLOUD_SYNC_FORCE_MS = 30000;
const CLOUD_HISTORY_COLLECTION = "backups_history";
const CLOUD_HISTORY_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 საათი
const CLOUD_META_PENDING_HISTORY_DAY = "__cloud_pending_history_day";
const CLOUD_META_LAST_HISTORY_SAVED_DAY = "__cloud_last_history_saved_day";

let cloudSyncTimer = null;
let cloudForceTimer = null;
let cloudSyncInFlight = false;
let cloudHasPendingChanges = false;
let cloudLastSyncedAt = "";
let cloudLastError = "";
let cloudSyncStartedAt = 0;

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
  return `${d}-${m}-${y}`;
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDayKey(d);
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
      ? `Synced • ${new Date(at).toLocaleTimeString()}`
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

  dbCloudSyncStatusEl.textContent = "—";
  dbCloudSyncStatusEl.classList.add("backup-status-none");
}

async function writeCloudMainSnapshot() {
  const db = window.__db;
  if (!db) throw new Error("Firebase not initialized");

  const payload = {
    data: appState,
    updatedAt: new Date().toISOString()
  };

  await db.collection("backups").doc("main").set(payload);
  return payload.updatedAt;
}

async function runCloudSyncNow(reason = "auto") {
  if (cloudSyncInFlight) return false;
  if (!cloudHasPendingChanges && reason !== "manual" && reason !== "startup-check") {
    return false;
  }

  cloudSyncInFlight = true;
  cloudSyncStartedAt = Date.now();
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
  try {
    const db = window.__db;
    if (!db) return false;

    const todayKey = toDayKey();
    const pendingDay = await getPendingHistoryDay();
    if (!pendingDay) return false;

    if (pendingDay === todayKey) {
      return false;
    }

    const lastSavedDay = await getLastHistorySavedDay();
    if (lastSavedDay === pendingDay) {
      await dbDelete(CLOUD_META_PENDING_HISTORY_DAY);
      return false;
    }

    const historyDoc = await db.collection(CLOUD_HISTORY_COLLECTION).doc(pendingDay).get();
    if (historyDoc.exists) {
      await setLastHistorySavedDay(pendingDay);
      await dbDelete(CLOUD_META_PENDING_HISTORY_DAY);
      return false;
    }

    const mainDoc = await db.collection("backups").doc("main").get();
    if (!mainDoc.exists) return false;

    const mainPayload = mainDoc.data();
    if (!mainPayload?.data) return false;

    const expireAt = new Date();
expireAt.setDate(expireAt.getDate() + 30);

await db.collection(CLOUD_HISTORY_COLLECTION).doc(pendingDay).set({
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
    const db = window.__db;
    if (!db) return [];

    const snap = await db
      .collection(CLOUD_HISTORY_COLLECTION)
      .get();

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
  const db = window.__db;
  if (!db) throw new Error("Firebase not initialized");

  const mainDoc = await db.collection("backups").doc("main").get();
  const historyItems = await getCloudHistorySnapshots();

  const options = [];

  if (mainDoc.exists) {
    const mainData = mainDoc.data() || {};
    options.push({
      id: "latest",
      label: `Latest Cloud${mainData.updatedAt ? " • " + new Date(mainData.updatedAt).toLocaleString() : ""}`,
      payload: mainData
    });
  }

  historyItems.forEach((item) => {
    options.push({
      id: `history:${item.id}`,
      label: `History • ${item.historyDayDisplay}`,
      payload: item
    });
  });

  if (!options.length) {
    return null;
  }

  if (options.length === 1) {
    return options[0];
  }

  const text = options
    .map((opt, index) => `${index + 1}. ${opt.label}`)
    .join("\n");

  const picked = await askText(
    "Choose restore source:\n\n" + text + "\n\nEnter number:",
    "Cloud Restore",
    { placeholder: "1" }
  );

  if (!picked) return null;

  const index = Number(String(picked).trim()) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= options.length) {
    await askConfirm(
      "Invalid selection.",
      "Cloud Restore",
      { singleButton: true, okText: "OK" }
    );
    return null;
  }

  return options[index];
}

async function refreshCloudSyncStatusFromServer() {
  try {
    const db = window.__db;
    if (!db) {
      setCloudSyncStatus("error");
      return;
    }

    const doc = await db.collection("backups").doc("main").get();

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
      "Cloud Save successful ☁️",
      "Cloud Sync",
      { singleButton: true, okText: "OK" }
    );
  } catch (error) {
    console.error("Cloud Save failed:", error);
    await askConfirm(
      "Cloud Save failed ❌",
      "Cloud Sync",
      { singleButton: true, okText: "OK" }
    );
  }
}

async function handleCloudLoad() {
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

    appState = normalizeAppState(restoreData);
    cleanupDefaultGroup();

    await saveState({ skipCloudAutoSync: true });
    cloudHasPendingChanges = false;
    cloudLastError = "";

    if (appState.uiMode === "edit") {
      render();
    } else {
      renderReview();
    }

    await refreshFullUiState();
    setCloudSyncStatus("synced", payload?.updatedAt || payload?.savedAt || new Date().toISOString());

    await askConfirm(
      "Cloud Restore successful ☁️",
      "Cloud Restore",
      { singleButton: true, okText: "OK" }
    );
  } catch (error) {
    console.error("Cloud Load failed:", error);
    setCloudSyncStatus("error");

    await askConfirm(
      "Cloud Load failed ❌",
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