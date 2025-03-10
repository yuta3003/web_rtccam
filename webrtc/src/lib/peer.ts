export const createPeerConnection = (onIceCandidate: (event: RTCPeerConnectionIceEvent) => void) => {
  const peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  peer.onicecandidate = onIceCandidate;
  return peer;
};
