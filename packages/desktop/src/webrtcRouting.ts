export const VPN_NETWORK_COST_TRIAL = 'WebRTC-AddNetworkCostToVpn';

/**
 * macOS 27 is Darwin 26. Keep the workaround scoped to the affected platform
 * generation until Chromium/WebRTC or macOS fixes route classification.
 */
export function needsMacOs27VpnRoutingWorkaround(platform: string, kernelRelease: string): boolean {
  if (platform !== 'darwin') return false;
  const darwinMajor = Number.parseInt(kernelRelease.split('.')[0] ?? '', 10);
  return Number.isFinite(darwinMajor) && darwinMajor >= 26;
}

/**
 * Enable libwebrtc's built-in VPN network cost without discarding field trials
 * supplied by an administrator or a developer on the command line.
 */
export function withVpnNetworkCostFieldTrial(existing: string): string {
  const entries = existing.split('/').filter(Boolean);
  const retained: string[] = [];

  for (let index = 0; index < entries.length; index += 2) {
    const name = entries[index];
    const group = entries[index + 1];
    if (!name || !group || name === VPN_NETWORK_COST_TRIAL) continue;
    retained.push(name, group);
  }

  retained.push(VPN_NETWORK_COST_TRIAL, 'Enabled');
  return `${retained.join('/')}/`;
}
