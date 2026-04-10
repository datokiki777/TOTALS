// 01-config.js
// Storage keys, PIN constants, and configuration values

const DB_NAME = "client_totals_db";
const DB_VERSION = 1;
const DB_STORE_MAIN = "app_store";

const STORAGE_KEY = "client_totals_groups_v1";
const CONTROLS_KEY = "ct_controls_collapsed";
const THEME_KEY = "ct_theme_v1";
const SUMMARY_COLLAPSED_KEY = "ct_summary_collapsed";
const MONTH_CURSOR_KEY = "ct_month_cursor";
const PERIODS_COLLAPSED_KEY = "ct_periods_collapsed";
const BACKUP_REMINDER_DIRTY_KEY = "ct_backup_reminder_dirty";
const BACKUP_REMINDER_LAST_CHANGE_KEY = "ct_backup_reminder_last_change";
const BACKUP_REMINDER_LAST_SHOWN_KEY = "ct_backup_reminder_last_shown_week";

const DB_KEY_APP_STATE = "appState";
const DB_KEY_THEME = "theme";
const DB_KEY_CONTROLS_COLLAPSED = "controlsCollapsed";
const DB_KEY_SUMMARY_COLLAPSED = "summaryCollapsed";
const DB_KEY_MONTH_CURSOR = "monthCursor";
const DB_KEY_COLLAPSED_PERIODS = "collapsedPeriods";
const DB_KEY_BACKUP_REMINDER_DIRTY = "backupReminderDirty";
const DB_KEY_BACKUP_REMINDER_LAST_CHANGE = "backupReminderLastChange";
const DB_KEY_BACKUP_REMINDER_LAST_SHOWN = "backupReminderLastShownWeek";
const DB_KEY_PIN_VERIFIED = "pinVerified";

const APP_PIN = "369700";
const PIN_VERIFIED_KEY = "ct_pin_verified_v1";