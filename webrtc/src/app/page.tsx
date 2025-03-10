"use client";

import { useEffect, useRef, useState } from "react";
import { createPeerConnection } from "@/lib/peer";
import socket, { sendMessage } from "@/lib/wsClient";

export default function Home() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [peer, setPeer] = useState<RTCPeerConnection | null>(null);

  useEffect(() => {
    const pc = createPeerConnection((event) => {
      if (event.candidate) {
        sendMessage({ type: "candidate", candidate: event.candidate });
      }
    });

    // リモートストリームを受け取ったときに video にセット
    pc.ontrack = (event) => {
      console.log("🎥 リモート映像を受信");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    });

    setPeer(pc);

    socket.on("message", async (msg) => {
      if (msg.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendMessage({ type: "answer", sdp: answer });
      } else if (msg.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.type === "candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      }
    });

    return () => {
      pc.close();
      socket.off("message");
    };
  }, []);

  const startCall = async () => {
    if (!peer) return;
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendMessage({ type: "offer", sdp: offer });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">WebRTC 通話</h1>
      <div className="flex space-x-4">
        <div>
          <p>📹 自分の映像</p>
          <video ref={localVideoRef} autoPlay playsInline className="w-64 border" />
        </div>
        <div>
          <p>🧑‍🤝‍🧑 相手の映像</p>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-64 border" />
        </div>
      </div>
      <button
        onClick={startCall}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
      >
        通話開始
      </button>
    </div>
  );
}
