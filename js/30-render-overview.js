// 30-render-overview.js
// Overview date range + client/duration widget

function renderOverviewDateRange() {
  const groups = totalsActiveBtn?.classList.contains("active")
    ? [activeGroup()].filter(Boolean)
    : getGroupsByMode();

  const { min, max } = getGroupsDateRange(groups);
  const clientsCount = getMarkedClientsCount(groups);

  if (overviewDateRangeEl) {
    overviewDateRangeEl.textContent =
      min && max ? `${formatDateForRange(min)} → ${formatDateForRange(max)}` : "—";
  }

  if (overviewDurationEl) {
    if (min && max) {
      const { months, days } = getDurationMonthsDays(min, max);

     overviewDurationEl.innerHTML = `
        <span class="dur-clients">${clientsCount} Clients</span>
        <span class="dur-months">${months} Mo ${days} D</span>
      `;
    } else {
      overviewDurationEl.innerHTML = `
        <span class="dur-clients">${clientsCount} Clients</span>
        <span class="dur-months">—</span>
        <span class="dur-days">—</span>
      `;
    }
  }
}

function renderOverviewSection() {
  renderOverviewDateRange();
}