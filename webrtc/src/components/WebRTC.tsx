"use client";
import { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";

const WS_URL = "ws://localhost:8080/ws"; // RustシグナリングサーバーのURL

export default function WebRTC() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [peer, setPeer] = useState<SimplePeer.Instance | null>(null);
  const [connectedUser, setConnectedUser] = useState("");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const wsConnection = new WebSocket(WS_URL);

    wsConnection.onopen = () => console.log("✅ WebSocket接続");
    wsConnection.onmessage = (event) => handleMessage(event.data);
    wsConnection.onclose = () => console.log("❌ WebSocket切断");

    setWs(wsConnection);

    return () => {
      wsConnection.close();
    };
  }, []);

  // WebSocketメッセージ受信処理
  const handleMessage = (data: string) => {
    const message = JSON.parse(data);
    console.log("📩 受信", message);

    if (message.sdp) {
      console.log("📥 受信したSDP:", message.sdp);
      peer?.signal(message.sdp);
    } else if (message.candidate) {
      console.log("📥 受信したICE Candidate:", message.candidate);
      peer?.signal(message.candidate);
    }
  };

  // WebRTCのセットアップ
  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log("🎥 ローカルストリーム取得成功", stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const newPeer = new SimplePeer({
        initiator: true, // 通話を開始する側
        trickle: false,
        stream,
      });

      newPeer.on("signal", (data) => {
        console.log("📤 SDP送信", data);
        if (ws && connectedUser) {
          ws.send(JSON.stringify({ from: "caller", to: connectedUser, sdp: data }));
        }
      });

      setPeer(newPeer);
    } catch (error) {
      console.error("🚨 カメラ/マイクのアクセスに失敗", error);
    }
  };

  // リモートストリームの適用
  useEffect(() => {
    if (remoteVideoRef.current && peer) {
      peer.on("stream", (remoteStream) => {
        console.log("📡 リモートストリーム適用:", remoteStream);
        remoteVideoRef.current!.srcObject = remoteStream;
      });
    }
  }, [peer]);

  return (
    <div>
      <h1>WebRTC Demo</h1>
      <input
        type="text"
        placeholder="相手のIDを入力"
        value={connectedUser}
        onChange={(e) => setConnectedUser(e.target.value)}
      />
      <button onClick={startCall}>📞 通話開始</button>

      <div>
        <h2>📹 ローカル映像</h2>
        <video ref={localVideoRef} autoPlay playsInline />
      </div>
      <div>
        <h2>🎥 リモート映像</h2>
        <video ref={remoteVideoRef} autoPlay playsInline />
      </div>
    </div>
  );
}
