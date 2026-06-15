export type SignalKind = "offer" | "answer" | "ice-candidate";

export function normalizeSessionDescription(
  payload: unknown,
  fallbackType: RTCSdpType,
): RTCSessionDescriptionInit | null {
  if (payload == null) return null;

  if (typeof payload === "string") {
    return { type: fallbackType, sdp: payload };
  }

  if (typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;

  if (typeof obj.type === "string" && typeof obj.sdp === "string") {
    return { type: obj.type as RTCSdpType, sdp: obj.sdp };
  }

  if (typeof obj.sdp === "string") {
    return { type: fallbackType, sdp: obj.sdp };
  }

  if (obj.sdp && typeof obj.sdp === "object") {
    return normalizeSessionDescription(obj.sdp, fallbackType);
  }

  return null;
}

export function normalizeIceCandidate(payload: unknown): RTCIceCandidateInit | null {
  if (payload == null) return null;

  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (obj.candidate && typeof obj.candidate === "object") {
      return normalizeIceCandidate(obj.candidate);
    }
    if (typeof obj.candidate === "string" || obj.sdpMid != null || obj.sdpMLineIndex != null) {
      return obj as RTCIceCandidateInit;
    }
  }

  return null;
}

/** Normalize outbound SDP to a plain { type, sdp } object for signaling servers. */
export function toSignalingSdp(desc: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
  return {
    type: desc.type ?? "offer",
    sdp: typeof desc.sdp === "string" ? desc.sdp : "",
  };
}
