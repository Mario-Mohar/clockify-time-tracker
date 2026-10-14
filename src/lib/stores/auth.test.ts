import { describe, it, expect, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { auth, currentWorkspace } from './auth';

// Nur gefälschtes fetch, nie die echte API.
afterEach(() => {
  vi.unstubAllGlobals();
  auth.logout();
});

describe('auth.setApiKey (#34)', () => {
  it('fragt im aktiven Workspace ab, nicht im ersten', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const path = new URL(String(input)).pathname;
        const body = path.endsWith('/user')
          ? { id: 'u1', email: 'test@example.com', name: 'Test', activeWorkspace: 'w2', defaultWorkspace: 'w1' }
          : [
              { id: 'w1', name: 'Erster' },
              { id: 'w2', name: 'Aktiver' },
            ];
        return new Response(JSON.stringify(body), { status: 200 });
      })
    );

    expect(await auth.setApiKey('test-key')).toBe(true);
    expect(get(currentWorkspace)?.id).toBe('w2');
  });

  it('meldet einen Fehler, wenn es keinen Workspace gibt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const path = new URL(String(input)).pathname;
        const body = path.endsWith('/user')
          ? { id: 'u1', email: 'test@example.com', name: 'Test', activeWorkspace: 'w1' }
          : [];
        return new Response(JSON.stringify(body), { status: 200 });
      })
    );

    expect(await auth.setApiKey('test-key')).toBe(false);
    expect(get(auth).error).toMatch(/Workspace/);
  });
});
