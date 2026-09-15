import { describe, expect, it } from 'vitest';
import {
  extractIceRoute,
  findActiveCandidatePair,
  packetDelta,
  packetLossPercent,
  type StatsReportLike,
} from './webrtcStats';

function report(...entries: Array<Record<string, any>>): StatsReportLike {
  const records = new Map(entries.map((entry) => [entry.id, entry]));
  return {
    get: (id) => records.get(id),
    forEach: (callback) => records.forEach(callback),
  };
}

describe('ICE route diagnostics', () => {
  it('uses the transport-selected pair and reports both endpoints', () => {
    const reports = report(
      { id: 'transport', type: 'transport', selectedCandidatePairId: 'selected' },
      {
        id: 'selected', type: 'candidate-pair', currentRoundTripTime: 0.081,
        localCandidateId: 'local', remoteCandidateId: 'remote',
        bytesReceived: 10, bytesSent: 20,
      },
      { id: 'busy-but-not-selected', type: 'candidate-pair', bytesReceived: 1000, bytesSent: 2000 },
      {
        id: 'local', type: 'local-candidate', address: '192.168.31.215', port: 54321,
        protocol: 'tcp', candidateType: 'host', networkType: 'wifi',
      },
      {
        id: 'remote', type: 'remote-candidate', ip: '72.56.34.181', port: 7881,
        protocol: 'tcp', candidateType: 'host',
      },
    );

    expect(extractIceRoute(reports)).toEqual({
      ping: 81,
      serverAddress: '72.56.34.181',
      serverPort: 7881,
      protocol: 'tcp',
      candidateType: 'host',
      localAddress: '192.168.31.215',
      localPort: 54321,
      localCandidateType: 'host',
      networkType: 'wifi',
      relayProtocol: null,
    });
  });

  it('falls back to the candidate pair carrying the most data', () => {
    const reports = report(
      { id: 'idle', type: 'candidate-pair', state: 'succeeded', bytesReceived: 1 },
      { id: 'active', type: 'candidate-pair', state: 'succeeded', bytesReceived: 500 },
    );

    expect(findActiveCandidatePair(reports)?.id).toBe('active');
  });
});

describe('interval packet loss', () => {
  it('calculates loss from the current interval instead of lifetime counters', () => {
    const delta = packetDelta(
      { packetsReceived: 1090, packetsLost: 11 },
      { packetsReceived: 1000, packetsLost: 10 },
    );

    expect(delta).toEqual({ received: 90, lost: 1 });
    expect(packetLossPercent(delta)).toBeCloseTo(1.0989, 4);
  });

  it('does not report a first sample or mix a reset counter with the old SSRC', () => {
    expect(packetDelta({ packetsReceived: 50, packetsLost: 2 }, null)).toBeNull();
    expect(packetDelta(
      { packetsReceived: 5, packetsLost: 0 },
      { packetsReceived: 50, packetsLost: 2 },
    )).toBeNull();
  });

  it('treats late-packet loss correction as zero new loss', () => {
    const delta = packetDelta(
      { packetsReceived: 110, packetsLost: 4 },
      { packetsReceived: 100, packetsLost: 5 },
    );

    expect(delta).toEqual({ received: 10, lost: 0 });
    expect(packetLossPercent(delta)).toBe(0);
  });
});
