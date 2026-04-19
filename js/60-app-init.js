// 60-app-init.js
// Async app startup, service worker, splash screen

/* =========================
   Global reference for async initialization
========================= */

let appInitialized = false;
const appChromeBoot = {
  theme: false,
  controls: false,
  workspace: false,
  summary: false,
  menu: false,
  pin: false,
  status: false
};

async function ensureAppChromeInitialized() {
  if (!appChromeBoot.theme) {
    await initThemeAsync();
    appChromeBoot.theme = true;
  }

  if (!appChromeBoot.controls) {
    await initControlsToggleAsync();
    appChromeBoot.controls = true;
  }

  if (!appChromeBoot.workspace) {
    initWorkspaceSwitch();
    appChromeBoot.workspace = true;
  }

  if (!appChromeBoot.summary) {
    initSummaryPanel();
    appChromeBoot.summary = true;
  }

  if (!appChromeBoot.menu) {
    initTopMenu();
    appChromeBoot.menu = true;
  }

  if (!appChromeBoot.pin) {
    await initPinLockAsync();
    appChromeBoot.pin = true;
  }

  if (!appChromeBoot.status) {
    initStatusBadgeActions();
    appChromeBoot.status = true;
  }
}

/* =========================
   Async App Initialization
========================= */

async function initApp() {
  try {
    // 1. Open IndexedDB
    await openDb();

    // 2. Load app state from IndexedDB
    appState = await loadState();

    // 3. Initialize UI chrome/hooks
    await ensureAppChromeInitialized();

    // 10. Set UI mode
    await setMode(appState.uiMode || "review");
    
    // 10.5 Finalize previous day cloud history if needed
if (typeof window.__firebaseReady?.then === "function") {
  try {
    await window.__firebaseReady;
  } catch (e) {
    // local-only mode is allowed
  }
}

if (typeof finalizePendingHistoryDayIfNeeded === "function" && window.__db) {
  await finalizePendingHistoryDayIfNeeded();
}

    // 11. Show backup reminder if needed
    setTimeout(async () => {
      const shouldShow = await shouldShowBackupReminder();
      if (shouldShow) {
        showBackupReminderPopup();
      }
    }, 250);

    appInitialized = true;

  } catch (error) {
    console.error("App initialization failed:", error);
    appState = appState && Array.isArray(appState.groups) ? appState : defaultAppState();
    try {
      await ensureAppChromeInitialized();
    } catch (initError) {
      console.error("Fallback UI initialization failed:", initError);
    }
    await setMode(appState.uiMode || "review");
  }

  // Remove splash screen after init
  requestAnimationFrame(() => {
    document.body.classList.remove("booting");
  });
}

/* =========================
   Splash Screen Removal
========================= */

window.addEventListener("load", () => {
  const splash = document.getElementById("splash");

  setTimeout(() => {
    splash?.classList.add("splash-hide");

    document.documentElement.classList.remove("app-preload");
    document.documentElement.classList.add("app-ready");
    document.documentElement.classList.add("ready");

    setTimeout(() => {
      splash?.remove();
    }, 450);
  }, 700);
});

/* =========================
   Service Worker (PWA)
========================= */

if ("serviceWorker" in navigator) {
  let userAcceptedUpdate = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (userAcceptedUpdate) {
      window.location.reload();
    }
  });

  navigator.serviceWorker
    .register("./service-worker.js")
    .then((reg) => {
      const showUpdateBar = (worker) => {
        const bar = document.getElementById("updateBar");
        const btn = document.getElementById("updateBtn");
        const exportBtn = document.getElementById("updateExportBtn");

        if (bar) bar.style.display = "flex";

        if (exportBtn) {
          exportBtn.onclick = () => {
            handleExportJson();
          };
        }

        if (btn) {
          btn.disabled = false;
          btn.textContent = "Update";

          btn.onclick = () => {
  const waitingWorker = reg.waiting;

  if (!waitingWorker) {
    if (bar) bar.style.display = "none";
    window.location.reload();
    return;
  }

  userAcceptedUpdate = true;
  btn.disabled = true;
  btn.textContent = "Updating...";
  if (bar) bar.style.display = "none";

  waitingWorker.postMessage({ action: "skipWaiting" });
};
        }
      };

      if (reg.waiting) {
        showUpdateBar(reg.waiting);
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdateBar(reg.waiting);
          }
        });
      });
    })
    .catch((error) => {
      console.error("Service worker registration failed:", error);
    });
}

/* =========================
   PWA Install Prompt
========================= */

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;

  const installBar = document.getElementById("installBar");
  const installBtn = document.getElementById("installBtn");
  const installCloseBtn = document.getElementById("installCloseBtn");

  if (installBar) installBar.style.display = "flex";

  if (installCloseBtn) {
    installCloseBtn.onclick = () => {
      if (installBar) installBar.style.display = "none";
    };
  }

  if (installBtn) {
    installBtn.onclick = async () => {
      if (!deferredInstallPrompt) return;

      deferredInstallPrompt.prompt();
      try {
        await deferredInstallPrompt.userChoice;
      } catch (err) {}

      deferredInstallPrompt = null;
      if (installBar) installBar.style.display = "none";
    };
  }
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;

  const installBar = document.getElementById("installBar");
  if (installBar) installBar.style.display = "none";
});

/* =========================
   START THE APP
========================= */

// Launch async initialization
initApp();
