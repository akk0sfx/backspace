export type NetworkResetStep =
  | 'proxy-config'
  | 'host-resolver-cache'
  | 'connections';

export interface NetworkSessionResetter {
  forceReloadProxyConfig(): Promise<void>;
  clearHostResolverCache(): Promise<void>;
  closeAllConnections(): Promise<void>;
}

export interface NetworkResetFailure {
  step: NetworkResetStep;
  error: unknown;
}

/**
 * Refresh Chromium's network state after a VPN/proxy transition.
 *
 * VPNs that implement synthetic DNS can leave Chromium holding an address that
 * is only routable while the tunnel exists. Reloading a page does not flush the
 * host resolver or pooled sockets, so recovery must reset all three layers
 * before navigating again. Every step is best-effort: one unsupported/failing
 * reset must not prevent the remaining cleanup or the user's reload.
 */
export async function resetNetworkSession(
  networkSession: NetworkSessionResetter,
): Promise<NetworkResetFailure[]> {
  const failures: NetworkResetFailure[] = [];
  const steps: Array<[NetworkResetStep, () => Promise<void>]> = [
    ['proxy-config', () => networkSession.forceReloadProxyConfig()],
    ['host-resolver-cache', () => networkSession.clearHostResolverCache()],
    ['connections', () => networkSession.closeAllConnections()],
  ];

  for (const [step, reset] of steps) {
    try {
      await reset();
    } catch (error) {
      failures.push({ step, error });
    }
  }

  return failures;
}
