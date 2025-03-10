"use client";

import { useEffect, useRef, useState } from "react";

const WebRTCPage = () => {
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientId = useRef<string | null>(null); // 自分の ID
  const remoteClientId = useRef<string | null>(null); // 相手の ID

  useEffect(() => {
    // WebSocket 接続
    const socket = new WebSocket("ws://127.0.0.1:8080/ws");

    socket.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("📩 受信:", message);

      if (message.type === "welcome") {
        clientId.current = message.id;
        console.log(`🎉 クライアントID取得: ${clientId.current}`);
      } else if (message.sdp) {
        await handleSDP(message);
      } else if (message.candidate) {
        await handleCandidate(message);
      }
    };

    setWs(socket);
    return () => socket.close();
  }, []);

  const startCall = async () => {
    if (!ws || !remoteClientId.current) {
      console.error("❌ WebSocket 未接続 または 相手の ID 未入力");
      return;
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && ws && remoteClientId.current) {
        const candidateMessage = {
          from: clientId.current,
          to: remoteClientId.current,
          candidate: event.candidate
        };
        ws.send(JSON.stringify(candidateMessage));
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (videoRef.current) videoRef.current.srcObject = stream;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log("📡 送信 SDP Offer:", offer.sdp);
    ws.send(JSON.stringify({
      from: clientId.current,
      to: remoteClientId.current,
      sdp: offer.sdp
    }));

    setPeerConnection(pc);
  };

  const handleSDP = async (message: any) => {
    if (!peerConnection) {
      console.warn("⚠️ PeerConnection が未初期化");
      return;
    }

    const sdpType = message.sdpType === "offer" ? "offer" : "answer";
    const sdp = new RTCSessionDescription({ type: sdpType, sdp: message.sdp });
    await peerConnection.setRemoteDescription(sdp);

    if (sdpType === "offer") {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      console.log("📡 送信 SDP Answer:", answer.sdp);
      ws?.send(JSON.stringify({
        from: clientId.current,
        to: message.from,
        sdp: answer.sdp,
        sdpType: "answer"
      }));
    }
  };

  const handleCandidate = async (message: any) => {
    if (!peerConnection) {
      console.warn("⚠️ PeerConnection が未初期化");
      return;
    }

    const candidate = new RTCIceCandidate(message.candidate);
    await peerConnection.addIceCandidate(candidate);
    console.log("📡 ICE Candidate 追加:", candidate);
  };

  return (
    <div className="container">
      <h1>WebRTC + Next.js (App Router)</h1>
      <video ref={videoRef} autoPlay playsInline></video>
      <input
        type="text"
        placeholder="接続相手の ID を入力"
        onChange={(e) => (remoteClientId.current = e.target.value)}
      />
      <button onClick={startCall}>Start Call</button>
    </div>
  );
};

export default WebRTCPage;
