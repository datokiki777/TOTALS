// 21-actions-periods.js
// Period CRUD + overlap & date validation

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