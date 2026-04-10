// 40-update-flow.js
// Orchestrators: what to update after data changes

function renderEditPeriodTotals(periodId = null) {
  if (appState.uiMode !== "edit") return;

  const g = activeGroup();
  const st = g.data;
  const periodSections = elPeriods?.querySelectorAll?.(".period") ?? [];

  periodSections.forEach((sec) => {
    const pid = sec.dataset.periodId;
    if (!pid) return;
    if (periodId !== null && pid !== periodId) return;

    const p = (st.periods || []).find((x) => x.id === pid);
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

async function updateAfterRowChange(periodId) {
  renderEditPeriodTotals(periodId);
  renderGrandTotals();
  await renderMonthlySection();
  renderOverviewSection();
}

async function updateAfterPeriodMetaChange(periodId) {
  const periodSection = document.querySelector(`.period[data-period-id="${periodId}"]`);
  if (periodSection) {
    const collapseMeta = periodSection.querySelector(".period-range-preview");
    const p = activeGroup().data.periods.find(x => x.id === periodId);
    if (collapseMeta && p) {
      collapseMeta.textContent = formatPeriodPreview(p.from, p.to);
    }
  }
  renderGrandTotals();
  await renderMonthlySection();
  renderOverviewSection();
  if (appState.uiMode === "review") renderReview();
}

async function updateAfterStatusChange(periodId) {
  await renderMonthlySection();
  renderOverviewSection();
  if (appState.uiMode === "review") renderReview();
}

async function updateAfterGlobalChange() {
  renderGrandTotals();
  await renderMonthlySection();
  renderOverviewSection();
  if (appState.uiMode === "review") renderReview();
}

async function recalcAndRenderTotals() {
  renderGrandTotals();
  renderEditPeriodTotals();
  await renderMonthlySection();
  renderOverviewSection();
}