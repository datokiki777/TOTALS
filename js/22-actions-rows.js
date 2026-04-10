// 22-actions-rows.js
// Row-level actions (add, remove) + addClientToLastPeriod

async function addClientToLastPeriod() {
  const g = activeGroup();
  const periods = g?.data?.periods || [];
  if (!periods.length) return;

  const last = periods[periods.length - 1];

  last.rows.push(emptyRow());

  // 🔥 FIX: გახსენი period სანამ render გავა
  await setPeriodCollapsed(last.id, false);

  await saveState();
  render();

  // 🔥 UX: დაასკროლე ახალ row-ზე
  setTimeout(() => {
    const periodEl = document.querySelector(`.period[data-period-id="${last.id}"]`);
    if (!periodEl) return;

    periodEl.classList.remove("is-collapsed");

    const rows = periodEl.querySelectorAll("tr");
    const lastRow = rows[rows.length - 1];

    if (lastRow) {
      lastRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 80);
}

// Individual row removal logic is inside render() because it needs DOM access.
// But you can later extract it here if you move all row event binding to a separate module.