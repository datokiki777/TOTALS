// 02-dom.js
// DOM element references

const rootEl = document.documentElement;

const modeEditBtn = document.getElementById("modeEditBtn");
const modeReviewBtn = document.getElementById("modeReviewBtn");
const workspaceActiveBtn = document.getElementById("workspaceActiveBtn");
const workspaceArchiveBtn = document.getElementById("workspaceArchiveBtn");
const editView = document.getElementById("editView");
const reviewView = document.getElementById("reviewView");
const globalSearchCard = document.getElementById("globalSearchCard");
const elPeriods = document.getElementById("periods");
const tplPeriod = document.getElementById("periodTpl");
const tplRow = document.getElementById("rowTpl");

const defaultRateInput = document.getElementById("defaultRate");
const addPeriodBtn = document.getElementById("addPeriodBtn");
const resetBtn = document.getElementById("resetBtn");

const grandGrossEl = document.getElementById("grandGross");
const grandNetEl = document.getElementById("grandNet");
const grandMyEl = document.getElementById("grandMy");

const summaryCollapseBtn = document.getElementById("summaryCollapseBtn");
const monthPrevBtn = document.getElementById("monthPrevBtn");
const monthNextBtn = document.getElementById("monthNextBtn");
const monthLabel = document.getElementById("monthLabel");
const monthGrossEl = document.getElementById("monthGross");
const monthNetEl = document.getElementById("monthNet");
const monthMyEl = document.getElementById("monthMy");
const overviewDateRangeEl = document.getElementById("overviewDateRange");
const overviewDurationEl = document.getElementById("overviewDuration");

const groupPickerBtn = document.getElementById("groupPickerBtn");
const groupPickerBtnText = document.getElementById("groupPickerBtnText");
const addGroupBtn = document.getElementById("addGroupBtn");
const renameGroupBtn = document.getElementById("renameGroupBtn");
const deleteGroupBtn = document.getElementById("deleteGroupBtn");

const groupPickerModal = document.getElementById("groupPickerModal");
const groupPickerList = document.getElementById("groupPickerList");
const groupPickerClose = document.getElementById("groupPickerClose");

const totalsActiveBtn = document.getElementById("totalsActiveBtn");
const totalsAllBtn = document.getElementById("totalsAllBtn");

const topMenuBtn = document.getElementById("topMenuBtn");
const topMenuBackdrop = document.getElementById("topMenuBackdrop");
const topMenuPanel = document.getElementById("topMenuPanel");

const menuExportJsonBtn = document.getElementById("menuExportJsonBtn");
const menuImportJsonInput = document.getElementById("menuImportJsonInput");
const menuPdfBtn = document.getElementById("menuPdfBtn");
const menuExportExcelBtn = document.getElementById("menuExportExcelBtn");
const menuImportExcelInput = document.getElementById("menuImportExcelInput");

const editActions = document.querySelector('.edit-actions');
const reviewActions = document.querySelector('.review-actions');
const toTopBtn = document.getElementById("toTopBtn");
const controlsToggle = document.getElementById("controlsToggle");
const fabAddClient = document.getElementById("fabAddClient");

const confirmBackdrop = document.getElementById("confirmModal");
const confirmTitleEl = document.getElementById("confirmTitle");
const confirmTextEl = document.getElementById("confirmText");
const confirmNoBtn = document.getElementById("confirmNo");
const confirmYesBtn = document.getElementById("confirmYes");

const statusListModal = document.getElementById("statusListModal");
const statusListTitle = document.getElementById("statusListTitle");
const statusListBody = document.getElementById("statusListBody");
const statusListClose = document.getElementById("statusListClose");

const themeSwitch = document.getElementById("themeSwitch");

const textPromptModal = document.getElementById("textPromptModal");
const textPromptTitle = document.getElementById("textPromptTitle");
const textPromptText = document.getElementById("textPromptText");
const textPromptInput = document.getElementById("textPromptInput");
const textPromptCancel = document.getElementById("textPromptCancel");
const textPromptOk = document.getElementById("textPromptOk");

const pinLockModal = document.getElementById("pinLockModal");
const pinLockInput = document.getElementById("pinLockInput");
const pinUnlockBtn = document.getElementById("pinUnlockBtn");
const pinLockError = document.getElementById("pinLockError");

const dataBackupBtn = document.getElementById("dataBackupBtn");
const dataBackupModal = document.getElementById("dataBackupModal");
const dataBackupClose = document.getElementById("dataBackupClose");

const dbStorageEl = document.getElementById("dbStorage");
const dbActiveEl = document.getElementById("dbActive");
const dbArchiveEl = document.getElementById("dbArchive");
const dbLastBackupEl = document.getElementById("dbLastBackup");
const dbCountEl = document.getElementById("dbCount");
const dbStatusEl = document.getElementById("dbStatus");

const dbCloudSyncStatusEl = document.getElementById("dbCloudSyncStatus");

const createBackupBtn = document.getElementById("createBackupBtn");
const restoreBackupBtn = document.getElementById("restoreBackupBtn");

const cloudSaveBtn = document.getElementById("cloudSaveBtn");
const cloudLoadBtn = document.getElementById("cloudLoadBtn");

let bodyOverflowBeforePinLock = "";