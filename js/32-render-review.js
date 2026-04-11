// 32-render-review.js
// Review mode rendering

function renderReview() {
  if (appState.uiMode !== "review") return;
  if (!reviewView) return;

  const groupsToShow = getGroupsByMode();

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
    const collapsed = isReviewGroupCollapsed(g.id);

    const statusBadgesHtml = `
      ${statusCounts.done > 0 ? `<span class="badge-done">${statusCounts.done}</span>` : ""}
      ${statusCounts.fail > 0 ? `<span class="badge-fail">${statusCounts.fail}</span>` : ""}
      ${statusCounts.fixed > 0 ? `<span class="badge-fixed">${statusCounts.fixed}</span>` : ""}
    `;

    let periodsHtml = "";

    if (!collapsed) {
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

        periodsHtml += `
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
    }

    fullHtml += `
      <section class="review-card ${colorClass} ${collapsed ? "is-collapsed" : "is-expanded"}" style="${g.archived ? 'opacity:0.7;' : ''}">
        <button
          type="button"
          class="review-group-toggle"
          data-review-group-toggle="${g.id}"
          aria-expanded="${collapsed ? "false" : "true"}"
        >
          <div class="review-head review-head-collapsible">
            <div class="review-head-main">
              <h3 class="review-title">${escapeHtml(g.name)}${g.archived ? ' 📦' : ''}</h3>
              <div class="review-sub">${groupTotals.periods} periods • ${groupTotals.clients} rows • Default ${fmt(st.defaultRatePercent)}%</div>
            </div>

            <div class="review-head-side">
  ${statusBadgesHtml.trim() ? `
    <div class="month-badges">
      ${statusBadgesHtml}
    </div>
  ` : ``}
</div>
          </div>
        </button>

        ${collapsed ? "" : `
          <div class="review-group-body">
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

            ${periodsHtml}
          </div>
        `}
      </section>
    `;
  });

  reviewView.innerHTML = fullHtml;
  initReviewSearch();
  refreshSearchIndex();
}