"use client";
import { useEffect, useRef, useState } from "react";

const SIGNALING_SERVER_URL = "ws://127.0.0.1:8080/ws"; // Rust シグナリングサーバー
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }]; // STUN サーバー

export default function Home() {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [targetPeerId, setTargetPeerId] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    wsRef.current = new WebSocket(SIGNALING_SERVER_URL);
    wsRef.current.onopen = () => console.log("WebSocket 接続成功");

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "welcome") {
        setPeerId(message.id);
      } else if (message.sdp) {
        handleRemoteSDP(message);
      } else if (message.candidate) {
        handleRemoteCandidate(message);
      }
    };

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const sendMessage = (msg: object) => {
    if (wsRef.current && peerId) {
      wsRef.current.send(JSON.stringify({ from: peerId, ...msg }));
    }
  };

  const startCall = async () => {
    if (!targetPeerId) return alert("相手の ID を入力してください");

    peerConnectionRef.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    stream.getTracks().forEach((track) =>
      peerConnectionRef.current?.addTrack(track, stream)
    );

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({ to: targetPeerId, candidate: event.candidate });
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    sendMessage({ to: targetPeerId, sdp: offer });
  };

  const handleRemoteSDP = async (message: any) => {
    if (!peerConnectionRef.current) {
      peerConnectionRef.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage({ to: message.from, candidate: event.candidate });
        }
      };

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) =>
        peerConnectionRef.current?.addTrack(track, stream)
      );
    }

    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.sdp));
    console.log("✅ Remote SDP 設定完了");

    applyPendingCandidates();

    if (message.sdp.type === "offer") {
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      sendMessage({ to: message.from, sdp: answer });
    }
  };

  const handleRemoteCandidate = async (message: any) => {
    if (!peerConnectionRef.current) {
      console.warn("⚠️ PeerConnection がまだ初期化されていません");
      return;
    }

    if (!peerConnectionRef.current.remoteDescription) {
      console.warn("⏳ ICE Candidate を一時保存: Remote SDP 未設定");
      pendingCandidates.current.push(message.candidate);
      return;
    }

    console.log("✅ ICE Candidate を追加: ", message.candidate);
    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
  };

  const applyPendingCandidates = async () => {
    if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) return;
    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift();
      if (candidate) {
        console.log("🚀 保留中の ICE Candidate を追加: ", candidate);
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  };

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold">WebRTC ビデオチャット</h1>
      {peerId && <p className="mt-2">あなたの ID: {peerId}</p>}

      <input
        type="text"
        placeholder="相手の ID を入力"
        className="border p-2 mt-4"
        value={targetPeerId}
        onChange={(e) => setTargetPeerId(e.target.value)}
      />

      <button
        onClick={startCall}
        className="bg-blue-500 text-white px-4 py-2 mt-4 rounded"
      >
        通話開始
      </button>

      <div className="mt-6 flex gap-4">
        <video ref={localVideoRef} autoPlay playsInline className="w-64 h-48 border" />
        <video ref={remoteVideoRef} autoPlay playsInline className="w-64 h-48 border" />
      </div>
    </div>
  );
}
