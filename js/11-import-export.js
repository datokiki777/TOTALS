// 11-import-export.js
// JSON, Excel and PDF export/import functions

/* =========================
   File Helpers
========================= */

function downloadJson(filename, dataObj) {
  const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/* =========================
   JSON Export
========================= */

async function handleExportJson() {
  const payload = {
    __type: "client_totals_all_groups",
    __ver: 1,
    exportedAt: new Date().toISOString(),
    data: appState,
  };

  downloadJson(`client-totals-ALL-groups_${nowStamp()}.json`, payload);

  try {
    localStorage.setItem(BACKUP_REMINDER_DIRTY_KEY, "0");
  } catch {}

  await askConfirm(
    "JSON exported successfully.",
    "Export JSON",
    { singleButton: true, okText: "OK" }
  );
}

/* =========================
   JSON Import
========================= */

async function handleImportJsonChange(e) {
  const file = e?.target?.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    let incoming = null;
    if (parsed?.__type === "client_totals_all_groups" && parsed?.data) {
      incoming = parsed.data;
    } else if (parsed?.groups && parsed?.activeGroupId) {
      incoming = parsed;
    }

    if (!incoming) {
      await askConfirm(
        "Import failed: wrong file format.",
        "Import JSON",
        { singleButton: true, okText: "OK" }
      );
      return;
    }

    const doMerge = await askConfirm(
      `Import JSON file:\n${file.name}\n\nDo you want to merge this file into your current data?`,
      "Import JSON",
      { type: "primary", okText: "Merge" }
    );

    if (doMerge) {
      mergeAppState(incoming);
      saveState();
      render();
      if (appState.uiMode === "review") renderReview();

      await askConfirm(
        "JSON file merged successfully.",
        "Import JSON",
        { singleButton: true, okText: "OK" }
      );
      return;
    }

    const doReplace = await askConfirm(
      `Merge was not selected.\n\nDo you want to replace all current data on this device with:\n${file.name}\n\nThis cannot be undone.`,
      "Import JSON",
      { type: "danger", okText: "Replace" }
    );

    if (!doReplace) return;

    appState = normalizeAppState(incoming);
    saveState();
    render();
    if (appState.uiMode === "review") renderReview();

    await askConfirm(
      "JSON file imported successfully.",
      "Import JSON",
      { singleButton: true, okText: "OK" }
    );
  } catch {
    await askConfirm(
      "Import failed: invalid JSON file.",
      "Import JSON",
      { singleButton: true, okText: "OK" }
    );
  }
}

/* =========================
   PDF Export (All Groups)
========================= */

function exportPdfAllGroups() {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    alert("PDF library not loaded. Check jsPDF script tag.");
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const margin = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  const lineH = 6;

  let y = margin;

  const addPageIfNeeded = (need = lineH) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const textLine = (txt, size = 11, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);

    const lines = doc.splitTextToSize(String(txt), maxW);
    lines.forEach((ln) => {
      addPageIfNeeded(lineH);
      doc.text(ln, margin, y);
      y += lineH;
    });
  };

  const hr = () => {
    addPageIfNeeded(4);
    doc.setDrawColor(180);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  const money = (n) => fmt(Number(n || 0));

  // PDF always exports ALL groups (including archived)
  const groupsForPdf = appState.groups;
  const overall = { gross: 0, net: 0, my: 0, groups: groupsForPdf.length };

  const groupsData = groupsForPdf.map((gr) => {
    const st = gr.data;

    const groupTotals = st.periods.reduce(
      (acc, p) => {
        const t = calcPeriodTotals(p, st.defaultRatePercent);
        acc.gross += t.gross;
        acc.net += t.net;
        acc.my += t.my;
        acc.periods += 1;
        acc.rows += p.rows.length;
        return acc;
      },
      { gross: 0, net: 0, my: 0, periods: 0, rows: 0 }
    );

    overall.gross += groupTotals.gross;
    overall.net += groupTotals.net;
    overall.my += groupTotals.my;

    return { gr, st, groupTotals };
  });

  textLine("Client Totals — PDF Report (ALL Groups)", 16, true);
  textLine(`Exported: ${new Date().toLocaleString()}`, 10, false);
  hr();

  textLine("OVERALL SUMMARY", 12, true);
  const overallStatus = calcOverallStatusCounts();
  textLine(`Groups: ${overall.groups}`, 11, false);
  textLine(
    `Gross: ${money(overall.gross)}   Net: ${money(overall.net)}   My €: ${money(overall.my)}`,
    11,
    true
  );
  addPageIfNeeded(lineH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  doc.setTextColor(30, 160, 80);
  doc.text(`Done: ${overallStatus.done}`, margin, y);

  doc.setTextColor(220, 60, 60);
  doc.text(`Fail: ${overallStatus.fail}`, margin + 40, y);

  doc.setTextColor(215, 170, 20);
  doc.text(`Fixed: ${overallStatus.fixed}`, margin + 70, y);

  doc.setTextColor(0, 0, 0);
  y += lineH;
  hr();

  groupsData.forEach(({ gr, st, groupTotals }, gi) => {
    const statusCounts = calcGroupStatusCounts(gr);
    const archivedMark = gr.archived ? " [ARCHIVED]" : "";
    textLine(`GROUP: ${gr.name}${archivedMark}`, 13, true);
    textLine(
      `Default %: ${money(st.defaultRatePercent)}%   Periods: ${groupTotals.periods}   Rows: ${groupTotals.rows}`,
      10,
      false
    );
    addPageIfNeeded(lineH);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    doc.setTextColor(30, 160, 80);
    doc.text(`Done: ${statusCounts.done}`, margin, y);

    doc.setTextColor(220, 60, 60);
    doc.text(`Fail: ${statusCounts.fail}`, margin + 34, y);

    doc.setTextColor(215, 170, 20);
    doc.text(`Fixed: ${statusCounts.fixed}`, margin + 64, y);

    doc.setTextColor(0, 0, 0);
    y += lineH;
    
    textLine(
      `Gross: ${money(groupTotals.gross)}   Net: ${money(groupTotals.net)}   My €: ${money(groupTotals.my)}`,
      11,
      true
    );
    hr();

    st.periods.forEach((p, pi) => {
      const from = formatDateLocal(p.from) || "—";
      const to = formatDateLocal(p.to) || "—";
      const t = calcPeriodTotals(p, st.defaultRatePercent);

      textLine(`Period ${pi + 1}: ${from} - ${to}`, 11, true);
      textLine(
        `Gross: ${money(t.gross)}   Net: ${money(t.net)}   My €: ${money(t.my)}   (Clients: ${p.rows.length})`,
        10,
        false
      );

      p.rows.forEach((r) => {
        const customerName = (r.customer || "Client").toString().trim() || "Client";
        const name = gr.archived ? `[ARCHIVED] ${customerName}` : customerName;
        const city = (r.city || "—").toString().trim() || "—";
        const rg = money(parseMoney(r.gross));
        const rn = money(parseMoney(r.net));

        const state = ["none", "done", "fail", "fixed"].includes(r.done) ? r.done : "none";

        const baseText = `• ${name} [${city}] | Gross: ${rg} | Net: ${rn}`;
        const statusLabel =
          state === "done" ? " Done"
          : state === "fail" ? " Fail"
          : state === "fixed" ? " Fixed"
          : "";

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        const baseLines = doc.splitTextToSize(baseText, maxW);

        baseLines.forEach((ln, lineIndex) => {
          addPageIfNeeded(lineH);

          doc.setTextColor(0, 0, 0);
          doc.text(ln, margin, y);

          if (lineIndex === baseLines.length - 1 && statusLabel) {
            const baseWidth = doc.getTextWidth(ln);
            const statusX = margin + baseWidth + 2;

            if (state === "done") doc.setTextColor(30, 160, 80);
            else if (state === "fail") doc.setTextColor(220, 60, 60);
            else if (state === "fixed") doc.setTextColor(180, 120, 10);

            doc.text(statusLabel, statusX, y);
          }

          y += lineH;
        });

        doc.setTextColor(0, 0, 0);
      });

      hr();
    });

    if (gi !== groupsData.length - 1) addPageIfNeeded(20);
  });

  const fileName = `client-totals_ALL_${nowStamp()}.pdf`;

  setTimeout(() => {
    try {
      doc.save(fileName);
    } catch (e) {
      console.error(e);
      alert("PDF export failed (download issue). Try Chrome.");
    }
  }, 150);
}

function handleExportPdf() {
  const oldText = menuPdfBtn?.textContent || "Export PDF";

  if (menuPdfBtn) {
    menuPdfBtn.disabled = true;
    menuPdfBtn.textContent = "Generating PDF...";
  }

  setTimeout(() => {
    try {
      exportPdfAllGroups();
    } finally {
      setTimeout(() => {
        if (menuPdfBtn) {
          menuPdfBtn.disabled = false;
          menuPdfBtn.textContent = oldText;
        }
      }, 1200);
    }
  }, 50);
}

/* =========================
   Excel Export
========================= */

async function handleExportExcel() {
  try {
    if (typeof XLSX === "undefined") {
      alert("XLSX library is missing.");
      return;
    }

    const wb = XLSX.utils.book_new();

    const rowData = [];
    const summaryData = [];

    appState.groups.forEach((group) => {
      const groupName = group.archived ? `📦 ${group.name}` : group.name;
      const rate = clampRate(Number(group?.data?.defaultRatePercent ?? 0));

      let groupGross = 0;
      let groupNet = 0;
      let groupMy = 0;
      let doneCount = 0;
      let failCount = 0;
      let fixedCount = 0;

      (group.data?.periods || []).forEach((period) => {
        const totals = calcPeriodTotals(period, rate);

        groupGross += totals.gross;
        groupNet += totals.net;
        groupMy += totals.my;

        (period.rows || []).forEach((r) => {
          const status = r.done || "none";

          if (status === "done") doneCount++;
          else if (status === "fail") failCount++;
          else if (status === "fixed") fixedCount++;

          rowData.push({
            Group: groupName,
            Archived: group.archived ? "yes" : "no",
            DefaultRatePercent: rate,
            From: period.from || "",
            To: period.to || "",
            Client: r.customer || "",
            City: r.city || "",
            Gross: parseMoney(r.gross),
            Net: parseMoney(r.net),
            Status: status
          });
        });
      });

      summaryData.push({
        Group: groupName,
        Archived: group.archived ? "yes" : "no",
        DefaultRatePercent: rate,
        Periods: (group.data?.periods || []).length,
        Rows: (group.data?.periods || []).reduce((sum, p) => sum + ((p.rows || []).length), 0),
        Gross: groupGross,
        Net: groupNet,
        "My €": groupMy,
        Done: doneCount,
        Fail: failCount,
        Fixed: fixedCount
      });
    });

    if (!rowData.length) {
      alert("No data to export.");
      return;
    }

    const wsRows = XLSX.utils.json_to_sheet(rowData);
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);

    wsRows["!cols"] = [
      { wch: 20 }, // Group
      { wch: 10 }, // Archived
      { wch: 18 }, // DefaultRatePercent
      { wch: 12 }, // From
      { wch: 12 }, // To
      { wch: 24 }, // Client
      { wch: 18 }, // City
      { wch: 14 }, // Gross
      { wch: 14 }, // Net
      { wch: 12 }  // Status
    ];

    wsSummary["!cols"] = [
      { wch: 20 }, // Group
      { wch: 10 }, // Archived
      { wch: 18 }, // DefaultRatePercent
      { wch: 10 }, // Periods
      { wch: 10 }, // Rows
      { wch: 14 }, // Gross
      { wch: 14 }, // Net
      { wch: 14 }, // My €
      { wch: 10 }, // Done
      { wch: 10 }, // Fail
      { wch: 10 }  // Fixed
    ];

    XLSX.utils.book_append_sheet(wb, wsRows, "Rows");
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    const fileName = `client-totals_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    await askConfirm(
      "Excel exported successfully.",
      "Export Excel",
      { singleButton: true, okText: "OK" }
    );
  } catch (err) {
    console.error(err);
    await askConfirm(
      "Excel export failed.",
      "Export Excel",
      { singleButton: true, okText: "OK" }
    );
  }
}

/* =========================
   Excel Import
========================= */

async function handleImportExcelChange(e) {
  const file = e?.target?.files?.[0];
  if (!file) return;

  try {
    if (typeof XLSX === "undefined") {
      await askConfirm(
        "XLSX library is missing.",
        "Import Excel",
        { singleButton: true, okText: "OK" }
      );
      return;
    }

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      await askConfirm(
        "Excel import failed: sheet not found.",
        "Import Excel",
        { singleButton: true, okText: "OK" }
      );
      return;
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (!rows.length) {
      await askConfirm(
        "Excel import failed: file is empty.",
        "Import Excel",
        { singleButton: true, okText: "OK" }
      );
      return;
    }
    
    const headerAliases = {
      group: "Group",
      groupname: "Group",

      archived: "Archived",
      archive: "Archived",

      defaultratepercent: "DefaultRatePercent",
      defaultrate: "DefaultRatePercent",
      rate: "DefaultRatePercent",
      percent: "DefaultRatePercent",

      from: "From",
      datefrom: "From",

      to: "To",
      dateto: "To",

      client: "Client",
      customer: "Client",
      clientname: "Client",
      name: "Client",

      city: "City",
      town: "City",

      gross: "Gross",
      brutto: "Gross",

      net: "Net",
      netto: "Net",

      status: "Status",
      done: "Status"
    };

    const normalizeHeaderKey = (key) =>
      String(key || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_\-()%€]+/g, "");

    const normalizedRows = rows.map((row) => {
      const out = {};

      Object.keys(row || {}).forEach((key) => {
        const normalizedKey = normalizeHeaderKey(key);
        const canonicalKey = headerAliases[normalizedKey];

        if (canonicalKey) {
          out[canonicalKey] = row[key];
        }
      });

      return {
        Group: out.Group ?? "",
        Archived: out.Archived ?? "",
        DefaultRatePercent: out.DefaultRatePercent ?? "",
        From: out.From ?? "",
        To: out.To ?? "",
        Client: out.Client ?? "",
        City: out.City ?? "",
        Gross: out.Gross ?? "",
        Net: out.Net ?? "",
        Status: out.Status ?? ""
      };
    });

    const requiredColumns = ["Group", "From", "To", "Client", "Gross", "Net"];
    const hasAnyValidColumn = normalizedRows.some((row) =>
      requiredColumns.some((col) => String(row[col] ?? "").trim() !== "")
    );

    if (!hasAnyValidColumn) {
      await askConfirm(
        "Excel import failed: required columns were not recognized.",
        "Import Excel",
        { singleButton: true, okText: "OK" }
      );
      return;
    }

    const groupMap = new Map();
    const rateConflicts = [];

    normalizedRows.forEach((row) => {
      const rawGroupName = String(row.Group || "").trim() || "Group";
      const isArchived =
        String(row.Archived || "").trim().toLowerCase() === "yes" ||
        rawGroupName.startsWith("📦 ");

      const cleanGroupName = rawGroupName.replace(/^📦\s*/, "").trim() || "Group";

      const rawRateValue = String(row.DefaultRatePercent ?? "").trim();
      const parsedRate = rawRateValue === "" ? NaN : Number(rawRateValue);
      const hasValidRate = Number.isFinite(parsedRate) && parsedRate >= 0 && parsedRate <= 100;
      const rate = hasValidRate ? clampRate(parsedRate) : null;

      const key = `${cleanGroupName}__${isArchived ? "1" : "0"}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          id: uuid(),
          name: cleanGroupName,
          archived: isArchived,
          data: {
            defaultRatePercent: rate ?? 0,
            periods: []
          },
          _firstRateSeen: rate,
          _rateConflict: false
        });
      }

      const group = groupMap.get(key);
      if (!group) return;

      if (rate !== null) {
        if (group._firstRateSeen === null || group._firstRateSeen === undefined) {
          group._firstRateSeen = rate;
          group.data.defaultRatePercent = rate;
        } else if (group._firstRateSeen !== rate) {
          group._rateConflict = true;

          if (!rateConflicts.includes(`${isArchived ? "📦 " : ""}${cleanGroupName}`)) {
            rateConflicts.push(`${isArchived ? "📦 " : ""}${cleanGroupName}`);
          }
        }
      }

      const from = String(row.From || "").trim();
      const to = String(row.To || "").trim();
      const periodKey = `${from}__${to}`;

      let period = group.data.periods.find((p) => p._excelKey === periodKey);

      if (!period) {
        period = {
          id: uuid(),
          from,
          to,
          rows: [],
          _excelKey: periodKey
        };
        group.data.periods.push(period);
      }

      period.rows.push({
        id: uuid(),
        customer: String(row.Client || "").trim(),
        city: String(row.City || "").trim(),
        gross: String(row.Gross ?? "").trim(),
        net: String(row.Net ?? "").trim(),
        done: ["none", "done", "fail", "fixed"].includes(String(row.Status || "").trim())
          ? String(row.Status || "").trim()
          : "none"
      });
    });

    groupMap.forEach((g) => {
      if (!Number.isFinite(g.data.defaultRatePercent)) {
        g.data.defaultRatePercent = 0;
      }
    });

    const importedGroups = [...groupMap.values()].map((g) => ({
      id: g.id,
      name: g.name,
      archived: g.archived,
      data: {
        defaultRatePercent: clampRate(g.data.defaultRatePercent),
        periods: g.data.periods.map((p) => ({
          id: p.id,
          from: p.from,
          to: p.to,
          rows: p.rows.length ? p.rows : [emptyRow()]
        }))
      }
    }));

    if (!importedGroups.length) {
      await askConfirm(
        "Excel import failed: no valid rows found.",
        "Import Excel",
        { singleButton: true, okText: "OK" }
      );
      return;
    }

    const okReplace = await askConfirm(
      `Import Excel file:\n${file.name}\n\nDo you want to replace all current app data with this file?\n\nThis cannot be undone.`,
      "Import Excel",
      { type: "danger", okText: "Replace" }
    );

    if (!okReplace) return;

    appState = normalizeAppState({
      activeGroupId: importedGroups[0]?.id || "",
      groups: importedGroups,
      workspaceMode: "active",
      grandMode: "all",
      uiMode: appState.uiMode === "edit" ? "edit" : "review"
    });

    saveState();
    render();
    if (appState.uiMode === "review") renderReview();

    if (rateConflicts.length) {
      await askConfirm(
        "Excel imported successfully.\n\n" +
        "Different Default Rate values were found in these groups:\n\n" +
        rateConflicts.join("\n") +
        "\n\nFor each group, the first valid Default Rate was used.",
        "Import Excel",
        { singleButton: true, okText: "OK" }
      );
    } else {
      await askConfirm(
        "Excel file imported successfully.",
        "Import Excel",
        { singleButton: true, okText: "OK" }
      );
    }
  } catch (err) {
    console.error(err);
    await askConfirm(
      "Excel import failed.",
      "Import Excel",
      { singleButton: true, okText: "OK" }
    );
  }
}

/* =========================
   Storage Indicator (for top menu)
========================= */

function updateStorageIndicator() {
  try {
    let totalBytes = 0;

    const appKeys = [
      STORAGE_KEY,
      CONTROLS_KEY,
      THEME_KEY,
      SUMMARY_COLLAPSED_KEY,
      MONTH_CURSOR_KEY,
      PERIODS_COLLAPSED_KEY,
      BACKUP_REMINDER_DIRTY_KEY,
      BACKUP_REMINDER_LAST_CHANGE_KEY,
      BACKUP_REMINDER_LAST_SHOWN_KEY,
      PIN_VERIFIED_KEY
    ];

    appKeys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value != null) {
        totalBytes += (key.length + value.length) * 2;
      }
    });

    const mb = totalBytes / (1024 * 1024);
    const percent = Math.min((mb / 5) * 100, 100);

    const bar = document.getElementById("storageBarFill");
    const text = document.getElementById("storageText");

    if (!bar || !text) return;

    bar.style.width = percent + "%";

    if (percent < 50) {
      bar.style.background = "#34d399";
    } else if (percent < 80) {
      bar.style.background = "#facc15";
    } else {
      bar.style.background = "#ef4444";
    }

    text.textContent = `${mb.toFixed(2)} MB used`;
  } catch (e) {
    console.warn("Storage indicator error", e);
  }
}