// 12-calc-totals.js
// Pure calculation of financial totals

function calcPeriodTotals(period, ratePercent) {
  const rows = period?.rows || [];
  const rate = clampRate(ratePercent) / 100;

  let gross = 0;
  let net = 0;
  let my = 0;

  rows.forEach((r) => {
    const grossRaw = String(r?.gross ?? "").trim();
    const netRaw = String(r?.net ?? "").trim();

    const hasGross = grossRaw !== "";
    const hasNet = netRaw !== "";

    // ორივე ცარიელია → საერთოდ skip
    if (!hasGross && !hasNet) return;

    const grossVal = hasGross ? parseMoney(grossRaw) : 0;
    const netVal = hasNet ? parseMoney(netRaw) : 0;

    if (Number.isFinite(grossVal)) gross += grossVal;
    if (Number.isFinite(netVal)) net += netVal;

    // My €
    let base = 0;
    if (hasNet && Number.isFinite(netVal)) {
      base = netVal;
    } else if (hasGross && Number.isFinite(grossVal)) {
      base = grossVal;
    }

    my += base * rate;
  });

  return { gross, net, my };
}

function calcEditPeriodMyOnly(period, ratePercent) {
  const rows = period?.rows || [];
  const rate = clampRate(ratePercent) / 100;

  let my = 0;

  rows.forEach((r) => {
    const grossRaw = String(r?.gross ?? "").trim();
    const netRaw = String(r?.net ?? "").trim();

    const hasGross = grossRaw !== "";
    const hasNet = netRaw !== "";

    if (!hasGross && !hasNet) return;

    const grossVal = hasGross ? parseMoney(grossRaw) : 0;
    const netVal = hasNet ? parseMoney(netRaw) : 0;

    let base = 0;
    if (hasNet && Number.isFinite(netVal)) {
      base = netVal;
    } else if (hasGross && Number.isFinite(grossVal)) {
      base = grossVal;
    }

    my += base * rate;
  });

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