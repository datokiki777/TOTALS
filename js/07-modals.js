// 07-modals.js
// Modal, popup, top menu and pin lock functions
// UPDATED: IndexedDB support for PIN and backup reminder

/* =========================
   Pin Lock Functions (Async)
========================= */

function setAppInteractionLocked(locked) {
  const blocks = [
    document.querySelector(".topbar"),
    document.querySelector(".container"),
    document.getElementById("fabAddClient"),
    document.getElementById("toTopBtn")
  ];

  blocks.forEach((el) => {
    if (!el) return;
    el.style.pointerEvents = locked ? "none" : "";
    el.style.userSelect = locked ? "none" : "";
  });

  document.documentElement.classList.toggle("pin-locked", !!locked);
}

function showPinLockError(show) {
  if (!pinLockError) return;
  pinLockError.style.display = show ? "block" : "none";
}

function openPinLockModal() {
  if (!pinLockModal) return;

  pinLockModal.style.display = "grid";
  showPinLockError(false);

  pinLockModal.onclick = (e) => {
    if (e.target === pinLockModal) {
      pinLockInput?.focus();
    }
  };

  if (pinLockInput) {
    pinLockInput.value = "";
    setTimeout(() => pinLockInput.focus(), 30);
  }

  bodyOverflowBeforePinLock = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  setAppInteractionLocked(true);
}

function closePinLockModal() {
  if (!pinLockModal) return;
  pinLockModal.style.display = "none";
  showPinLockError(false);
  document.body.style.overflow = bodyOverflowBeforePinLock || "";
  setAppInteractionLocked(false);
}

async function tryUnlockApp() {
  const value = (pinLockInput?.value || "").replace(/\D/g, "").slice(0, 6);

  if (pinLockInput) {
    pinLockInput.value = value;
  }

  if (value !== APP_PIN) {
    showPinLockError(true);
    pinLockInput?.focus();
    pinLockInput?.select();
    return;
  }

  isUnlocked = true;
  await setDeviceVerified(true);
  closePinLockModal();
}

async function initPinLockAsync() {
  if (pinLockInput) {
    pinLockInput.addEventListener("input", () => {
      pinLockInput.value = pinLockInput.value.replace(/\D/g, "").slice(0, 6);
      showPinLockError(false);
    });

    pinLockInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        tryUnlockApp();
      }
    });
  }

  pinUnlockBtn?.addEventListener("click", tryUnlockApp);

  const isVerified = await isDeviceVerified();
  if (isVerified) {
    isUnlocked = true;
    closePinLockModal();
  } else {
    isUnlocked = false;
    openPinLockModal();
  }
}

// Legacy sync wrapper for backward compatibility
function initPinLock() {
  console.warn("initPinLock() called synchronously - use initPinLockAsync() for IndexedDB");
  initPinLockAsync().catch(console.error);
}

/* =========================
   Confirm Modal Functions
========================= */

function hasCustomConfirm() {
  return !!(confirmBackdrop && confirmTitleEl && confirmTextEl && confirmNoBtn && confirmYesBtn);
}

function askConfirm(message, title = "Confirm", options = {}) {
  return new Promise((resolve) => {
    if (!hasCustomConfirm()) {
      resolve(window.confirm(message));
      return;
    }

    const okText = options.okText || "Yes";
    const cancelText = options.cancelText || "No";
    const singleButton = options.singleButton === true;

    confirmTitleEl.textContent = title;
    confirmTextEl.textContent = message;

    confirmYesBtn.textContent = okText;
    confirmNoBtn.textContent = cancelText;
    confirmYesBtn.classList.remove("btn-danger", "btn-primary");
    confirmNoBtn.classList.remove("btn-danger", "btn-primary");

    if (options.type === "danger") {
      confirmYesBtn.classList.add("btn-danger");
    } else if (options.type === "primary") {
      confirmYesBtn.classList.add("btn-primary");
    }

    confirmNoBtn.style.display = singleButton ? "none" : "";
    confirmBackdrop.style.display = "flex";
    history.pushState({ modal: "confirm" }, "");

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        cancelConfirm();
        return;
      }

      if (singleButton && (e.key === "Enter" || e.key === " ")) {
        cleanup();
        resolve(true);
      }
    };

    const cleanup = () => {
      confirmBackdrop.style.display = "none";
      confirmNoBtn.style.display = "";
      confirmNoBtn.onclick = null;
      confirmYesBtn.onclick = null;
      confirmBackdrop.onclick = null;
      document.removeEventListener("keydown", onKeyDown);
      window.__closeConfirmModal = null;
    };

    const cancelConfirm = () => {
      cleanup();
      resolve(false);
    };

    window.__closeConfirmModal = cancelConfirm;

    confirmNoBtn.onclick = cancelConfirm;

    confirmYesBtn.onclick = () => {
      cleanup();
      resolve(true);
    };

    confirmBackdrop.onclick = (e) => {
      if (e.target === confirmBackdrop) {
        cancelConfirm();
      }
    };

    document.addEventListener("keydown", onKeyDown);
  });
}

function askText(title, message, defaultValue = "", okLabel = "Save") {
  return new Promise((resolve) => {
    if (
      !textPromptModal ||
      !textPromptTitle ||
      !textPromptText ||
      !textPromptInput ||
      !textPromptCancel ||
      !textPromptOk
    ) {
      resolve(window.prompt(message, defaultValue) || "");
      return;
    }

    textPromptTitle.textContent = title;
    textPromptText.textContent = message;
    textPromptInput.value = defaultValue || "";
    textPromptOk.textContent = okLabel;

    textPromptModal.style.display = "flex";
    history.pushState({ modal: "textPrompt" }, "");

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        cancel();
        return;
      }

      if (e.key === "Enter") {
        submit();
      }
    };

    const cleanup = () => {
      textPromptModal.style.display = "none";
      textPromptCancel.onclick = null;
      textPromptOk.onclick = null;
      textPromptModal.onclick = null;
      document.removeEventListener("keydown", onKeyDown);
      window.__closeTextPromptModal = null;
    };

    const submit = () => {
      const value = textPromptInput.value.trim();
      cleanup();
      resolve(value);
    };

    const cancel = () => {
      cleanup();
      resolve("");
    };

    window.__closeTextPromptModal = cancel;

    textPromptCancel.onclick = cancel;
    textPromptOk.onclick = submit;

    textPromptModal.onclick = (e) => {
      if (e.target === textPromptModal) cancel();
    };

    document.addEventListener("keydown", onKeyDown);

    setTimeout(() => {
      textPromptInput.focus();
      textPromptInput.select();
    }, 30);
  });
}

/* =========================
   Status List Modal Functions
========================= */

function getClientsByStatus(status) {
  const list = [];
  const groups = getGroupsByMode();

  groups.forEach((group) => {
    (group.data?.periods || []).forEach((period) => {
      (period.rows || []).forEach((row) => {
        if (row.done === status) {
          list.push({
            groupId: group.id,
            groupName: group.name,
            groupArchived: group.archived === true,
            periodId: period.id,
            periodFrom: period.from,
            periodTo: period.to,
            rowId: row.id,
            customer: row.customer || "Client",
            city: row.city || ""
          });
        }
      });
    });
  });

  return list;
}

function closeStatusListModal() {
  if (!statusListModal) return;
  statusListModal.style.display = "none";
  if (statusListBody) statusListBody.innerHTML = "";
}

function openStatusListModal(status, clients) {
  if (!statusListModal || !statusListTitle || !statusListBody) return;

  const statusLabel =
    status === "done" ? "Done" :
    status === "fail" ? "Fail" :
    status === "fixed" ? "Fixed" :
    "Status";
  const statusColor =
    status === "done" ? "status-badge-done" :
    status === "fail" ? "status-badge-fail" :
    status === "fixed" ? "status-badge-fixed" :
    "";

  statusListTitle.innerHTML = `
  <span class="status-badge ${statusColor}">
    ${statusLabel}
  </span>
`;

  if (!clients.length) {
    statusListBody.innerHTML = `<div class="status-list-empty">No clients found with this status.</div>`;
    statusListModal.style.display = "flex";
    history.pushState({ modal: "statusList" }, "");
    return;
  }
  
  async function goToClientFromStatusList(item) {
    if (!item) return;

    appState.activeGroupId = item.groupId;
    await saveState();

    await setPeriodCollapsed(item.periodId, false);
    await setMode("edit");
    render();

    requestAnimationFrame(() => {
      const periodEl = document.querySelector(`.period[data-period-id="${item.periodId}"]`);
      const rowEl = document.querySelector(`tr[data-row-id="${item.rowId}"]`);

      if (periodEl) {
        periodEl.classList.remove("is-collapsed");
      }

      if (rowEl) {
        rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
        rowEl.classList.add("row-highlight");

        setTimeout(() => {
          rowEl.classList.remove("row-highlight");
        }, 1800);
      }
    });
  }

  function bindStatusListItemClicks(clients) {
    const items = document.querySelectorAll(".status-list-item");

    items.forEach((el, index) => {
      const item = clients[index];
      if (!item) return;

      el.onclick = async () => {
        closeStatusListModal();

        const ok = await askConfirm(
          "Do you really want to go to Edit?",
          "Edit",
          { type: "primary", okText: "Open" }
        );

        if (!ok) return;

        await goToClientFromStatusList(item);
      };
    });
  }

  statusListBody.innerHTML = clients.map((item) => `
    <div class="status-list-item">
      <div class="status-list-name">${item.groupArchived ? '📦 ' : ''}${escapeHtml(item.customer)}</div>
      <div class="status-list-meta">
        <span><b>City:</b> ${escapeHtml(item.city || "—")}</span>
        <span><b>Period:</b> ${escapeHtml(formatDateLocal(item.periodFrom))} → ${escapeHtml(formatDateLocal(item.periodTo))}</span>
        <span><b>Group:</b> ${item.groupArchived ? '📦 ' : ''}${escapeHtml(item.groupName)}</span>
      </div>
    </div>
  `).join("");

  statusListModal.style.display = "flex";
  history.pushState({ modal: "statusList" }, "");
  bindStatusListItemClicks(clients);
}

/* =========================
   Top Menu Functions
========================= */

function openTopMenu() {
  if (!topMenuBackdrop) return;
  topMenuBackdrop.style.display = "block";
}

function closeTopMenu() {
  if (!topMenuBackdrop) return;
  topMenuBackdrop.style.display = "none";
}

function toggleTopMenu() {
  if (!topMenuBackdrop) return;
  const isOpen = topMenuBackdrop.style.display === "block";
  if (isOpen) {
    closeTopMenu();
  } else {
    openTopMenu();
  }
}

function initTopMenu() {
  topMenuBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleTopMenu();
    // Storage indicator removed - no longer needed for IndexedDB
  });

  topMenuBackdrop?.addEventListener("click", (e) => {
    if (e.target === topMenuBackdrop) {
      closeTopMenu();
    }
  });

  topMenuPanel?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeTopMenu();
    }
  });

  menuExportJsonBtn?.addEventListener("click", () => {
    closeTopMenu();
    handleExportJson();
  });

  menuPdfBtn?.addEventListener("click", () => {
    closeTopMenu();
    handleExportPdf();
  });

  menuImportJsonInput?.addEventListener("change", async (e) => {
    closeTopMenu();
    await handleImportJsonChange(e);
    menuImportJsonInput.value = "";
  });

  menuExportExcelBtn?.addEventListener("click", () => {
    closeTopMenu();
    handleExportExcel();
  });

  menuImportExcelInput?.addEventListener("change", async (e) => {
    closeTopMenu();
    await handleImportExcelChange(e);
    menuImportExcelInput.value = "";
  });
  
  // Storage indicator removed
}

/* =========================
   Group Picker Modal Functions
========================= */

function closeGroupPickerModal() {
  if (!groupPickerModal) return;
  groupPickerModal.style.display = "none";
  if (groupPickerList) groupPickerList.innerHTML = "";
}

function openGroupPickerModal() {
  if (!groupPickerModal || !groupPickerList) return;

  const workspaceGroups = appState.groups.filter((g) =>
    appState.workspaceMode === "archive"
      ? g.archived === true
      : g.archived !== true
  );

  if (!workspaceGroups.length) {
    groupPickerList.innerHTML = `<div class="group-picker-empty">${
      appState.workspaceMode === "archive"
        ? "No archived groups found."
        : "No active groups found."
    }</div>`;
    groupPickerModal.style.display = "flex";
    history.pushState({ modal: "groupPicker" }, "");
    return;
  }

  groupPickerList.innerHTML = workspaceGroups.map((g) => {
    const isActive = g.id === appState.activeGroupId;
    const archivedClass = g.archived ? "archived" : "";
    const activeClass = isActive ? "active" : "";

    return `
      <button
        type="button"
        class="group-picker-item ${activeClass} ${archivedClass}"
        data-group-id="${g.id}"
      >
        <span class="group-picker-main">
          <span class="group-picker-name">${g.archived ? "📦 " : ""}${escapeHtml(g.name)}</span>
        </span>
        <span class="group-picker-badge ${g.archived ? "archived-badge" : "active-badge"}">
          ${isActive ? "Selected" : (g.archived ? "Archived" : "Active")}
        </span>
      </button>
    `;
  }).join("");

  groupPickerModal.style.display = "flex";
  history.pushState({ modal: "groupPicker" }, "");

  groupPickerList.querySelectorAll(".group-picker-item").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.groupId;
      if (!id) return;

      appState.activeGroupId = id;

      const selectedGroup = appState.groups.find((g) => g.id === id);
      if (selectedGroup?.archived) {
        appState.lastActiveGroupIdArchive = id;
      } else {
        appState.lastActiveGroupIdActive = id;
      }

      await saveState();
      closeGroupPickerModal();
      render();

      if (appState.uiMode === "review") renderReview();
    };
  });
}

/* =========================
   Backup Reminder Popup (Async)
========================= */

async function showBackupReminderPopup() {
  askConfirm(
    "You made changes this week. Don't forget to create a backup.",
    "Backup Reminder",
    {
      singleButton: true,
      okText: "OK"
    }
  ).then(async () => {
    try {
      await dbSet(DB_KEY_BACKUP_REMINDER_LAST_SHOWN, getWeekKeyForReminder(new Date()));
    } catch (error) {
      console.error("Failed to save backup reminder last shown:", error);
    }
  });
}

/* =========================
   Status Badge Actions
========================= */

function initStatusBadgeActions() {
  const doneEl = document.getElementById("monthDone");
  const failEl = document.getElementById("monthFail");
  const fixedEl = document.getElementById("monthFixed");

  [doneEl, failEl, fixedEl].forEach((el) => {
    if (!el) return;

    el.style.cursor = "pointer";

    el.onclick = () => {
      const status = el.dataset.status;
      if (!status) return;

      const clients = getClientsByStatus(status);
      openStatusListModal(status, clients);
    };
  });
}