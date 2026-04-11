// 04-storage.js
// Storage functions - IndexedDB management

/* =========================
   IndexedDB Core Functions
========================= */

let dbInstance = null;

function openDb() {
  return new Promise((resolve, reject) => {
    if (dbInstance && dbInstance.name === DB_NAME) {
      return resolve(dbInstance);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DB_STORE_MAIN)) {
        db.createObjectStore(DB_STORE_MAIN);
      }
    };
  });
}

async function dbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DB_STORE_MAIN], "readonly");
    const store = tx.objectStore(DB_STORE_MAIN);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DB_STORE_MAIN], "readwrite");
    const store = tx.objectStore(DB_STORE_MAIN);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function dbDelete(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DB_STORE_MAIN], "readwrite");
    const store = tx.objectStore(DB_STORE_MAIN);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/* =========================
   App State Functions
========================= */

async function saveState(options = {}) {
  try {
    if (appState) {
      await dbSet(DB_KEY_APP_STATE, appState);
    }
    if (!options.skipBackupReminderDirty) {
      await markBackupReminderDirty();
    }
  } catch (error) {
    console.error("Failed to save state:", error);
  }
}

async function loadState() {
  try {
    const state = await dbGet(DB_KEY_APP_STATE);
    if (!state) return defaultAppState();
    return normalizeAppState(state);
  } catch (error) {
    console.error("Failed to load state:", error);
    return defaultAppState();
  }
}

/* =========================
   Summary Collapsed
========================= */

async function getSavedSummaryCollapsed() {
  try {
    const value = await dbGet(DB_KEY_SUMMARY_COLLAPSED);
    return value === true;
  } catch {
    return false;
  }
}

async function setSummaryCollapsed(v) {
  rootEl.classList.toggle("summary-collapsed", !!v);
  try {
    await dbSet(DB_KEY_SUMMARY_COLLAPSED, !!v);
  } catch (error) {
    console.error("Failed to set summary collapsed:", error);
  }
}

/* =========================
   Month Cursor
========================= */

async function getSavedMonthCursor() {
  try {
    const value = await dbGet(DB_KEY_MONTH_CURSOR);
    return value || "";
  } catch {
    return "";
  }
}

async function setSavedMonthCursor(v) {
  try {
    await dbSet(DB_KEY_MONTH_CURSOR, v || "");
  } catch (error) {
    console.error("Failed to set month cursor:", error);
  }
}

/* =========================
   Backup Reminder
========================= */

async function markBackupReminderDirty() {
  try {
    await dbSet(DB_KEY_BACKUP_REMINDER_DIRTY, true);
    await dbSet(DB_KEY_BACKUP_REMINDER_LAST_CHANGE, String(Date.now()));
  } catch (error) {
    console.error("Failed to mark backup reminder dirty:", error);
  }
}

function getWeekKeyForReminder(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() + diffToMonday);

  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");

  return `${y}-${m}-${dd}`;
}

function isBackupReminderWindow(date = new Date()) {
  const day = date.getDay();
  const hour = date.getHours();

  if (day === 0 && hour >= 19) return true;
  if (day === 1) return true;
  return false;
}

async function shouldShowBackupReminder(now = new Date()) {
  try {
    const dirty = await dbGet(DB_KEY_BACKUP_REMINDER_DIRTY);
    if (!dirty) return false;
    if (!isBackupReminderWindow(now)) return false;

    const currentWeekKey = getWeekKeyForReminder(now);
    const lastShownWeekKey = await dbGet(DB_KEY_BACKUP_REMINDER_LAST_SHOWN) || "";

    if (lastShownWeekKey === currentWeekKey) return false;

    const lastChangeRaw = await dbGet(DB_KEY_BACKUP_REMINDER_LAST_CHANGE);
    if (!lastChangeRaw) return false;

    const lastChange = new Date(Number(lastChangeRaw));
    if (Number.isNaN(lastChange.getTime())) return false;

    const changeWeekKey = getWeekKeyForReminder(lastChange);
    return changeWeekKey === currentWeekKey;
  } catch {
    return false;
  }
}

/* =========================
   Collapsed Periods
========================= */

let collapsedPeriodsCache = null;

async function getSavedCollapsedPeriods() {
  if (collapsedPeriodsCache !== null) {
    return collapsedPeriodsCache;
  }

  try {
    collapsedPeriodsCache = await dbGet(DB_KEY_COLLAPSED_PERIODS) || {};
  } catch {
    collapsedPeriodsCache = {};
  }

  return collapsedPeriodsCache;
}

async function saveCollapsedPeriods(map) {
  collapsedPeriodsCache = map || {};
  try {
    await dbSet(DB_KEY_COLLAPSED_PERIODS, collapsedPeriodsCache);
  } catch (error) {
    console.error("Failed to save collapsed periods:", error);
  }
}

async function isPeriodCollapsed(periodId) {
  const map = await getSavedCollapsedPeriods();
  return !!map[periodId];
}

async function setPeriodCollapsed(periodId, collapsed) {
  const map = await getSavedCollapsedPeriods();
  map[periodId] = !!collapsed;
  await saveCollapsedPeriods(map);
}

/* =========================
   PIN Verified
========================= */

async function isDeviceVerified() {
  try {
    const value = await dbGet(DB_KEY_PIN_VERIFIED);
    return value === true;
  } catch {
    return false;
  }
}

async function setDeviceVerified(v) {
  try {
    await dbSet(DB_KEY_PIN_VERIFIED, !!v);
  } catch (error) {
    console.error("Failed to set device verified:", error);
  }
}

/* =========================
   Month Cursor Helper
========================= */

async function getCurrentMonthKey(mode) {
  const keys = getAllMonthKeysForMode(mode);
  if (!keys.length) return "";

  const saved = await getSavedMonthCursor();
  if (saved && keys.includes(saved)) return saved;

  return keys[keys.length - 1];
}
