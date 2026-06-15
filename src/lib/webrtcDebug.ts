export type RtcLogContext = {
  role?: "initiator" | "responder" | null;
  sessionId?: string | null;
  signalingState?: RTCSignalingState;
  connectionState?: RTCPeerConnectionState;
  iceConnectionState?: RTCIceConnectionState;
  extra?: unknown;
};

export function pcStates(pc: RTCPeerConnection | null): Pick<
  RtcLogContext,
  "signalingState" | "connectionState" | "iceConnectionState"
> {
  if (!pc) return {};
  return {
    signalingState: pc.signalingState,
    connectionState: pc.connectionState,
    iceConnectionState: pc.iceConnectionState,
  };
}

export function logRtc(event: string, ctx: RtcLogContext = {}) {
  if (!import.meta.env.DEV) return;
  console.debug(`[webrtc] ${event}`, ctx);
}

export function attachPcStateLogging(
  pc: RTCPeerConnection,
  ctx: { role?: "initiator" | "responder" | null; sessionId?: string | null },
) {
  if (!import.meta.env.DEV) return;

  pc.onsignalingstatechange = () => {
    logRtc("signalingState change", { ...ctx, ...pcStates(pc) });
  };
}
