/** WebSocket messages received from the matchmaking/signaling server. */
export type WsInbound =
  | { type: "welcome"; clientId: string; country: string; gender: string }
  | { type: "queued"; position: number }
  | { type: "queue_hint"; code: "no_compatible_partner"; message: string }
  | { type: "matched"; partnerId: string; sessionId: string; role: "initiator" | "responder" }
  | { type: "partner_disconnected"; reason: string }
  | { type: "chat"; text: string; at: number }
  | { type: "signal"; signalType: "offer" | "answer" | "ice-candidate"; data: unknown }
  | { type: "offer"; sdp: RTCSessionDescriptionInit | string }
  | { type: "answer"; sdp: RTCSessionDescriptionInit | string }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit }
  | { type: "error"; error: string; receivedType?: string };

export type ChatMessage = { from: "me" | "them" | "system"; text: string; at: number };

/** Matchmaking lifecycle driven by the WebSocket session. */
export type MatchStatus = "idle" | "connecting" | "queued" | "matched" | "stopped";

/** Internal WebRTC peer connection state (includes reconnecting). */
export type RtcInternalStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

/** User-facing connection indicator (3 states). */
export type ConnectionDisplayStatus = "connecting" | "connected" | "disconnected";

/** Map WS + WebRTC state to the 3-state display indicator. */
export function toDisplayConnectionStatus(
  matchStatus: MatchStatus,
  rtcStatus: RtcInternalStatus,
): ConnectionDisplayStatus {
  if (matchStatus === "stopped" || matchStatus === "idle") return "disconnected";
  if (matchStatus === "matched" && rtcStatus === "connected") return "connected";
  if (
    matchStatus === "connecting" ||
    matchStatus === "queued" ||
    rtcStatus === "connecting" ||
    rtcStatus === "reconnecting"
  ) {
    return "connecting";
  }
  if (rtcStatus === "connected") return "connected";
  return "disconnected";
}

export type SignalInbound = Extract<WsInbound, { type: "signal" }>;

/** Map wrapped or flat WS payloads into a unified signal message. */
export function toSignalMessage(msg: WsInbound): SignalInbound | null {
  if (msg.type === "signal") return msg;
  if (msg.type === "offer") {
    return { type: "signal", signalType: "offer", data: { sdp: msg.sdp } };
  }
  if (msg.type === "answer") {
    return { type: "signal", signalType: "answer", data: { sdp: msg.sdp } };
  }
  if (msg.type === "ice-candidate") {
    return { type: "signal", signalType: "ice-candidate", data: { candidate: msg.candidate } };
  }
  return null;
}
