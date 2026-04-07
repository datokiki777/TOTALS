// 06-render.js
// UI rendering and update functions

function updateControlsButtonLabel() {
  const btn = document.getElementById("controlsToggle");
  if (!btn) return;

  const group = activeGroup();

  if (!group || !group.name || !group.name.trim()) {
    btn.textContent = "👤 Select";
    return;
  }

  let name = group.name.trim();

  name = name.split(" ")[0];

  const MAX = 8;
  if (name.length > MAX) {
    name = name.slice(0, MAX);
  }

  btn.textContent = `👤 ${name}`;
}

function renderGroupSelect() {
  if (!groupPickerBtn || !groupPickerBtnText) return;

  const g = activeGroup();

  if (!g) {
    groupPickerBtnText.textContent = "Select group";
    return;
  }

  groupPickerBtnText.textContent = g.archived ? `📦 ${g.name}` : g.name;
}

function renderOverviewDateRange() {
  if (!overviewDateRangeEl) return;

  let groups = [];

  if (appState.grandMode === "active") {
    const g = activeGroup();
    groups = g ? [g] : [];
  } else {
    groups = getGroupsByMode(appState.grandMode);
  }

  const { min, max } = getGroupsDateRange(groups);

  if (!min && !max) {
    overviewDateRangeEl.textContent = "—";

    if (overviewDurationEl) {
      overviewDurationEl.innerHTML = `
        <span class="dur-months">—</span>
        <span class="dur-days">—</span>
      `;
    }

    return;
  }

  if (overviewDurationEl) {
    if (min && max) {
      const { months, days } = getDurationMonthsDays(min, max);

      overviewDurationEl.innerHTML = `
        <span class="dur-months">${months} m</span>
        <span class="dur-days">${days} d</span>
      `;
    } else {
      overviewDurationEl.innerHTML = `
        <span class="dur-months">—</span>
        <span class="dur-days">—</span>
      `;
    }
  }

  if (min && max) {
    overviewDateRangeEl.textContent = `${formatDateForRange(min)} → ${formatDateForRange(max)}`;
    return;
  }

  const single = min || max;
  overviewDateRangeEl.textContent = formatDateForRange(single);
}

function updateFloatingAddClientVisibility() {
  const allPeriods = elPeriods?.querySelectorAll?.(".period") ?? [];
  if (!allPeriods.length) {
    rootEl.classList.remove("all-periods-collapsed");
    return;
  }

  const hasOpenPeriod = [...allPeriods].some((sec) => !sec.classList.contains("is-collapsed"));
  rootEl.classList.toggle("all-periods-collapsed", !hasOpenPeriod);
}

function renderMonthlyStats() {
  if (!monthLabel || !monthGrossEl || !monthNetEl || !monthMyEl) return;

  const keys = getAllMonthKeysForMode(appState.grandMode);
  const currentKey = getCurrentMonthKey(appState.grandMode);
  const totals = calcMonthlyTotals(currentKey, appState.grandMode);
  const status = calcMonthlyStatus(currentKey, appState.grandMode);

  const doneEl = document.getElementById("monthDone");
  const failEl = document.getElementById("monthFail");
  const fixedEl = document.getElementById("monthFixed");

  monthLabel.textContent = formatMonthKey(currentKey);
  animateNumber(monthGrossEl, totals.gross);
  animateNumber(monthNetEl, totals.net);
  animateNumber(monthMyEl, totals.my);

  if (doneEl) doneEl.textContent = status.done;
  if (failEl) failEl.textContent = status.fail;
  if (fixedEl) fixedEl.textContent = status.fixed;

  if (monthPrevBtn) monthPrevBtn.disabled = !currentKey || currentKey === keys[0];
  if (monthNextBtn) monthNextBtn.disabled = !currentKey || currentKey === keys[keys.length - 1];
}

function recalcAndRenderTotals() {
  const grand = calcGrandTotalsByMode(appState.grandMode);

  if (grandGrossEl) {
    animateNumber(grandGrossEl, grand.gross);
    grandGrossEl.classList.add("total-flash");
    setTimeout(() => grandGrossEl.classList.remove("total-flash"), 280);
  }

  if (grandNetEl) {
    animateNumber(grandNetEl, grand.net);
    grandNetEl.classList.add("total-flash");
    setTimeout(() => grandNetEl.classList.remove("total-flash"), 280);
  }

  if (grandMyEl) {
    animateNumber(grandMyEl, grand.my);
    grandMyEl.classList.add("total-flash");
    setTimeout(() => grandMyEl.classList.remove("total-flash"), 280);
  }

  if (appState.uiMode === "edit") {
    const g = activeGroup();
    const st = g.data;
    const periodSections = elPeriods?.querySelectorAll?.(".period") ?? [];
    periodSections.forEach((sec, i) => {
      const p = st.periods[i];
      if (!p) return;

      const t = calcPeriodTotals(p, st.defaultRatePercent);
      const editMy = calcEditPeriodMyOnly(p, st.defaultRatePercent);

      const gEl = sec.querySelector(".total-gross");
      const nEl = sec.querySelector(".total-net");
      const mEl = sec.querySelector(".my-eur");

      if (gEl) gEl.textContent = fmt(t.gross);
      if (nEl) nEl.textContent = fmt(t.net);
      if (mEl) mEl.textContent = fmt(editMy);
    });
  }

  renderMonthlyStats();
  renderOverviewDateRange();
}

function render() {
  renderGroupSelect();
  updateGrandToggleUI();
  updateWorkspaceSwitchUI();
  updateControlsButtonLabel();

  const g = activeGroup();
  const st = g.data;

  if (defaultRateInput) defaultRateInput.value = String(st.defaultRatePercent);

  if (!elPeriods || !tplPeriod || !tplRow) {
    recalcAndRenderTotals();
    return;
  }

  elPeriods.innerHTML = "";

  st.periods.forEach((p, idx) => {
    const node = tplPeriod.content.cloneNode(true);

    const section = node.querySelector(".period");
    const collapseBtn = node.querySelector(".period-collapse-btn");
    const collapseMeta = node.querySelector(".period-range-preview");
    const collapseGroupPreview = node.querySelector(".period-group-preview");
    const groupBox = node.querySelector(".period-group-box");

    const fromEl = node.querySelector(".fromDate");
    const toEl = node.querySelector(".toDate");
    const rowsTbody = node.querySelector(".rows");
    const addRowBtn = node.querySelector(".addRow");
    const addPeriodInlineBtn = node.querySelector(".addPeriodInline");
    const removePeriodBtn = node.querySelector(".removePeriod");

    const totalGrossEl = node.querySelector(".total-gross");
    const totalNetEl = node.querySelector(".total-net");
    const myEurEl = node.querySelector(".my-eur");

    if (fromEl) fromEl.value = p.from;
    if (toEl) toEl.value = p.to;

    if (collapseMeta) {
      collapseMeta.textContent = formatPeriodPreview(p.from, p.to);
    }

    if (collapseGroupPreview) {
      collapseGroupPreview.textContent = g.archived ? `📦 ${g.name}` : (g.name || "Group");
    }

    if (groupBox) {
      groupBox.textContent = g.archived ? `📦 Group: ${g.name}` : `Group: ${g.name || "Group"}`;
    }

    if (section) {
      const collapsed = isPeriodCollapsed(p.id);
      section.classList.toggle("is-collapsed", collapsed);
      section.dataset.index = String(idx + 1);
      section.dataset.periodId = p.id;
    }

    collapseBtn?.addEventListener("click", () => {
      const next = !section.classList.contains("is-collapsed");
      section.classList.toggle("is-collapsed", next);
      setPeriodCollapsed(p.id, next);
      updateFloatingAddClientVisibility();
    });

    fromEl?.addEventListener("change", async () => {
      const oldFrom = p.from;
      const newFrom = fromEl.value;

      const ok = await validatePeriodWarnings(p.id, newFrom, p.to, () => {
        fromEl.value = oldFrom || "";
        if (collapseMeta) collapseMeta.textContent = formatPeriodPreview(oldFrom, p.to);
      });

      if (!ok) {
        p.from = oldFrom;
        return;
      }

      p.from = newFrom;
      if (collapseMeta) collapseMeta.textContent = formatPeriodPreview(p.from, p.to);

      saveState();
      recalcAndRenderTotals();
      if (appState.uiMode === "review") renderReview();
    });

    toEl?.addEventListener("change", async () => {
      const oldTo = p.to;
      const newTo = toEl.value;

      const ok = await validatePeriodWarnings(p.id, p.from, newTo, () => {
        toEl.value = oldTo || "";
        if (collapseMeta) collapseMeta.textContent = formatPeriodPreview(p.from, oldTo);
      });

      if (!ok) {
        p.to = oldTo;
        return;
      }

      p.to = newTo;
      if (collapseMeta) collapseMeta.textContent = formatPeriodPreview(p.from, p.to);

      saveState();
      recalcAndRenderTotals();
      if (appState.uiMode === "review") renderReview();
    });

    if (rowsTbody) rowsTbody.innerHTML = "";

    p.rows.forEach((r) => {
      const rowNode = tplRow.content.cloneNode(true);
      const tr = rowNode.querySelector("tr");
      if (tr) {
        tr.dataset.rowId = r.id;
      }

      const custEl = rowNode.querySelector(".cust");
      const cityEl = rowNode.querySelector(".city");
      const grossEl = rowNode.querySelector(".gross");
      const netEl = rowNode.querySelector(".net");
      const doneBtn = rowNode.querySelector(".doneBtn");
      const removeRowBtn = rowNode.querySelector(".removeRow");

      if (custEl) custEl.value = r.customer ?? "";
      if (cityEl) cityEl.value = r.city ?? "";
      if (grossEl) grossEl.value = r.gross ?? "";
      if (netEl) netEl.value = r.net ?? "";

      if (doneBtn) {
        const state = ["none", "done", "fail", "fixed"].includes(r.done) ? r.done : "none";
        doneBtn.classList.remove("state-none", "state-done", "state-fail", "state-fixed");
        doneBtn.classList.add(`state-${state}`);
      }

      custEl?.addEventListener("input", () => {
        r.customer = custEl.value;
        saveState();
      });

      cityEl?.addEventListener("input", () => {
        r.city = cityEl.value;
        saveState();
      });

      grossEl?.addEventListener("input", () => {
        r.gross = grossEl.value;
        recalcAndRenderTotals();
        saveState();
      });

      netEl?.addEventListener("input", () => {
        r.net = netEl.value;
        recalcAndRenderTotals();
        saveState();
      });

      doneBtn?.addEventListener("click", () => {
        const current = ["none", "done", "fail", "fixed"].includes(r.done) ? r.done : "none";

        if (current === "none") r.done = "done";
        else if (current === "done") r.done = "fail";
        else if (current === "fail") r.done = "fixed";
        else r.done = "none";

        doneBtn.classList.remove("state-none", "state-done", "state-fail", "state-fixed");
        doneBtn.classList.add(`state-${r.done}`);

        saveState();
        renderMonthlyStats();

        if (appState.uiMode === "review") {
          renderReview();
        }
      });

      removeRowBtn?.addEventListener("click", async () => {
        const ok = await askConfirm(
          "Delete this client row?",
          "Delete row",
          { type: "danger", okText: "Delete" }
        );
        if (!ok) return;

        p.rows = p.rows.filter((x) => x.id !== r.id);
        if (p.rows.length === 0) p.rows.push(emptyRow());

        saveState();
        render();
        if (appState.uiMode === "review") renderReview();
      });

      rowsTbody?.appendChild(tr);
    });

    addRowBtn?.addEventListener("click", () => {
      p.rows.push(emptyRow());
      saveState();
      render();
      if (appState.uiMode === "review") renderReview();

      setTimeout(() => {
        const inputs = elPeriods?.querySelectorAll?.("input.cust");
        const lastInput = inputs?.[inputs.length - 1];
        if (lastInput) lastInput.focus();
      }, 50);
    });

    addPeriodInlineBtn?.addEventListener("click", () => {
      st.periods.forEach((periodItem) => {
        setPeriodCollapsed(periodItem.id, true);
      });

      const newPeriod = {
        id: uuid(),
        from: "",
        to: "",
        rows: [emptyRow()],
      };

      st.periods.push(newPeriod);
      setPeriodCollapsed(newPeriod.id, false);

      saveState();
      render();
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

    removePeriodBtn?.addEventListener("click", async () => {
      const ok = await askConfirm(
        "Delete this period?",
        "Delete period",
        { type: "danger", okText: "Delete" }
      );
      if (!ok) return;

      st.periods = st.periods.filter((x) => x.id !== p.id);
      if (st.periods.length === 0) st.periods = defaultGroupData().periods;

      saveState();
      render();
      if (appState.uiMode === "review") renderReview();
    });

    const totals = calcPeriodTotals(p, st.defaultRatePercent);
    const editMy = calcEditPeriodMyOnly(p, st.defaultRatePercent);

    if (totalGrossEl) totalGrossEl.textContent = fmt(totals.gross);
    if (totalNetEl) totalNetEl.textContent = fmt(totals.net);
    if (myEurEl) myEurEl.textContent = fmt(editMy);

    elPeriods.appendChild(node);
  });

  recalcAndRenderTotals();
  updateFloatingAddClientVisibility();
}

function renderReview() {
  if (!reviewView) return;

  const groupsToShow = getGroupsByMode();

  // Empty state
  if (groupsToShow.length === 0) {
    const emptyMessage =
      appState.workspaceMode === "archive"
        ? (appState.grandMode === "active"
            ? "📦 No archived group selected"
            : "📦 No archived groups")
        : (appState.grandMode === "active"
            ? "👤 No active group selected"
            : "👥 No active groups");

    reviewView.innerHTML = `
      <div class="review-card" style="text-align:center; padding:50px 20px;">
        <div style="font-size:64px; margin-bottom:20px; opacity:0.6;">📭</div>
        <div style="font-size:20px; font-weight:500; opacity:0.8;">${emptyMessage}</div>
        <div style="font-size:14px; margin-top:12px; opacity:0.5;">Create a group or add periods to get started</div>
      </div>
    `;
    initReviewSearch();
    return;
  }

  let fullHtml = "";

  groupsToShow.forEach((g) => {
    const st = g.data;
    const groupIndex = appState.groups.findIndex(gr => gr.id === g.id);
    const colorClass = `group-color-${groupIndex % 8}`;

    const groupTotals = st.periods.reduce(
      (acc, p) => {
        const t = calcPeriodTotals(p, st.defaultRatePercent);
        acc.gross += t.gross;
        acc.net += t.net;
        acc.my += t.my;
        acc.periods += 1;
        acc.clients += p.rows.length;
        return acc;
      },
      { gross: 0, net: 0, my: 0, periods: 0, clients: 0 }
    );

    const statusCounts = calcGroupStatusCounts(g);

    const statusBadgesHtml = `
      ${statusCounts.done > 0 ? `<span class="badge-done">${statusCounts.done}</span>` : ""}
      ${statusCounts.fail > 0 ? `<span class="badge-fail">${statusCounts.fail}</span>` : ""}
      ${statusCounts.fixed > 0 ? `<span class="badge-fixed">${statusCounts.fixed}</span>` : ""}
    `;

    fullHtml += `
      <section class="review-card ${colorClass}" style="${g.archived ? 'opacity:0.7;' : ''}">
        <div class="review-head">
          <div>
            <h3 class="review-title">${escapeHtml(g.name)}${g.archived ? ' 📦' : ''} — Review</h3>
            <div class="review-sub">${groupTotals.periods} periods • ${groupTotals.clients} rows • Default ${fmt(st.defaultRatePercent)}%</div>
          </div>

          ${statusBadgesHtml.trim() ? `
            <div class="month-badges">
              ${statusBadgesHtml}
            </div>
          ` : ``}
        </div>

        <div class="review-kpis">
          <div class="kpi">
            <div class="kpi-label">Gross</div>
            <div class="kpi-value">${fmt(groupTotals.gross)}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Net</div>
            <div class="kpi-value">${fmt(groupTotals.net)}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">My €</div>
            <div class="kpi-value">${fmt(groupTotals.my)}</div>
          </div>
        </div>
      </section>
    `;

    st.periods.forEach((p) => {
      const t = calcPeriodTotals(p, st.defaultRatePercent);
      const from = formatDateLocal(p.from) || "—";
      const to = formatDateLocal(p.to) || "—";

      const clients = p.rows.map((r) => {
        const name = r.customer?.trim() || "Client";
        const city = r.city?.trim() || "—";
        const state = ["none", "done", "fail", "fixed"].includes(r.done) ? r.done : "none";

        let statusHtml = "";
        if (state === "done") {
          statusHtml = `<span class="review-status review-status-done">Done</span>`;
        } else if (state === "fail") {
          statusHtml = `<span class="review-status review-status-fail">Fail</span>`;
        } else if (state === "fixed") {
          statusHtml = `<span class="review-status review-status-fixed">Fixed</span>`;
        }

        return `
          <div class="client-item">
            <div>
              <div class="client-name-row">
                <div class="client-name">${g.archived ? '📦 ' : ''}${escapeHtml(name)}</div>
                ${statusHtml}
              </div>
              <div class="review-sub" style="margin:2px 0 0 0;">City: <b>${escapeHtml(city)}</b></div>
            </div>
            <div class="client-values">
              <span>Gross:</span> <b>${fmt(parseMoney(r.gross))}</b>
              <span>Net:</span> <b>${fmt(parseMoney(r.net))}</b>
            </div>
          </div>
        `;
      }).join("");

      fullHtml += `
        <details class="period-card ${colorClass}">
          <summary>
            <div class="period-meta">
              <div class="period-range">${escapeHtml(from)} → ${escapeHtml(to)}</div>
              <div class="period-mini">${p.rows.length} clients</div>
            </div>

            <div class="period-sum">
              <span class="badge">Gross: <b>${fmt(t.gross)}</b></span>
              <span class="badge">Net: <b>${fmt(t.net)}</b></span>
              <span class="badge">My €: <b>${fmt(t.my)}</b></span>
            </div>
          </summary>

          <div class="period-body">
            <div class="client-list">
              ${clients || `<div class="hint">No clients.</div>`}
            </div>
          </div>
        </details>
      `;
    });
  });

  reviewView.innerHTML = fullHtml;
  initReviewSearch();
  refreshSearchIndex();
}