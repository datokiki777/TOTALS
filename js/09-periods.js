// 09-periods.js
// Period calculations and validation functions

/* =========================
   Period Calculation Functions
========================= */

function calcPeriodTotals(period, ratePercent) {
  const gross = period.rows.reduce((sum, r) => sum + parseMoney(r.gross), 0);
  const net = period.rows.reduce((sum, r) => sum + parseMoney(r.net), 0);
  const my = net * (clampRate(ratePercent) / 100);
  return { gross, net, my };
}

function calcEditPeriodMyOnly(period, ratePercent) {
  const rate = clampRate(ratePercent) / 100;

  const my = (period.rows || []).reduce((sum, r) => {
    const hasNet = String(r?.net ?? "").trim() !== "";
    const base = hasNet ? parseMoney(r.net) : parseMoney(r.gross);
    return sum + (base * rate);
  }, 0);

  return my;
}

function calcGrandTotalsByMode(mode = appState.grandMode) {
  const grand = { gross: 0, net: 0, my: 0 };
  const groups = getGroupsByMode(mode);

  groups.forEach((gr) => {
    const st = gr.data;
    st.periods.forEach((p) => {
      const t = calcPeriodTotals(p, st.defaultRatePercent);
      grand.gross += t.gross;
      grand.net += t.net;
      grand.my += t.my;
    });
  });

  return grand;
}

function calcMonthlyTotals(monthKey, mode = appState.grandMode) {
  if (!monthKey) return { gross: 0, net: 0, my: 0 };

  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
  const groups = getGroupsByMode(mode);
  const totals = { gross: 0, net: 0, my: 0 };

  groups.forEach((gr) => {
    const st = gr.data;

    (st.periods || []).forEach((p) => {
      const from = parseDateOnly(p.from);
      const to = parseDateOnly(p.to);
      if (!from || !to || to < from) return;

      const totalDays = daysBetweenInclusive(from, to);
      const overlapDays = getOverlapDaysInclusive(from, to, monthStart, monthEnd);
      if (overlapDays <= 0 || totalDays <= 0) return;

      const ratio = overlapDays / totalDays;
      const t = calcPeriodTotals(p, st.defaultRatePercent);

      totals.gross += t.gross * ratio;
      totals.net += t.net * ratio;
      totals.my += t.my * ratio;
    });
  });

  return totals;
}

function calcMonthlyStatus(monthKey, mode = appState.grandMode) {
  if (!monthKey) return { done: 0, fail: 0, fixed: 0 };

  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
  const groups = getGroupsByMode(mode);

  let done = 0, fail = 0, fixed = 0;

  groups.forEach((gr) => {
    (gr.data?.periods || []).forEach((p) => {
      const from = parseDateOnly(p.from);
      const to = parseDateOnly(p.to);

      if (!from || !to || to < from) return;

      const overlap = getOverlapDaysInclusive(from, to, monthStart, monthEnd);
      if (overlap <= 0) return;

      (p.rows || []).forEach((r) => {
        if (r.done === "done") done++;
        else if (r.done === "fail") fail++;
        else if (r.done === "fixed") fixed++;
      });
    });
  });

  return { done, fail, fixed };
}

function calcGroupStatusCounts(group) {
  let done = 0;
  let fail = 0;
  let fixed = 0;

  (group?.data?.periods || []).forEach((p) => {
    (p.rows || []).forEach((r) => {
      if (r.done === "done") done++;
      else if (r.done === "fail") fail++;
      else if (r.done === "fixed") fixed++;
    });
  });

  return { done, fail, fixed };
}

function calcOverallStatusCounts() {
  let done = 0;
  let fail = 0;
  let fixed = 0;

  (appState.groups || []).forEach((group) => {
    const counts = calcGroupStatusCounts(group);
    done += counts.done;
    fail += counts.fail;
    fixed += counts.fixed;
  });

  return { done, fail, fixed };
}

/* =========================
   Period Validation Functions
========================= */

function periodsStrictlyOverlap(aFrom, aTo, bFrom, bTo) {
  if (!aFrom || !aTo || !bFrom || !bTo) return false;

  const aStart = parseDateOnly(aFrom);
  const aEnd = parseDateOnly(aTo);
  const bStart = parseDateOnly(bFrom);
  const bEnd = parseDateOnly(bTo);

  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  if (aEnd < aStart || bEnd < bStart) return false;

  return aStart < bEnd && aEnd > bStart;
}

function hasOverlappingPeriodInActiveGroup(periodId, from, to) {
  const g = activeGroup();
  const periods = g?.data?.periods || [];

  return periods.some((p) => {
    if (!p || p.id === periodId) return false;
    return periodsStrictlyOverlap(from, to, p.from, p.to);
  });
}

function isPeriodReversed(from, to) {
  if (!from || !to) return false;

  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);

  if (!fromDate || !toDate) return false;
  return fromDate > toDate;
}

async function validatePeriodWarnings(periodId, from, to, revertFn) {
  if (from && to && isPeriodReversed(from, to)) {
    const ok = await askConfirm(
      "From date is later than To date. Is that correct?",
      "Invalid period",
      { type: "primary", okText: "Keep" }
    );
    if (!ok) {
      revertFn();
      return false;
    }
  }

  if (from && to && hasOverlappingPeriodInActiveGroup(periodId, from, to)) {
    const ok = await askConfirm(
      "This period overlaps with another period in this group. Is that correct?",
      "Overlapping period",
      { type: "primary", okText: "Keep" }
    );
    if (!ok) {
      revertFn();
      return false;
    }
  }

  return true;
}

/* =========================
   Client Operations
========================= */

function addClientToLastPeriod() {
  const g = activeGroup();
  const st = g.data;
  const last = st.periods[st.periods.length - 1];
  if (!last) return;

  last.rows.push(emptyRow());
  saveState();
  render();

  setTimeout(() => {
    const inputs = elPeriods?.querySelectorAll?.("input.cust");
    const lastInput = inputs?.[inputs.length - 1];
    if (lastInput) lastInput.focus();
  }, 50);
}