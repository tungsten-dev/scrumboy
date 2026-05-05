import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('apiFetch', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('passes string bodies through to fetch unchanged', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const { apiFetch } = await import('./api.js');
    const raw = '{"id":"board-raw","name":"Raw Trello"}';
    await apiFetch('/api/import/trello/preview', {
      method: 'POST',
      body: raw,
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/import/trello/preview', {
      method: 'POST',
      body: raw,
      headers: {
        'Content-Type': 'application/json',
        'X-Scrumboy': '1',
      },
    });
  });
});
