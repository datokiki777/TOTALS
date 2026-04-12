// 05-utils-core.js
// Pure utilities without date or business logic

function uuid() {
  return crypto?.randomUUID?.() ?? `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function fmt(n) {
  const v = Number.isFinite(n) ? n : 0;
  const rounded = Math.round(v); // ← მთავარი

  return rounded.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function animateNumber(el, to, duration = 380) {
  if (!el) return;

  const target = Number(to) || 0;
  const prev = Number(el.dataset.value || 0);

  if (Math.abs(target - prev) < 0.01) {
    el.textContent = fmt(target);
    el.dataset.value = String(target);
    return;
  }

  const start = performance.now();

  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = prev + (target - prev) * eased;

    el.textContent = fmt(current);

    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = fmt(target);
      el.dataset.value = String(target);
    }
  }

  requestAnimationFrame(step);
}

function parseMoney(value) {
  if (value === null || value === undefined) return NaN;

  let s = String(value).trim();

  if (!s) return NaN;

  // წაშალე space-ები
  s = s.replace(/\s/g, "");

  // თუ ორივე არის , და .
  if (s.includes(",") && s.includes(".")) {
    // განსაზღვრე ბოლო separator (decimal)
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      // ევროპული ფორმატი: 1.234,56
      s = s.replace(/\./g, "");
      s = s.replace(",", ".");
    } else {
      // ამერიკული: 1,234.56
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    // მარტო მძიმეა
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      // decimal: 123,45
      s = s.replace(",", ".");
    } else {
      // ათასის გამყოფი: 1,234
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(".")) {
    const parts = s.split(".");

    if (parts.length > 2) {
      // 1.234.567 → remove all dots
      s = s.replace(/\./g, "");
    } else if (parts.length === 2 && parts[1].length === 3) {
      // 1.234 → thousands separator
      s = s.replace(".", "");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function sanitizeIntegerMoneyInput(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeMoneyToStoredInteger(value) {
  if (value === null || value === undefined) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const n = parseMoney(raw);
  if (!Number.isFinite(n)) return "";

  return String(Math.round(n));
}

function clampRate(percent) {
  let p = Number(percent);
  if (!Number.isFinite(p)) p = 0;
  if (p < 0) p = 0;
  if (p > 100) p = 100;
  return p;
}

function safeFileName(name) {
  return (name || "group").toString().trim().replace(/[^\w\-]+/g, "_");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}