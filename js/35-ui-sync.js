// 35-ui-sync.js
// Centralized UI sync helpers

function refreshUiChrome() {
  setControlsForMode(appState.uiMode);
  updateGrandToggleUI();
  updateWorkspaceSwitchUI();
  renderGroupSelect();
  updateControlsButtonLabel();

  document.documentElement.classList.toggle(
    "is-edit",
    appState.uiMode === "edit"
  );

  updateFloatingAddClientVisibility();
}

async function refreshFullUiState() {
  refreshUiChrome();
  await updateAfterGlobalChange();
}