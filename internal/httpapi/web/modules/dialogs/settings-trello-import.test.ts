// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();

vi.mock('../api.js', () => ({
  apiFetch: apiFetchMock,
}));

vi.mock('../members-cache.js', () => ({
  fetchProjectMembers: vi.fn(),
}));

vi.mock('../utils.js', () => ({
  escapeHTML: (s: string) =>
    String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;'),
  showToast: vi.fn(),
  getAppVersion: () => 'test-version',
  showConfirmDialog: vi.fn(),
  confirmDelete: vi.fn(),
  isAnonymousBoard: () => false,
  renderUserAvatar: () => '',
  processImageFile: vi.fn(),
  renderAvatarContent: () => '',
  sanitizeHexColor: (color?: string | null, fallback?: string | null) => color ?? fallback ?? null,
}));

vi.mock('../theme.js', () => ({
  getStoredTheme: () => 'system',
  handleThemeChange: vi.fn(),
  THEME_SYSTEM: 'system',
  THEME_DARK: 'dark',
  THEME_LIGHT: 'light',
}));

vi.mock('../wallpaper.js', () => ({
  getStoredWallpaperState: () => ({ mode: 'off' }),
  setWallpaperOff: vi.fn(),
  setWallpaperColor: vi.fn(),
  uploadWallpaperImage: vi.fn(),
}));

vi.mock('../charts/burndown.js', () => ({
  renderRealBurndownChart: () => '<div></div>',
  destroyBurndownChart: vi.fn(),
  mountBurndownChart: vi.fn(),
}));

vi.mock('../events.js', () => ({
  emit: vi.fn(),
}));

vi.mock('../sprints.js', () => ({
  normalizeSprints: (value: unknown) => value,
}));

vi.mock('../core/keybindings.js', () => ({
  KEY_ACTION_LIST: [],
  chordFromKeyboardEvent: vi.fn(),
  formatChordForDisplay: () => '',
  getResolvedChordForAction: () => '',
  isTypingInTextField: () => false,
  reloadKeybindingsFromStorage: vi.fn(),
  saveKeybindingOverride: vi.fn(),
  setKeybindingsCaptureListening: vi.fn(),
}));

vi.mock('../core/assignmentNotify.js', () => ({
  requestDesktopNotificationPermission: vi.fn(),
  getDesktopNotificationStatusDescription: () => '',
}));

vi.mock('../core/push.js', () => ({
  isPushSubscribed: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
}));

vi.mock('../core/voiceflow-preferences.js', () => ({
  getVoiceFlowEnabledPreference: () => false,
  setVoiceFlowEnabledPreference: vi.fn(),
}));

vi.mock('./settings-workflow.js', () => ({
  bindWorkflowTabInteractions: vi.fn(),
  clearWorkflowDraftState: vi.fn(),
  invalidateWorkflowLaneCountsCache: vi.fn(),
  isWorkflowDraftDirty: () => false,
  loadWorkflowTabContent: () => '',
  resetWorkflowDraftToBaseline: vi.fn(),
}));

vi.mock('./settings-tags.js', () => ({
  bindTagTabInteractions: vi.fn(),
  invalidateTagsCache: vi.fn(),
  loadTagSettingsContent: vi.fn().mockResolvedValue(''),
}));

vi.mock('./settings-sprints.js', () => ({
  bindSprintsTabInteractions: vi.fn(),
  renderSprintsTabContent: vi.fn().mockResolvedValue(''),
}));

function installBaseDOM(): void {
  document.body.innerHTML = `
    <dialog id="settingsDialog"></dialog>
    <button id="closeSettingsBtn" type="button"></button>
  `;
}

async function loadSettingsModule() {
  const mod = await import('./settings.js');
  return mod;
}

async function loadStateMutations() {
  const mod = await import('../state/mutations.js');
  return mod;
}

describe('settings-trello-import', () => {
  beforeEach(() => {
    vi.resetModules();
    installBaseDOM();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the Trello import section and only enables import after a clean preview', async () => {
    const mod = await loadSettingsModule();
    const mutations = await loadStateMutations();

    document.body.innerHTML += mod.renderBackupTabHTML();
    const previewBtn = document.getElementById('trelloImportPreviewBtn');
    const importBtn = document.getElementById('trelloImportBtn');
    if (!(previewBtn instanceof HTMLButtonElement)) throw new Error('missing preview button');
    if (!(importBtn instanceof HTMLButtonElement)) throw new Error('missing import button');
    mutations.setTrelloImportBtn(importBtn);

    mod.updateTrelloImportUI();
    expect(previewBtn.disabled).toBe(true);
    expect(importBtn.disabled).toBe(true);

    mutations.setTrelloImportData('{"name":"board"}');
    mod.updateTrelloImportUI();
    expect(previewBtn.disabled).toBe(false);
    expect(importBtn.disabled).toBe(true);

    mutations.setTrelloImportPreview({
      boardName: 'Board',
      openLists: 2,
      closedLists: 1,
      cards: 3,
      archivedCards: 1,
      labels: 2,
      membersReferenced: 1,
      checklists: 1,
      checklistItems: 2,
      commentCardActions: 1,
      attachments: 1,
      customFieldItems: 1,
      detectedDoneColumn: 'Done',
      detectedDoneReason: 'matched done name',
      hardErrors: ['Too many lists'],
      warnings: ['Comments may be incomplete'],
    });
    mod.updateTrelloImportUI();
    expect(importBtn.disabled).toBe(true);

    mutations.setTrelloImportPreview({
      boardName: 'Board',
      openLists: 2,
      closedLists: 1,
      cards: 3,
      archivedCards: 1,
      labels: 2,
      membersReferenced: 1,
      checklists: 1,
      checklistItems: 2,
      commentCardActions: 1,
      attachments: 1,
      customFieldItems: 1,
      detectedDoneColumn: 'Done',
      detectedDoneReason: 'matched done name',
      hardErrors: [],
      warnings: ['Comments may be incomplete'],
    });
    mod.updateTrelloImportUI();
    expect(importBtn.disabled).toBe(false);
  });

  it('renders Trello preview, warnings, and import result details', async () => {
    const mod = await loadSettingsModule();

    document.body.innerHTML += mod.renderBackupTabHTML();
    mod.renderTrelloPreview({
      boardName: 'Sanitized Board',
      openLists: 2,
      closedLists: 1,
      cards: 3,
      archivedCards: 1,
      labels: 2,
      membersReferenced: 2,
      checklists: 1,
      checklistItems: 3,
      commentCardActions: 2,
      attachments: 1,
      customFieldItems: 1,
      detectedDoneColumn: 'Done',
      detectedDoneReason: 'rightmost open list',
      hardErrors: [],
      warnings: ['Attachments import as links only'],
    });
    mod.renderTrelloWarnings({
      boardName: 'Sanitized Board',
      openLists: 2,
      closedLists: 1,
      cards: 3,
      archivedCards: 1,
      labels: 2,
      membersReferenced: 2,
      checklists: 1,
      checklistItems: 3,
      commentCardActions: 2,
      attachments: 1,
      customFieldItems: 1,
      detectedDoneColumn: 'Done',
      detectedDoneReason: 'rightmost open list',
      hardErrors: ['Missing list id list-x'],
      warnings: ['Attachments import as links only'],
    });
    mod.renderTrelloImportResult({
      project: {
        id: 7,
        name: 'Sanitized Board',
        slug: 'sanitized-board',
      },
      summary: {
        projects: 1,
        todos: 3,
        labels: 2,
        openLists: 2,
        closedLists: 1,
        archivedCards: 1,
        checklists: 1,
        checklistItems: 3,
        commentCardActions: 2,
        attachments: 1,
        customFieldItems: 1,
      },
      warnings: ['Attachments import as links only'],
    });

    expect(document.getElementById('trelloImportPreview')?.textContent).toContain('Sanitized Board');
    expect(document.getElementById('trelloImportPreview')?.textContent).toContain('Done');
    expect(document.getElementById('trelloImportWarnings')?.textContent).toContain('Hard errors');
    expect(document.getElementById('trelloImportWarnings')?.textContent).toContain('Attachments import as links only');

    const resultEl = document.getElementById('trelloImportResult');
    const link = resultEl?.querySelector('a');
    expect(resultEl?.textContent).toContain('Import complete');
    expect(link?.getAttribute('href')).toBe('/sanitized-board');
  });

  it('sends the exact raw Trello JSON string to preview and import endpoints', async () => {
    const mod = await loadSettingsModule();
    const mutations = await loadStateMutations();
    const raw = '{"id":"board-raw","name":"Raw Trello"}';

    document.body.innerHTML += mod.renderBackupTabHTML();
    const importBtn = document.getElementById('trelloImportBtn');
    if (!(importBtn instanceof HTMLButtonElement)) throw new Error('missing import button');
    mutations.setTrelloImportBtn(importBtn);
    mutations.setTrelloImportData(raw);

    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValueOnce({
      boardName: 'Raw Trello',
      openLists: 1,
      closedLists: 0,
      cards: 1,
      archivedCards: 0,
      labels: 0,
      membersReferenced: 0,
      checklists: 0,
      checklistItems: 0,
      commentCardActions: 0,
      attachments: 0,
      customFieldItems: 0,
      detectedDoneColumn: 'Done',
      detectedDoneReason: 'Synthesized a Done column because the Trello board has only one open list.',
      hardErrors: [],
      warnings: [],
    });
    await mod.handleTrelloPreview();
    expect(apiFetchMock).toHaveBeenCalledWith('/api/import/trello/preview', {
      method: 'POST',
      body: raw,
    });

    apiFetchMock.mockReset();
    mutations.setTrelloImportPreview({
      boardName: 'Raw Trello',
      openLists: 1,
      closedLists: 0,
      cards: 1,
      archivedCards: 0,
      labels: 0,
      membersReferenced: 0,
      checklists: 0,
      checklistItems: 0,
      commentCardActions: 0,
      attachments: 0,
      customFieldItems: 0,
      detectedDoneColumn: 'Done',
      detectedDoneReason: 'Synthesized a Done column because the Trello board has only one open list.',
      hardErrors: [],
      warnings: [],
    });
    apiFetchMock.mockResolvedValueOnce({
      project: { id: 1, name: 'Raw Trello', slug: 'raw-trello' },
      summary: {
        projects: 1,
        todos: 1,
        labels: 0,
        openLists: 1,
        closedLists: 0,
        archivedCards: 0,
        checklists: 0,
        checklistItems: 0,
        commentCardActions: 0,
        attachments: 0,
        customFieldItems: 0,
      },
      warnings: [],
    });
    await mod.handleTrelloImport();
    expect(apiFetchMock).toHaveBeenCalledWith('/api/import/trello', {
      method: 'POST',
      body: raw,
    });
  });
});
