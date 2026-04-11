// 99-debug.js
// Pro Debug / Validation System

/* =========================
   Debug Helpers
========================= */

function debugText(v) {
  return String(v ?? "").trim();
}

function debugNorm(v) {
  return debugText(v).toLowerCase();
}

function debugRowKey(row) {
  return [
    debugNorm(row?.customer),
    debugNorm(row?.city),
    parseMoney(row?.gross),
    parseMoney(row?.net),
    debugNorm(row?.done || "none")
  ].join("|");
}

function addDebugIssue(list, type, message, meta = {}) {
  list.push({
    type,
    message,
    ...meta
  });
}

/* =========================
   Storage Check Function
========================= */

function debugCheckStorage() {
  console.group("🔍 STORAGE CHECK");

  // Check IndexedDB
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onerror = () => {
    console.error("❌ Failed to open IndexedDB");
  };
  request.onsuccess = () => {
    const db = request.result;
    const tx = db.transaction([DB_STORE_MAIN], "readonly");
    const store = tx.objectStore(DB_STORE_MAIN);
    const getAllKeys = store.getAllKeys();
    getAllKeys.onsuccess = () => {
      const keys = getAllKeys.result;
      console.log(`📦 IndexedDB (${DB_NAME}) contains ${keys.length} keys:`);
      keys.forEach(k => console.log(`   - ${k}`));
    };
    getAllKeys.onerror = () => {
      console.error("Failed to read IndexedDB keys");
    };
    db.close();
  };

  console.groupEnd();
}

function runAppDebugChecks() {
  const issues = [];

  if (typeof appState === "undefined" || !appState) {
    addDebugIssue(issues, "error", "appState was not found");
    return finishDebugReport(issues);
  }

  if (!Array.isArray(appState.groups)) {
    addDebugIssue(issues, "error", "appState.groups is not an array");
    return finishDebugReport(issues);
  }

  // -------------------------
  // Top-level appState checks
  // -------------------------
  const validWorkspaceModes = ["active", "archive"];
  const validGrandModes = ["active", "all", "archived"];
  const validUiModes = ["edit", "review"];

  if (!validWorkspaceModes.includes(appState.workspaceMode)) {
    addDebugIssue(issues, "error", `Invalid workspaceMode: ${appState.workspaceMode}`);
  }

  if (!validGrandModes.includes(appState.grandMode)) {
    addDebugIssue(issues, "error", `Invalid grandMode: ${appState.grandMode}`);
  }

  if (!validUiModes.includes(appState.uiMode)) {
    addDebugIssue(issues, "error", `Invalid uiMode: ${appState.uiMode}`);
  }

  if (!appState.activeGroupId) {
    addDebugIssue(issues, "warning", "activeGroupId is empty");
  }

  const activeGroupExists = appState.groups.some(g => g?.id === appState.activeGroupId);
  if (appState.activeGroupId && !activeGroupExists) {
    addDebugIssue(issues, "error", `activeGroupId does not exist: ${appState.activeGroupId}`);
  }

  // -------------------------
  // Group checks
  // -------------------------
  const groupIdSet = new Set();
  const groupNameArchiveSet = new Set();

  appState.groups.forEach((group, gi) => {
    const groupLabel = `Group #${gi + 1}${group?.name ? ` ("${group.name}")` : ""}`;

    if (!group?.id) {
      addDebugIssue(issues, "error", `${groupLabel}: missing group id`, {
        groupIndex: gi
      });
    } else if (groupIdSet.has(group.id)) {
      addDebugIssue(issues, "error", `${groupLabel}: duplicate group id "${group.id}"`, {
        groupIndex: gi,
        groupId: group.id
      });
    } else {
      groupIdSet.add(group.id);
    }

    if (!debugText(group?.name)) {
      addDebugIssue(issues, "warning", `${groupLabel}: empty group name`, {
        groupIndex: gi,
        groupId: group?.id || ""
      });
    }

    const groupNameArchiveKey = `${debugNorm(group?.name)}|${group?.archived === true ? "1" : "0"}`;
    if (groupNameArchiveSet.has(groupNameArchiveKey)) {
      addDebugIssue(
        issues,
        "warning",
        `${groupLabel}: duplicate group name in same archive state`,
        {
          groupIndex: gi,
          groupId: group?.id || ""
        }
      );
    } else {
      groupNameArchiveSet.add(groupNameArchiveKey);
    }

    if (!group?.data || typeof group.data !== "object") {
      addDebugIssue(issues, "error", `${groupLabel}: missing data object`, {
        groupIndex: gi,
        groupId: group?.id || ""
      });
      return;
    }

    const rate = Number(group.data.defaultRatePercent);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      addDebugIssue(
        issues,
        "error",
        `${groupLabel}: invalid defaultRatePercent "${group.data.defaultRatePercent}"`,
        {
          groupIndex: gi,
          groupId: group?.id || ""
        }
      );
    }

    if (!Array.isArray(group.data.periods)) {
      addDebugIssue(issues, "error", `${groupLabel}: periods is not an array`, {
        groupIndex: gi,
        groupId: group?.id || ""
      });
      return;
    }

    // -------------------------
    // Period checks
    // -------------------------
    const periodIdSet = new Set();
    const periodRangeSet = new Set();

    group.data.periods.forEach((period, pi) => {
      const periodLabel = `${groupLabel} / Period #${pi + 1}`;

      if (!period?.id) {
        addDebugIssue(issues, "error", `${periodLabel}: missing period id`, {
          groupIndex: gi,
          periodIndex: pi,
          groupId: group?.id || ""
        });
      } else if (periodIdSet.has(period.id)) {
        addDebugIssue(issues, "error", `${periodLabel}: duplicate period id "${period.id}"`, {
          groupIndex: gi,
          periodIndex: pi,
          groupId: group?.id || "",
          periodId: period.id
        });
      } else {
        periodIdSet.add(period.id);
      }

      const fromRaw = debugText(period?.from);
      const toRaw = debugText(period?.to);

      if (!fromRaw || !toRaw) {
        addDebugIssue(issues, "warning", `${periodLabel}: empty from/to date`, {
          groupIndex: gi,
          periodIndex: pi,
          groupId: group?.id || "",
          periodId: period?.id || ""
        });
      }

      const fromDate = parseDateOnly(fromRaw);
      const toDate = parseDateOnly(toRaw);

      if (fromRaw && !fromDate) {
        addDebugIssue(issues, "error", `${periodLabel}: invalid FROM date "${fromRaw}"`, {
          groupIndex: gi,
          periodIndex: pi,
          groupId: group?.id || "",
          periodId: period?.id || ""
        });
      }

      if (toRaw && !toDate) {
        addDebugIssue(issues, "error", `${periodLabel}: invalid TO date "${toRaw}"`, {
          groupIndex: gi,
          periodIndex: pi,
          groupId: group?.id || "",
          periodId: period?.id || ""
        });
      }

      if (fromDate && toDate && fromDate > toDate) {
        addDebugIssue(issues, "error", `${periodLabel}: FROM date is after TO date`, {
          groupIndex: gi,
          periodIndex: pi,
          groupId: group?.id || "",
          periodId: period?.id || ""
        });
      }

      const periodRangeKey = `${fromRaw}|${toRaw}`;
      if (fromRaw && toRaw) {
        if (periodRangeSet.has(periodRangeKey)) {
          addDebugIssue(issues, "warning", `${periodLabel}: duplicate period range ${fromRaw} → ${toRaw}`, {
            groupIndex: gi,
            periodIndex: pi,
            groupId: group?.id || "",
            periodId: period?.id || ""
          });
        } else {
          periodRangeSet.add(periodRangeKey);
        }
      }

      if (!Array.isArray(period?.rows)) {
        addDebugIssue(issues, "error", `${periodLabel}: rows is not an array`, {
          groupIndex: gi,
          periodIndex: pi,
          groupId: group?.id || "",
          periodId: period?.id || ""
        });
        return;
      }

      if (period.rows.length === 0) {
        addDebugIssue(issues, "warning", `${periodLabel}: has zero rows`, {
          groupIndex: gi,
          periodIndex: pi,
          groupId: group?.id || "",
          periodId: period?.id || ""
        });
      }

      // Row checks
      const rowIdSet = new Set();
      const rowKeySet = new Set();

      period.rows.forEach((row, ri) => {
        const rowLabel = `${periodLabel} / Row #${ri + 1}`;

        if (!row?.id) {
          addDebugIssue(issues, "error", `${rowLabel}: missing row id`, {
            groupIndex: gi,
            periodIndex: pi,
            rowIndex: ri,
            groupId: group?.id || "",
            periodId: period?.id || ""
          });
        } else if (rowIdSet.has(row.id)) {
          addDebugIssue(issues, "error", `${rowLabel}: duplicate row id "${row.id}"`, {
            groupIndex: gi,
            periodIndex: pi,
            rowIndex: ri,
            groupId: group?.id || "",
            periodId: period?.id || "",
            rowId: row.id
          });
        } else {
          rowIdSet.add(row.id);
        }

        const validDone = ["none", "done", "fail", "fixed"];
        if (!validDone.includes(row?.done)) {
          addDebugIssue(issues, "warning", `${rowLabel}: invalid done status "${row?.done}"`, {
            groupIndex: gi,
            periodIndex: pi,
            rowIndex: ri,
            groupId: group?.id || "",
            periodId: period?.id || "",
            rowId: row?.id || ""
          });
        }

        const grossNum = parseMoney(row?.gross);
        const netNum = parseMoney(row?.net);

        if (String(row?.gross ?? "").trim() !== "" && !Number.isFinite(grossNum)) {
          addDebugIssue(issues, "warning", `${rowLabel}: gross could not be parsed`, {
            groupIndex: gi,
            periodIndex: pi,
            rowIndex: ri
          });
        }

        if (String(row?.net ?? "").trim() !== "" && !Number.isFinite(netNum)) {
          addDebugIssue(issues, "warning", `${rowLabel}: net could not be parsed`, {
            groupIndex: gi,
            periodIndex: pi,
            rowIndex: ri
          });
        }

        const rowKey = debugRowKey(row);
        if (rowKeySet.has(rowKey)) {
          addDebugIssue(issues, "warning", `${rowLabel}: duplicate logical row detected`, {
            groupIndex: gi,
            periodIndex: pi,
            rowIndex: ri,
            groupId: group?.id || "",
            periodId: period?.id || "",
            rowId: row?.id || ""
          });
        } else {
          rowKeySet.add(rowKey);
        }
      });
    });

    // Overlap checks inside same group
    for (let i = 0; i < group.data.periods.length; i++) {
      for (let j = i + 1; j < group.data.periods.length; j++) {
        const a = group.data.periods[i];
        const b = group.data.periods[j];

        if (periodsStrictlyOverlap(a?.from, a?.to, b?.from, b?.to)) {
          addDebugIssue(
            issues,
            "warning",
            `${groupLabel}: overlapping periods detected (${debugText(a?.from)} → ${debugText(a?.to)} overlaps ${debugText(b?.from)} → ${debugText(b?.to)})`,
            {
              groupIndex: gi,
              groupId: group?.id || "",
              periodA: a?.id || "",
              periodB: b?.id || ""
            }
          );
        }
      }
    }
  });

  return finishDebugReport(issues);
}

function finishDebugReport(issues) {
  const errors = issues.filter(x => x.type === "error");
  const warnings = issues.filter(x => x.type === "warning");

  console.group("🧪 PRO DEBUG REPORT");
  console.log(`Total issues: ${issues.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (!issues.length) {
    console.log("✅ No issues found");
    console.groupEnd();
    return {
      ok: true,
      total: 0,
      errors: 0,
      warnings: 0,
      issues: []
    };
  }

  if (errors.length) {
    console.group("❌ Errors");
    errors.forEach((item, idx) => {
      console.error(`${idx + 1}. ${item.message}`, item);
    });
    console.groupEnd();
  }

  if (warnings.length) {
    console.group("⚠️ Warnings");
    warnings.forEach((item, idx) => {
      console.warn(`${idx + 1}. ${item.message}`, item);
    });
    console.groupEnd();
  }

  console.groupEnd();

  return {
    ok: false,
    total: issues.length,
    errors: errors.length,
    warnings: warnings.length,
    issues
  };
}

function runQuickDebug() {
  const result = runAppDebugChecks();
  return `Debug result → total: ${result.total}, errors: ${result.errors}, warnings: ${result.warnings}`;
}
