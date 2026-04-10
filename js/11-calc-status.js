// 11-calc-status.js
// Counting done/fail/fixed rows, marked clients, etc.

function isMarkedRow(row) {
  return !!row && (
    row.done === "done" ||
    row.done === "fail" ||
    row.done === "fixed"
  );
}

function countMarkedInPeriod(period) {
  if (!period || !Array.isArray(period.rows)) return 0;
  return period.rows.reduce((sum, row) => sum + (isMarkedRow(row) ? 1 : 0), 0);
}

function countMarkedInGroup(group) {
  const periods = group?.data?.periods || [];
  return periods.reduce((sum, period) => sum + countMarkedInPeriod(period), 0);
}

function getMarkedClientsCount(groups) {
  return (groups || []).reduce((sum, group) => sum + countMarkedInGroup(group), 0);
}

// Monthly status (counts per month, using overlap)
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

function calcStatusCountsByMode(mode = appState.grandMode) {
  let done = 0;
  let fail = 0;
  let fixed = 0;

  const groups = getGroupsByMode(mode);

  groups.forEach((group) => {
    const counts = calcGroupStatusCounts(group);
    done += counts.done;
    fail += counts.fail;
    fixed += counts.fixed;
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