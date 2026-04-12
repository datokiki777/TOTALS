// 31-render-periods.js
// Full render of edit view (periods, rows, totals)

async function render() {
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

  // წინასწარ ჩავტვირთოთ collapsed map ერთხელ (async), render-ში synchronous გამოვიყენოთ
  const collapsedMap = await getSavedCollapsedPeriods();

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
      const collapsed = !!collapsedMap[p.id];
      section.classList.toggle("is-collapsed", collapsed);
      section.dataset.index = String(idx + 1);
      section.dataset.periodId = p.id;
    }

    collapseBtn?.addEventListener("click", async () => {
      const next = !section.classList.contains("is-collapsed");
      section.classList.toggle("is-collapsed", next);
      await setPeriodCollapsed(p.id, next);
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

      await saveState();
      await updateAfterPeriodMetaChange(p.id);
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

      await saveState();
      await updateAfterPeriodMetaChange(p.id);
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
      if (grossEl) {
          grossEl.value = sanitizeIntegerMoneyInput(r.gross ?? "");
          grossEl.inputMode = "numeric";
          grossEl.setAttribute("pattern", "[0-9]*");
       }

      if (netEl) {
          netEl.value = sanitizeIntegerMoneyInput(r.net ?? "");
          netEl.inputMode = "numeric";
          netEl.setAttribute("pattern", "[0-9]*");
       }

      if (doneBtn) {
        const state = ["none", "done", "fail", "fixed"].includes(r.done) ? r.done : "none";
        doneBtn.classList.remove("state-none", "state-done", "state-fail", "state-fixed");
        doneBtn.classList.add(`state-${state}`);
      }

      // Customer name change - only save, no render needed
      custEl?.addEventListener("input", async () => {
        r.customer = custEl.value;
        await saveState();
      });

      // City change - only save, no render needed
      cityEl?.addEventListener("input", async () => {
        r.city = cityEl.value;
        await saveState();
      });

      // Gross change - affects totals
      grossEl?.addEventListener("input", async () => {
      const cleaned = sanitizeIntegerMoneyInput(grossEl.value);
      if (grossEl.value !== cleaned) {
      grossEl.value = cleaned;
      }

  r.gross = cleaned;
  await saveState();
  await updateAfterRowChange(p.id);
});

      let previousNetValue = r.net ?? "";

      netEl?.addEventListener("focus", () => {
        previousNetValue = netEl.value;
      });

      // Net change - affects totals
      netEl?.addEventListener("input", async () => {
      const cleaned = sanitizeIntegerMoneyInput(netEl.value);
      if (netEl.value !== cleaned) {
      netEl.value = cleaned;
     }

  r.net = cleaned;
  await saveState();
  await updateAfterRowChange(p.id);
});

      // Net suspicious check
      netEl?.addEventListener("change", async () => {
        const grossValue = grossEl?.value ?? "";
        const netValue = netEl.value;

        if (!isSuspiciousNetComparedToGross(grossValue, netValue)) {
          previousNetValue = netValue;
          return;
        }

        const ok = await askConfirm(
          "Net looks much smaller than Gross.\nIs this amount correct?",
          "Check amount",
          { type: "primary", okText: "Yes", cancelText: "Fix" }
        );

        if (ok) {
          previousNetValue = netValue;
          return;
        }

        netEl.value = previousNetValue || "";
        r.net = netEl.value;
        await saveState();
        await updateAfterRowChange(p.id);

        setTimeout(() => {
          netEl.focus();
          netEl.select?.();
        }, 30);
      });

      // Status change - affects monthly stats and review
      doneBtn?.addEventListener("click", async () => {
        const current = ["none", "done", "fail", "fixed"].includes(r.done) ? r.done : "none";

        if (current === "none") r.done = "done";
        else if (current === "done") r.done = "fail";
        else if (current === "fail") r.done = "fixed";
        else r.done = "none";

        doneBtn.classList.remove("state-none", "state-done", "state-fail", "state-fixed");
        doneBtn.classList.add(`state-${r.done}`);

        await saveState();
        await updateAfterStatusChange(p.id);
      });

      // Remove row - structural change, needs full render
      removeRowBtn?.addEventListener("click", async () => {
        const ok = await askConfirm(
          "Delete this client row?",
          "Delete row",
          { type: "danger", okText: "Delete" }
        );
        if (!ok) return;

        p.rows = p.rows.filter((x) => x.id !== r.id);
        if (p.rows.length === 0) p.rows.push(emptyRow());

        await saveState();
        render(); // Full render needed after row removal
        
      });

      rowsTbody?.appendChild(tr);
    });

    // Add row - structural change, needs full render
    addRowBtn?.addEventListener("click", async () => {
      p.rows.push(emptyRow());

      // FIX: period ღია დარჩეს render-ის შემდეგაც
      await setPeriodCollapsed(p.id, false);

      await saveState();
      render(); // Full render needed to show new row
      if (appState.uiMode === "review") renderReview();

      setTimeout(() => {
        const periodEl = document.querySelector(`.period[data-period-id="${p.id}"]`);
        if (!periodEl) return;

        periodEl.classList.remove("is-collapsed");

        const inputs = periodEl.querySelectorAll("input.cust");
        const lastInput = inputs[inputs.length - 1];

        if (lastInput) {
          lastInput.focus();
          lastInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 80);
    });

    // Add period inline - structural change, needs full render
    addPeriodInlineBtn?.addEventListener("click", async () => {
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
      render(); // Full render needed to show new period
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

    // Remove period - structural change, needs full render
    removePeriodBtn?.addEventListener("click", async () => {
      const ok = await askConfirm(
        "Delete this period?",
        "Delete period",
        { type: "danger", okText: "Delete" }
      );
      if (!ok) return;

      st.periods = st.periods.filter((x) => x.id !== p.id);
      if (st.periods.length === 0) st.periods = defaultGroupData().periods;

      await saveState();
      render(); // Full render needed after period removal
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