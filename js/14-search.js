// 14-search.js
// Search functions for Review mode - search by customer, city, etc.
// UPDATED: goToClientFromSearch() now uses await for saveState and setPeriodCollapsed

/* =========================
   Search Index Building
========================= */

function buildReviewSearchIndex() {
  const rows = [];

  (appState.groups || []).forEach((gr) => {
    const gName = gr?.name ?? "Group";
    const gArchived = gr?.archived === true;
    const periods = gr?.data?.periods || [];

    periods.forEach((p) => {
      const from = formatDateLocal(p?.from) || "—";
      const to = formatDateLocal(p?.to) || "—";

      (p?.rows || []).forEach((r) => {
        const customer = (r?.customer ?? "").toString().trim();
        const city = (r?.city ?? "").toString().trim();
        if (!customer && !city) return;

        rows.push({
          groupId: gr.id,
          periodId: p.id,
          rowId: r.id,
          group: gName,
          groupArchived: gArchived,
          from,
          to,
          customer,
          city,
          gross: fmt(parseMoney(r?.gross)),
          net: fmt(parseMoney(r?.net)),
          status: ["done", "fail", "fixed"].includes(r?.done) ? r.done : "none",
        });
      });
    });
  });

  return rows;
}

/* =========================
   Highlight Match in Text
========================= */

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);

  const safe = escapeHtml(text);
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reg = new RegExp(`(${escapedQuery})`, "ig");

  return safe.replace(reg, `<mark class="search-highlight">$1</mark>`);
}

/* =========================
   Go to Client from Search Result
========================= */

async function goToClientFromSearch(item) {
  if (!item) return;

  appState.activeGroupId = item.groupId;
  await saveState();

  await setPeriodCollapsed(item.periodId, false);
  setMode("edit");
  render();

  requestAnimationFrame(() => {
    const periodEl = document.querySelector(`.period[data-period-id="${item.periodId}"]`);
    const rowEl = document.querySelector(`tr[data-row-id="${item.rowId}"]`);

    if (periodEl) {
      periodEl.classList.remove("is-collapsed");
    }

    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
      rowEl.classList.add("row-highlight");

      setTimeout(() => {
        rowEl.classList.remove("row-highlight");
      }, 1800);
    }
  });
}

/* =========================
   Render Search Results
========================= */

function renderSearchResults(list, query, resultsEl) {
  const limited = list.slice(0, 40);

  if (!limited.length) {
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `<div class="review-search-empty">No results</div>`;
    return;
  }

  resultsEl.style.display = "block";
  resultsEl.innerHTML = limited.map(x => `
    <div class="review-search-item">
      <div class="review-search-name-row">
        <div class="review-search-name">${x.groupArchived ? '📦 ' : ''}${highlightMatch(x.customer || "Client", query)}</div>
        ${
          x.status === "done"
            ? `<span class="search-status search-status-done">Done</span>`
            : x.status === "fail"
            ? `<span class="search-status search-status-fail">Fail</span>`
            : x.status === "fixed"
            ? `<span class="search-status search-status-fixed">Fixed</span>`
            : ``
        }
      </div>

      <div class="review-search-meta">
        <span><b>Group:</b> ${x.groupArchived ? '📦 ' : ''}${escapeHtml(x.group)}</span>
        <span><b>Period:</b> ${escapeHtml(x.from)} → ${escapeHtml(x.to)}</span>
        <span><b>City:</b> ${highlightMatch(x.city || "—", query)}</span>
        <span><b>Gross:</b> ${escapeHtml(x.gross)}</span>
        <span><b>Net:</b> ${escapeHtml(x.net)}</span>
      </div>
    </div>
  `).join("");

  bindSearchResultClicks(limited, resultsEl);
}

/* =========================
   Bind Click Events to Search Results
========================= */

function bindSearchResultClicks(list, resultsEl) {
  const items = resultsEl.querySelectorAll(".review-search-item");

  items.forEach((el, index) => {
    const item = list[index];
    if (!item) return;

    el.style.cursor = "pointer";

    el.onclick = async () => {
      const ok = await askConfirm(
        "Open this client in Edit mode?",
        "Open client",
        { type: "primary", okText: "Open" }
      );

      if (!ok) return;

      const searchEl = document.getElementById("reviewSearch");
      if (searchEl) {
        searchEl.value = "";
      }
      resultsEl.style.display = "none";
      resultsEl.innerHTML = "";

      await goToClientFromSearch(item);
    };
  });
}

/* =========================
   Clear Search
========================= */

function clearSearch(searchEl, resultsEl) {
  if (searchEl) searchEl.value = "";
  if (resultsEl) {
    resultsEl.style.display = "none";
    resultsEl.innerHTML = "";
  }
}

/* =========================
   Initialize Review Search
========================= */

let reviewSearchOutsideHandlerAttached = false;

function initReviewSearch() {
  const searchEl = document.getElementById("reviewSearch");
  const resultsEl = document.getElementById("reviewSearchResults");

  if (!searchEl || !resultsEl) return;

  const index = buildReviewSearchIndex();

  const hide = () => {
    resultsEl.style.display = "none";
    resultsEl.innerHTML = "";
  };

  const clear = () => {
    searchEl.value = "";
    hide();
  };

  const handleSearch = () => {
    const q = searchEl.value.trim().toLowerCase();
    if (!q) {
      hide();
      return;
    }

    const filtered = index.filter(x =>
      (x.customer || "").toLowerCase().includes(q) ||
      (x.city || "").toLowerCase().includes(q)
    );

    renderSearchResults(filtered, q, resultsEl);
  };

  searchEl.oninput = handleSearch;

  searchEl.onkeydown = (e) => {
    if (e.key === "Escape") clear();
  };

  if (!reviewSearchOutsideHandlerAttached) {
    reviewSearchOutsideHandlerAttached = true;

    document.addEventListener("pointerdown", (e) => {
      const wrap = document.querySelector(".review-search");
      const currentSearch = document.getElementById("reviewSearch");
      const currentResults = document.getElementById("reviewSearchResults");
      if (!wrap || !currentSearch || !currentResults) return;
      if (wrap.contains(e.target)) return;

      currentSearch.value = "";
      currentResults.style.display = "none";
      currentResults.innerHTML = "";
    }, { passive: true });
  }
}

/* =========================
   Refresh Search Index (call when data changes)
========================= */

function refreshSearchIndex() {
  const searchEl = document.getElementById("reviewSearch");
  const resultsEl = document.getElementById("reviewSearchResults");
  
  if (!searchEl || !resultsEl) return;
  
  const newIndex = buildReviewSearchIndex();
  
  // If there's an active search query, re-run it
  const currentQuery = searchEl.value.trim().toLowerCase();
  if (currentQuery) {
    const filtered = newIndex.filter(x =>
      (x.customer || "").toLowerCase().includes(currentQuery) ||
      (x.city || "").toLowerCase().includes(currentQuery)
    );
    renderSearchResults(filtered, currentQuery, resultsEl);
  }
}