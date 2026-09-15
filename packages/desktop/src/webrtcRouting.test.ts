import { describe, expect, it } from 'vitest';
import {
  needsMacOs27VpnRoutingWorkaround,
  withVpnNetworkCostFieldTrial,
} from './webrtcRouting';

describe('macOS 27 VPN WebRTC routing workaround', () => {
  it('is enabled only on Darwin 26 and newer', () => {
    expect(needsMacOs27VpnRoutingWorkaround('darwin', '26.0.0')).toBe(true);
    expect(needsMacOs27VpnRoutingWorkaround('darwin', '27.1.0')).toBe(true);
    expect(needsMacOs27VpnRoutingWorkaround('darwin', '25.6.0')).toBe(false);
    expect(needsMacOs27VpnRoutingWorkaround('linux', '26.0.0')).toBe(false);
    expect(needsMacOs27VpnRoutingWorkaround('win32', '26.0.0')).toBe(false);
    expect(needsMacOs27VpnRoutingWorkaround('darwin', 'invalid')).toBe(false);
  });

  it('adds the VPN cost trial while preserving unrelated trials', () => {
    expect(withVpnNetworkCostFieldTrial('OtherTrial/Enabled/')).toBe(
      'OtherTrial/Enabled/WebRTC-AddNetworkCostToVpn/Enabled/',
    );
  });

  it('replaces an existing group instead of duplicating the trial', () => {
    expect(withVpnNetworkCostFieldTrial(
      'WebRTC-AddNetworkCostToVpn/Disabled/OtherTrial/Control/',
    )).toBe('OtherTrial/Control/WebRTC-AddNetworkCostToVpn/Enabled/');
  });
});
