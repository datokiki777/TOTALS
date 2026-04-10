// JS MAP (functions) - NEW STRUCTURE
// Status: ✅ PRODUCTION READY (REFACTORED)

═══════════════════════════════════════
01-config.js
═══════════════════════════════════════
- IndexedDB config: DB_NAME, DB_VERSION, DB_STORE_MAIN
- Legacy localStorage keys (for migration only)
- New IndexedDB KV keys: 
  - DB_KEY_APP_STATE, DB_KEY_THEME, DB_KEY_CONTROLS_COLLAPSED
  - DB_KEY_SUMMARY_COLLAPSED, DB_KEY_MONTH_CURSOR, DB_KEY_COLLAPSED_PERIODS
  - DB_KEY_BACKUP_REMINDER_DIRTY, DB_KEY_BACKUP_REMINDER_LAST_CHANGE
  - DB_KEY_BACKUP_REMINDER_LAST_SHOWN, DB_KEY_PIN_VERIFIED
- APP_PIN, PIN_VERIFIED_KEY

═══════════════════════════════════════
02-dom.js
═══════════════════════════════════════
- DOM element references (unchanged)
- rootEl, modeEditBtn, modeReviewBtn
- workspaceActiveBtn, workspaceArchiveBtn
- editView, reviewView, elPeriods
- tplPeriod, tplRow, defaultRateInput
- grandGrossEl, grandNetEl, grandMyEl
- summaryCollapseBtn, monthPrevBtn, monthNextBtn
- monthLabel, monthGrossEl, monthNetEl, monthMyEl
- overviewDateRangeEl, overviewDurationEl
- groupPickerBtn, groupPickerBtnText
- addGroupBtn, renameGroupBtn, deleteGroupBtn
- groupPickerModal, groupPickerList, groupPickerClose
- totalsActiveBtn, totalsAllBtn
- topMenuBtn, topMenuBackdrop, topMenuPanel
- menuExportJsonBtn, menuImportJsonInput
- menuPdfBtn, menuExportExcelBtn, menuImportExcelInput
- editActions, reviewActions, toTopBtn
- controlsToggle, fabAddClient
- confirmBackdrop, confirmTitleEl, confirmTextEl, confirmNoBtn, confirmYesBtn
- statusListModal, statusListTitle, statusListBody, statusListClose
- themeSwitch, textPromptModal, textPromptTitle, textPromptText
- textPromptInput, textPromptCancel, textPromptOk
- pinLockModal, pinLockInput, pinUnlockBtn, pinLockError
- bodyOverflowBeforePinLock

═══════════════════════════════════════
03-state.js
═══════════════════════════════════════
- appState (initialized via initAppState)
- getAppState(), setAppState()
- activeGroup(), getGroupsByMode()
- isReviewGroupCollapsed(), toggleReviewGroupCollapsed()
  → Review group cards default collapsed / expandable state
  → All mode: current group first, then newest groups below
- defaultAppState(), normalizeAppState(), normalizeGroupData()
- emptyRow(), defaultGroupData()
- isDefaultEmptyGroup(g)
- cleanupDefaultGroup()
  → removes empty default template group when real groups exist
  → auto-switches activeGroup if needed
- initAppState() - async loader

═══════════════════════════════════════
04-storage.js
═══════════════════════════════════════
- openDb(), dbGet(), dbSet(), dbDelete()
- migrateFromLocalStorage() - one-time migration
- saveState(), loadState()
- getSavedSummaryCollapsed(), setSummaryCollapsed()
- getSavedMonthCursor(), setSavedMonthCursor()
- getSavedCollapsedPeriods(), saveCollapsedPeriods()
- isPeriodCollapsed(), setPeriodCollapsed()
- isDeviceVerified(), setDeviceVerified()
- getCurrentMonthKey()
- Backup reminder: markBackupReminderDirty()
- shouldShowBackupReminder(), getWeekKeyForReminder()
- isBackupReminderWindow()

═══════════════════════════════════════
05-utils-core.js
═══════════════════════════════════════
- uuid(), fmt(), animateNumber()
- parseMoney(), clampRate(), safeFileName()
- escapeHtml()
- getDigitsOnly(), isSuspiciousNetComparedToGross()

═══════════════════════════════════════
10-calc-dates.js
═══════════════════════════════════════
- startOfDay(), daysBetweenInclusive()
- parseDateOnly(), getDurationMonthsDays()
- monthKeyFromDateObj(), formatMonthKey()
- getMonthStart(), getMonthEnd(), getOverlapDaysInclusive()
- formatDateLocal(), formatPeriodPreview(), formatDateForRange()
- getGroupsDateRange(), getAllMonthKeysForMode()

═══════════════════════════════════════
11-calc-status.js
═══════════════════════════════════════
- isMarkedRow(), countMarkedInPeriod(), countMarkedInGroup()
- getMarkedClientsCount()
- calcMonthlyStatus(), calcGroupStatusCounts()
- calcStatusCountsByMode(), calcOverallStatusCounts()

═══════════════════════════════════════
12-calc-totals.js
═══════════════════════════════════════
- calcPeriodTotals(), calcEditPeriodMyOnly()
- calcGrandTotalsByMode()

═══════════════════════════════════════
13-calc-monthly.js
═══════════════════════════════════════
- calcMonthlyTotals() - proportional by day overlap

═══════════════════════════════════════
20-actions-groups.js
═══════════════════════════════════════
- addGroup(), renameGroup(), deleteGroup()
  → addGroup() calls cleanupDefaultGroup()
- toggleArchiveGroup(), switchGroup()
- findGroupByName(), cloneAndReIdGroup()
- mergeAppState(), isSameMergeRow(), normalizeMergeText()
  → mergeAppState() calls cleanupDefaultGroup()

═══════════════════════════════════════
21-actions-periods.js
═══════════════════════════════════════
- periodsStrictlyOverlap(), hasOverlappingPeriodInActiveGroup()
- isPeriodReversed(), validatePeriodWarnings()

═══════════════════════════════════════
22-actions-rows.js
═══════════════════════════════════════
- addClientToLastPeriod() - structural (uses render)

═══════════════════════════════════════
23-actions-status.js
═══════════════════════════════════════
- (reserved for future status-related business logic)

═══════════════════════════════════════
07-modals.js
═══════════════════════════════════════
- askConfirm(), askText()
- Pin lock: initPinLockAsync(), isDeviceVerified()
- setDeviceVerified(), tryUnlockApp()
- openPinLockModal(), closePinLockModal()
- setAppInteractionLocked(), showPinLockError()
- Top menu: initTopMenu(), openTopMenu(), closeTopMenu(), toggleTopMenu()
- Group picker: openGroupPickerModal(), closeGroupPickerModal()
- Status list: openStatusListModal(), closeStatusListModal()
- getClientsByStatus(), goToClientFromStatusList()
- Backup reminder: showBackupReminderPopup()
- initStatusBadgeActions()

═══════════════════════════════════════
14-search.js (renamed from 10-search.js)
═══════════════════════════════════════
- buildReviewSearchIndex(), refreshSearchIndex()
- goToClientFromSearch() - structural navigation (uses render)
- initReviewSearch(), renderSearchResults()
- bindSearchResultClicks(), highlightMatch()
- clearSearch()

═══════════════════════════════════════
16-import-export.js (renamed from 11-import-export.js)
═══════════════════════════════════════
- handleExportJson(), handleImportJsonChange()
  → JSON replace imports call cleanupDefaultGroup()
- handleExportExcel(), handleImportExcelChange()
  → Excel replace imports call cleanupDefaultGroup()
- handleExportPdf(), exportPdfAllGroups()
- downloadJson(), nowStamp()
- ⚠️ Storage indicator REMOVED (IndexedDB doesn't need it)

═══════════════════════════════════════
15-theme.js
═══════════════════════════════════════
THEME:
- initThemeAsync(), setTheme(), toggleTheme()

COLLAPSE:
- initControlsToggleAsync(), setControlsCollapsed()
- initSummaryPanel(), setSummaryCollapsed()

WORKSPACE & MODE:
- setWorkspaceMode(), updateWorkspaceSwitchUI()
- setMode() - async, uses refreshFullUiState()
- shiftMonthCursor() - async, uses renderMonthlySection()
- updateGrandToggleUI(), setControlsForMode()
- initWorkspaceSwitch()

═══════════════════════════════════════
30-render-overview.js
═══════════════════════════════════════
- renderOverviewDateRange(), renderOverviewSection()
  → Working period + Clients + duration only
  → overview duration format: "X Clients", "Y Mo Z D"

═══════════════════════════════════════
31-render-periods.js
═══════════════════════════════════════
- render() - FULL EDIT VIEW RENDER (structural changes)

═══════════════════════════════════════
32-render-review.js
═══════════════════════════════════════
- renderReview() - FULL REVIEW VIEW RENDER
- renderReview() - FULL REVIEW VIEW RENDER
  → Review group cards are collapsible
  → Default state = collapsed
  → Expanded state shows KPI cards + period cards

═══════════════════════════════════════
33-render-monthly.js
═══════════════════════════════════════
- renderMonthlyStats(), renderMonthlySection()
  → month Gross / Net / My stay monthly
  → Done / Fail / Fixed use FULL status counts:
    Current = current group full stats
    All = all groups full stats

═══════════════════════════════════════
34-render-shared.js
═══════════════════════════════════════
SHARED UI (no full render):
- renderGrandTotals()
- renderEditPeriodTotals(periodId)
- updateControlsButtonLabel(), renderGroupSelect()
- updateFloatingAddClientVisibility()
- openGroupPickerModal(), closeGroupPickerModal()
- updateGrandToggleUI()

═══════════════════════════════════════
35-ui-sync.js
═══════════════════════════════════════
CENTRAL UI SYNC:
- refreshUiChrome()
  - setControlsForMode()
  - updateGrandToggleUI()
  - updateWorkspaceSwitchUI()
  - renderGroupSelect()
  - updateControlsButtonLabel()
  - updateFloatingAddClientVisibility()
  - html.is-edit class sync
- refreshFullUiState()
  - refreshUiChrome()
  - updateAfterGlobalChange()

═══════════════════════════════════════
40-update-flow.js
═══════════════════════════════════════
GRANULAR UPDATE ORCHESTRATORS:
- updateAfterRowChange(periodId)
- updateAfterPeriodMetaChange(periodId)
- updateAfterStatusChange(periodId)
- updateAfterGlobalChange()
- recalcAndRenderTotals() - fallback

═══════════════════════════════════════
50-bind-events.js
═══════════════════════════════════════
GLOBAL EVENT LISTENERS:
- Mode buttons (edit/review)
- Grand total toggle (active/all)
- Group picker modal
- Group management (add/rename/delete)
- Archive group button
- Default rate input
- Add period / reset group buttons
- Scroll to top, floating add client
- Review group collapse toggle
- Status list modal close
- Keyboard detection, back button (popstate)

═══════════════════════════════════════
60-app-init.js
═══════════════════════════════════════
APP INITIALIZATION:
- initApp() - async startup sequence:
  1. openDb()
  2. migrateFromLocalStorage()
  3. loadState()
  4. initThemeAsync()
  5. initControlsToggleAsync()
  6. initWorkspaceSwitch()
  7. initSummaryPanel()
  8. initTopMenu()
  9. initPinLockAsync()
  10. initStatusBadgeActions()
  11. setMode()
- Splash screen removal
- Service Worker (PWA)
  → manual update flow
  → Export All + Update popup
  → skipWaiting only after user action
  → reload only after accepted update
- beforeinstallprompt / appinstalled

═══════════════════════════════════════
99-debug.js
═══════════════════════════════════════
- runAppDebugChecks() - full state validation
- runQuickDebug() - quick summary
- debugCheckStorage() - check localStorage vs IndexedDB
- debugClearLegacyStorage() - clear old localStorage keys
- debugText(), debugNorm(), debugRowKey()
- addDebugIssue(), finishDebugReport()

═══════════════════════════════════════
ARCHITECTURE RULES:
═══════════════════════════════════════

STRUCTURAL CHANGE → render() (31-render-periods.js):
- add/remove row
- add/remove period
- switch group / workspace
- reset group
- import/replace data
- mode switch (edit/review)

DATA CHANGE → granular update (40-update-flow.js):
- gross/net input → updateAfterRowChange()
- status change → updateAfterStatusChange()
- from/to date → updateAfterPeriodMetaChange()
- default rate → updateAfterGlobalChange()
- grand mode toggle → updateAfterGlobalChange()
- month cursor shift → renderMonthlySection()

UI CHROME SYNC → refreshUiChrome() / refreshFullUiState() (35-ui-sync.js):
- workspace badges
- controls button label
- group selector
- grand toggle UI
- fab visibility
- html.is-edit class

STORAGE:
- All data stored in IndexedDB (client_totals_db)
- localStorage used ONLY for one-time migration
- After migration, localStorage is cleared automatically

═══════════════════════════════════════
STATUS: ✅ PRODUCTION READY (REFACTORED)
═══════════════════════════════════════