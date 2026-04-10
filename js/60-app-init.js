// 60-app-init.js
// Async app startup, service worker, splash screen

/* =========================
   Global reference for async initialization
========================= */

let appInitialized = false;

/* =========================
   Async App Initialization
========================= */

async function initApp() {
  try {
    // 1. Open IndexedDB
    await openDb();
    
    // 2. Migrate from localStorage if needed
    const migrated = await migrateFromLocalStorage();
    if (migrated) {
      console.log("Migration completed successfully");
    }
    
    // 3. Load app state from IndexedDB
    appState = await loadState();
    
    // 4. Initialize theme (async)
    await initThemeAsync();
    
    // 5. Initialize controls toggle (async)
    await initControlsToggleAsync();
    
    // 6. Initialize workspace switch
    initWorkspaceSwitch();
    
    // 7. Initialize summary panel
    initSummaryPanel();
    
    // 8. Initialize top menu
    initTopMenu();
    
    // 9. Initialize PIN lock
    await initPinLockAsync();
    
    // 10. Initialize status badge actions
    initStatusBadgeActions();
    
    // 11. Set UI mode
      await setMode(appState.uiMode || "review");
    
    // 12. Show backup reminder if needed
    setTimeout(async () => {
      const shouldShow = await shouldShowBackupReminder();
      if (shouldShow) {
        showBackupReminderPopup();
      }
    }, 250);
    
    appInitialized = true;
    
  } catch (error) {
    console.error("App initialization failed:", error);
    appState = defaultAppState();
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
            if (!worker) {
              if (bar) bar.style.display = "none";
              window.location.reload();
              return;
            }

            userAcceptedUpdate = true;
            btn.disabled = true;
            btn.textContent = "Updating...";
            if (bar) bar.style.display = "none";
            worker.postMessage({ action: "skipWaiting" });
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
            showUpdateBar(reg.waiting || newWorker);
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