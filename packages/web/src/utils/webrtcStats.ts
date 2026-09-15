export interface PacketCounters {
  packetsReceived: number;
  packetsLost: number;
}

export interface PacketDelta {
  received: number;
  lost: number;
}

export interface IceRouteStats {
  ping: number | null;
  serverAddress: string | null;
  serverPort: number | null;
  protocol: string | null;
  candidateType: string | null;
  localAddress: string | null;
  localPort: number | null;
  localCandidateType: string | null;
  networkType: string | null;
  relayProtocol: string | null;
}

type StatsRecord = Record<string, any>;

export interface StatsReportLike {
  get(id: string): StatsRecord | undefined;
  forEach(callback: (report: StatsRecord) => void): void;
}

function candidateAddress(candidate: StatsRecord | undefined): string | null {
  if (!candidate) return null;
  return candidate.address ?? candidate.ip ?? null;
}

function candidatePort(candidate: StatsRecord | undefined): number | null {
  const port = candidate?.port;
  return typeof port === 'number' && Number.isFinite(port) ? port : null;
}

/**
 * Resolve the candidate pair Chromium is actually using.
 *
 * Modern reports identify it through the transport. The byte-count and state
 * fallbacks keep the diagnostics useful in older Chromium/Safari reports.
 */
export function findActiveCandidatePair(reports: StatsReportLike): StatsRecord | null {
  let selectedPairId: string | null = null;
  reports.forEach((report) => {
    if (report.type === 'transport' && report.selectedCandidatePairId) {
      selectedPairId = report.selectedCandidatePairId;
    }
  });

  if (selectedPairId) {
    const selected = reports.get(selectedPairId);
    if (selected?.type === 'candidate-pair') return selected;
  }

  let activePair: StatsRecord | null = null;
  let maxBytes = 0;
  reports.forEach((report) => {
    if (report.type !== 'candidate-pair') return;
    const bytes = (report.bytesSent ?? 0) + (report.bytesReceived ?? 0);
    if (bytes > maxBytes) {
      maxBytes = bytes;
      activePair = report;
    }
  });
  if (activePair) return activePair;

  reports.forEach((report) => {
    if (activePair || report.type !== 'candidate-pair') return;
    if (report.state === 'succeeded' || report.state === 'in-progress') {
      activePair = report;
    }
  });
  return activePair;
}

/** Return one atomic snapshot of the active ICE route. */
export function extractIceRoute(reports: StatsReportLike): IceRouteStats | null {
  const pair = findActiveCandidatePair(reports);
  if (!pair) return null;

  const local = pair.localCandidateId ? reports.get(pair.localCandidateId) : undefined;
  const remote = pair.remoteCandidateId ? reports.get(pair.remoteCandidateId) : undefined;

  return {
    ping: pair.currentRoundTripTime != null
      ? Math.round(pair.currentRoundTripTime * 1000)
      : null,
    serverAddress: candidateAddress(remote),
    serverPort: candidatePort(remote),
    protocol: local?.protocol ?? remote?.protocol ?? null,
    candidateType: remote?.candidateType ?? null,
    localAddress: candidateAddress(local),
    localPort: candidatePort(local),
    localCandidateType: local?.candidateType ?? null,
    networkType: local?.networkType ?? null,
    relayProtocol: local?.relayProtocol ?? remote?.relayProtocol ?? null,
  };
}

/**
 * Convert cumulative inbound RTP counters into one polling-interval delta.
 * A received-counter rollback means the SSRC was reset and must not be mixed
 * with the previous sample. A negative loss delta can happen when late packets
 * arrive, so it is clamped to zero rather than displayed as negative loss.
 */
export function packetDelta(
  current: PacketCounters,
  previous: PacketCounters | null,
): PacketDelta | null {
  if (!previous) return null;

  const received = current.packetsReceived - previous.packetsReceived;
  if (received < 0) return null;

  return {
    received,
    lost: Math.max(0, current.packetsLost - previous.packetsLost),
  };
}

export function packetLossPercent(delta: PacketDelta | null): number | null {
  if (!delta) return null;
  const total = delta.received + delta.lost;
  return total > 0 ? (delta.lost / total) * 100 : null;
}
