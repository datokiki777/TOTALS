// 50-bind-events.js
// Global event binding (separated from render and init)

/* =========================
   Mode Buttons
========================= */

modeEditBtn?.addEventListener("click", async () => {
  await setMode("edit");
});

modeReviewBtn?.addEventListener("click", async () => {
  await setMode("review");
});

/* =========================
   Grand Total Toggle
========================= */

totalsActiveBtn?.addEventListener("click", async () => {
  if (appState.grandMode === "active") return;

  appState.grandMode = "active";
  appState.lastReviewGrandMode = "active";
  await saveState();

  updateGrandToggleUI();

  const current = await getCurrentMonthKey("active");
  await setSavedMonthCursor(current);

  await updateAfterGlobalChange();

  if (appState.uiMode === "edit") {
    render();
  }
});

totalsAllBtn?.addEventListener("click", async () => {
  if (appState.grandMode === "all") return;

  appState.grandMode = "all";
  appState.lastReviewGrandMode = "all";
  await saveState();

  updateGrandToggleUI();

  const current = await getCurrentMonthKey("all");
  await setSavedMonthCursor(current);

  await updateAfterGlobalChange();

  if (appState.uiMode === "edit") {
    render();
  }
});

/* =========================
   Group Picker Modal
========================= */

groupPickerBtn?.addEventListener("click", () => {
  openGroupPickerModal();
});

groupPickerClose?.addEventListener("click", closeGroupPickerModal);

groupPickerModal?.addEventListener("click", (e) => {
  if (e.target === groupPickerModal) {
    closeGroupPickerModal();
  }
});

/* =========================
   Group Management
========================= */

addGroupBtn?.addEventListener("click", addGroup);
renameGroupBtn?.addEventListener("click", renameGroup);
deleteGroupBtn?.addEventListener("click", deleteGroup);

/* =========================
   Archive Group Button
========================= */

const archiveGroupBtn = document.getElementById("archiveGroupBtn");
archiveGroupBtn?.addEventListener("click", async () => {
  const g = appState.groups.find(x => x.id === appState.activeGroupId) || activeGroup();
  if (!g) return;
  const label = g.archived ? "Unarchive" : "Archive";
  askConfirm(
    `${label} group "${g.name}"?`,
    `${label} Group`,
    { type: "primary", okText: label }
  ).then(async (ok) => {
    if (!ok) return;
    await toggleArchiveGroup(g.id);
    if (typeof triggerImmediateCloudSync === "function") {
      triggerImmediateCloudSync("archive-toggle");
    }
    if (typeof triggerImmediateCloudSync === "function") {
      triggerImmediateCloudSync("archive-toggle");
    }
    render();
    if (appState.uiMode === "review") renderReview();
  });
});

/* =========================
   Default Rate Input
========================= */

defaultRateInput?.addEventListener("input", async () => {
  const g = activeGroup();
  g.data.defaultRatePercent = clampRate(defaultRateInput.value);
  await saveState();
  if (typeof scheduleCloudAutoSync === "function") {
    scheduleCloudAutoSync("default-rate");
  }
  if (typeof scheduleCloudAutoSync === "function") {
    scheduleCloudAutoSync("default-rate");
  }
  await updateAfterGlobalChange();
  if (appState.uiMode === "review") renderReview();
});

/* =========================
   Add Period Button
========================= */

addPeriodBtn?.addEventListener("click", async () => {
  const g = activeGroup();
  const st = g.data;

  for (const periodItem of st.periods) {
    await setPeriodCollapsed(periodItem.id, true);
  }

  const newPeriod = {
    id: uuid(),
    from: "",
    to: "",
    rows: [emptyRow()],
  };

  st.periods.push(newPeriod);
  await setPeriodCollapsed(newPeriod.id, false);

  await saveState();
  if (typeof triggerImmediateCloudSync === "function") {
    triggerImmediateCloudSync("add-period");
  }
  render();
  if (typeof triggerImmediateCloudSync === "function") {
    triggerImmediateCloudSync("add-period");
  }
  if (appState.uiMode === "review") renderReview();

  setTimeout(() => {
    const newPeriodEl = document.querySelector(`.period[data-period-id="${newPeriod.id}"]`);
    if (!newPeriodEl) return;

    newPeriodEl.classList.remove("is-collapsed");

    newPeriodEl.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    const fromInput = newPeriodEl.querySelector(".fromDate");
    if (fromInput) {
      fromInput.focus();
    }

    updateFloatingAddClientVisibility();
  }, 80);
});

/* =========================
   Reset Group Button
========================= */

resetBtn?.addEventListener("click", async () => {
  const g = activeGroup();
  const ok = await askConfirm(
    `Reset group "${g.name}"? This will clear all its data.`,
    "Reset group",
    { type: "danger", okText: "Reset" }
  );
  if (!ok) return;

  g.data = defaultGroupData();
  await saveState();
  if (typeof triggerImmediateCloudSync === "function") {
    triggerImmediateCloudSync("reset-group");
  }
  render();
  if (typeof triggerImmediateCloudSync === "function") {
    triggerImmediateCloudSync("reset-group");
  }
  if (appState.uiMode === "review") renderReview();
});

/* =========================
   Scroll to Top
========================= */

function toggleToTop() {
  if (!toTopBtn) return;
  if (window.scrollY > 450) toTopBtn.classList.add("show");
  else toTopBtn.classList.remove("show");
}

window.addEventListener("scroll", toggleToTop);
toggleToTop();

toTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* =========================
   Floating Add Client
========================= */

fabAddClient?.addEventListener("click", () => {
  if (appState.uiMode !== "edit") return;
  addClientToLastPeriod();
});

/* =========================
   Review Group Collapse Toggle
========================= */

reviewView?.addEventListener("click", async (e) => {
  const toggleBtn = e.target.closest("[data-review-group-toggle]");
  if (!toggleBtn) return;

  const groupId = toggleBtn.getAttribute("data-review-group-toggle");
  if (!groupId) return;

  await toggleReviewGroupCollapsed(groupId);
  renderReview();
});

/* =========================
   Status List Modal Close
========================= */

statusListClose?.addEventListener("click", closeStatusListModal);

statusListModal?.addEventListener("click", (e) => {
  if (e.target === statusListModal) {
    closeStatusListModal();
  }
});

/* =========================
   Keyboard Detection for Mobile
========================= */

(function initKeyboardDetect() {
  let baseH = window.innerHeight;

  window.addEventListener("resize", () => {
    const h = window.innerHeight;
    const opened = h < baseH - 120;

    rootEl.classList.toggle("keyboard-open", opened);

    if (!opened && Math.abs(h - baseH) > 100) {
      baseH = h;
    }
  });
})();

/* =========================
   Android / Browser Back Button
========================= */

window.addEventListener("popstate", () => {
  // confirmBackdrop
  if (confirmBackdrop && confirmBackdrop.style.display === "flex") {
    window.__closeConfirmModal?.();
    return;
  }

  // groupPickerModal
  if (groupPickerModal && groupPickerModal.style.display === "flex") {
    closeGroupPickerModal();
    return;
  }

  // textPromptModal
  if (textPromptModal && textPromptModal.style.display === "flex") {
    window.__closeTextPromptModal?.();
    return;
  }

  // statusListModal
  if (statusListModal && statusListModal.style.display === "flex") {
    closeStatusListModal();
    return;
  }

  // dataBackupModal
  if (dataBackupModal && dataBackupModal.style.display === "flex") {
    dataBackupModal.style.display = "none";
    return;
  }  
});

/* =========================
   Data & Backup Modal
========================= */

dataBackupBtn?.addEventListener("click", async () => {
  // close top menu first
  if (typeof closeTopMenu === "function") {
    closeTopMenu();
  } else {
    topMenuBackdrop.style.display = "none";
  }

  await updateDataBackupInfo();
  dataBackupModal.style.display = "flex";
});

dataBackupClose?.addEventListener("click", () => {
  dataBackupModal.style.display = "none";
});

dataBackupModal?.addEventListener("click", (e) => {
  if (e.target === dataBackupModal) {
    dataBackupModal.style.display = "none";
  }
});

createBackupBtn?.addEventListener("click", async () => {
  dataBackupModal.style.display = "none";
  await handleExportJson();
});

restoreBackupBtn?.addEventListener("click", () => {
  dataBackupModal.style.display = "none";
  menuImportJsonInput?.click();
});

cloudSaveBtn?.addEventListener("click", async () => {
  if (typeof handleCloudSave !== "function") {
    await askConfirm(
      "Cloud Save is not connected yet.",
      "Cloud Sync",
      { singleButton: true, okText: "OK" }
    );
    return;
  }

  await handleCloudSave();
});

cloudLoadBtn?.addEventListener("click", async () => {
  if (typeof handleCloudLoad !== "function") {
    await askConfirm(
      "Cloud Load is not connected yet.",
      "Cloud Sync",
      { singleButton: true, okText: "OK" }
    );
    return;
  }

  await handleCloudLoad();
});