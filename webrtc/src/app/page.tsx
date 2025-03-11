"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string>("");
  const [pendingSDP, setPendingSDP] = useState<any | null>(null);

  useEffect(() => {
    // WebSocket
    const ws = new WebSocket("ws://localhost:8080/ws");

    ws.onopen = () => {
      console.log("✅ WebSocket Connected");
    };

    ws.onmessage = (event) => {
      console.log("📩 WebSocket 受信:", event.data);
      const data = JSON.parse(event.data);

      if (data.type === "welcome") {
        setClientId(data.id);
        console.log(`🆔 Assigned Client ID: ${data.id}`);
      } else if (data.sdp) {
        console.log("🔄 SDP メッセージ受信:", data.sdp);
        setPendingSDP(data);
      }
    };

    ws.onerror = (error) => console.error("❌ WebSocket Error:", error);
    ws.onclose = () => console.warn("⚠ WebSocket Disconnected");

    setSocket(ws);

    // WebRTC
    const iceConfig: RTCConfiguration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    peerConnectionRef.current = new RTCPeerConnection(iceConfig);

    return () => {
      ws.close();
      peerConnectionRef.current?.close();
    };
  }, []);


  // ✅ clientId が設定された後に SDP を処理
  useEffect(() => {
    if (clientId && pendingSDP) {
      console.log("✅ clientId がセットされたので、SDP を処理します");
      handleSDPMessage(pendingSDP);
      setPendingSDP(null);
    }
  }, [clientId, pendingSDP]);


  // ✅ メッセージ送信
  const sendMessage = (message: object) => {
    if (!clientId) {
      console.warn("⚠ クライアント ID が未設定のため、メッセージを送信できません:", message);
      return;
    }
    console.log("📤 WebSocket 送信:", JSON.stringify({ from: clientId, ...message }));
    socket?.send(JSON.stringify({ from: clientId, ...message }));
  };

  // ✅ SDP Offer 作成
  const createOffer = async () => {
    if (!peerConnectionRef.current || !peerId) {
      console.error("❌ 接続先の Peer ID が未設定");
      return;
    }

    try {
      console.log("⚡ createOffer 実行開始");

      const offer = await peerConnectionRef.current.createOffer();
      console.log("📜 SDP Offer 作成:", offer);

      await peerConnectionRef.current.setLocalDescription(offer);
      console.log("✅ setLocalDescription 実行完了");

      sendMessage({ to: peerId, sdp: offer, type: "offer" });
      console.log("📤 SDP Offer 送信:", offer);
    } catch (error) {
      console.error("❌ SDP Offer 作成エラー:", error);
    }
  };

  // ✅ SDP メッセージ処理
  const handleSDPMessage = async (data: any) => {
    if (!peerConnectionRef.current) return;

    console.log("🔄 SDP 処理開始:", data.sdp);
    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));

    if (data.sdp.type === "offer") {
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      sendMessage({ to: data.from, sdp: answer, type: "answer" });
      console.log("📤 SDP Answer 送信:", answer);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">WebRTC Basic Connection (No ICE)</h1>

      <div className="mb-4">
        <p className="text-lg font-semibold">Your Client ID:</p>
        <p className="border p-2 rounded bg-gray-100">{clientId || "Connecting..."}</p>
      </div>

      <div className="mt-4">
        <input
          type="text"
          placeholder="相手の Client ID を入力"
          value={peerId}
          onChange={(e) => setPeerId(e.target.value)}
          className="border p-2 rounded"
        />
        <button onClick={createOffer} className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          Start Connection
        </button>
      </div>
    </main>
  );
}
