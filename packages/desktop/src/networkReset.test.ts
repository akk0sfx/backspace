import { describe, expect, it, vi } from 'vitest';
import { resetNetworkSession, type NetworkSessionResetter } from './networkReset';

function makeSession(overrides: Partial<NetworkSessionResetter> = {}): NetworkSessionResetter {
  return {
    forceReloadProxyConfig: vi.fn().mockResolvedValue(undefined),
    clearHostResolverCache: vi.fn().mockResolvedValue(undefined),
    closeAllConnections: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('resetNetworkSession', () => {
  it('resets proxy, DNS, and pooled connections in order', async () => {
    const calls: string[] = [];
    const networkSession = makeSession({
      forceReloadProxyConfig: vi.fn(async () => { calls.push('proxy-config'); }),
      clearHostResolverCache: vi.fn(async () => { calls.push('host-resolver-cache'); }),
      closeAllConnections: vi.fn(async () => { calls.push('connections'); }),
    });

    await expect(resetNetworkSession(networkSession)).resolves.toEqual([]);
    expect(calls).toEqual(['proxy-config', 'host-resolver-cache', 'connections']);
  });

  it('continues after a failed step and reports only that failure', async () => {
    const dnsError = new Error('resolver reset failed');
    const networkSession = makeSession({
      clearHostResolverCache: vi.fn().mockRejectedValue(dnsError),
    });

    const failures = await resetNetworkSession(networkSession);

    expect(networkSession.forceReloadProxyConfig).toHaveBeenCalledOnce();
    expect(networkSession.clearHostResolverCache).toHaveBeenCalledOnce();
    expect(networkSession.closeAllConnections).toHaveBeenCalledOnce();
    expect(failures).toEqual([{ step: 'host-resolver-cache', error: dnsError }]);
  });
});
