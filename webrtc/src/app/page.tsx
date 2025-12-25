"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerIdRef = useRef<string>(""); // 常に最新のpeerIdを参照するためのRef
  const isNegotiatingRef = useRef<boolean>(false); // ネゴシエーション中かどうかのフラグ

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string>("");
  const [pendingSDP, setPendingSDP] = useState<any | null>(null);
  const [connectionState, setConnectionState] = useState<string>("disconnected");
  const [isLocalStreamReady, setIsLocalStreamReady] = useState<boolean>(false);

  // peerIdが変更されたらRefも更新
  useEffect(() => {
    peerIdRef.current = peerId;
  }, [peerId]);

  useEffect(() => {
    // カメラ・マイクアクセス
    const initLocalStream = async () => {
      try {
        console.log("📹 カメラ・マイクアクセス開始...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        localStreamRef.current = stream;

        // ローカルビデオに表示
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setIsLocalStreamReady(true);
        console.log("✅ ローカルストリーム取得成功");
      } catch (error) {
        console.error("❌ メディアデバイスアクセスエラー:", error);
        alert("カメラ・マイクへのアクセスが拒否されました");
      }
    };

    initLocalStream();

    // WebSocket 接続
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
      } else if (data.candidate) {
        console.log("📡 ICE Candidate 受信:", data.candidate);
        handleIceCandidateMessage(data);
      }
    };

    ws.onerror = (error) => console.error("❌ WebSocket Error:", error);
    ws.onclose = () => console.warn("⚠ WebSocket Disconnected");

    setSocket(ws);

    // WebRTC 接続（STUN/TURNサーバー有効化）
    const iceConfig: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    const peerConnection = new RTCPeerConnection(iceConfig);
    peerConnectionRef.current = peerConnection;

    console.log("📡 peerConnectionRef", peerConnectionRef);

    // ICE Candidate 生成時
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("📡 ICE Candidate 生成:", event.candidate);
        console.log("📝 現在のpeerIdRef.current:", peerIdRef.current);
        // peerIdRefを使って最新のpeerIdを参照
        if (peerIdRef.current) {
          console.log(`📤 ICE Candidateを${peerIdRef.current}に送信`);
          sendMessage({ to: peerIdRef.current, candidate: event.candidate, type: "candidate" });
        } else {
          console.warn("⚠ ICE Candidate生成されましたが、peerIdが未設定のため送信できません");
        }
      } else {
        console.log("❗ ICE Candidate 生成完了 (null が返された) → ICE Gathering 終了");
      }
    };

    // ICE Gathering 状態
    peerConnection.onicegatheringstatechange = () => {
      console.log("🔄 ICE Gathering State:", peerConnection.iceGatheringState);
    };

    // ICE Connection 状態
    peerConnection.oniceconnectionstatechange = () => {
      console.log("🔄 ICE Connection State:", peerConnection.iceConnectionState);
      setConnectionState(peerConnection.iceConnectionState);
    };

    // リモートストリーム受信
    peerConnection.ontrack = (event) => {
      console.log("📥 リモートトラック受信:", event.streams[0]);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        console.log("✅ リモートビデオ設定完了");
      }
    };

    // シグナリング状態の監視（デバッグ用）
    peerConnection.onsignalingstatechange = () => {
      console.log("🔄 Signaling State:", peerConnection.signalingState);
      if (peerConnection.signalingState === "stable") {
        isNegotiatingRef.current = false;
        console.log("✅ ネゴシエーション完了（stable状態）");
      }
    };

    return () => {
      ws.close();
      peerConnectionRef.current?.close();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // clientId が設定された後に SDP を処理
  useEffect(() => {
    if (clientId && pendingSDP) {
      console.log("✅ clientId がセットされたので、SDP を処理します");
      handleSDPMessage(pendingSDP);
      setPendingSDP(null);
    }
  }, [clientId, pendingSDP]);

  // メッセージ送信
  const sendMessage = (message: object) => {
    if (!clientId) {
      console.warn("⚠ クライアント ID が未設定のため、メッセージを送信できません:", message);
      return;
    }
    console.log("📤 WebSocket 送信:", JSON.stringify({ from: clientId, ...message }));
    socket?.send(JSON.stringify({ from: clientId, ...message }));
  };

  // SDP Offer 作成（接続開始）
  const createOffer = async () => {
    if (!peerConnectionRef.current || !peerId) {
      console.error("❌ 接続先の Peer ID が未設定");
      alert("接続先のClient IDを入力してください");
      return;
    }

    if (!isLocalStreamReady || !localStreamRef.current) {
      console.error("❌ ローカルストリームが準備できていません");
      alert("カメラの準備ができていません");
      return;
    }

    if (isNegotiatingRef.current) {
      console.log("⚠ 既にネゴシエーション中のため、接続開始をスキップします");
      return;
    }

    try {
      isNegotiatingRef.current = true;
      console.log("⚡ 接続開始: ローカルトラックを追加");

      // すでにトラックが追加されているかチェック
      const senders = peerConnectionRef.current.getSenders();
      if (senders.length === 0) {
        // ローカルストリームのトラックをpeerConnectionに追加
        const localStream = localStreamRef.current;
        localStream.getTracks().forEach(track => {
          console.log("➕ トラック追加:", track.kind, track.label);
          peerConnectionRef.current?.addTrack(track, localStream);
        });
        console.log("✅ トラック追加完了");
      } else {
        console.log("⚠ トラックは既に追加済みです");
      }

      // Offerを作成
      console.log("⚡ createOffer 実行開始");
      const offer = await peerConnectionRef.current.createOffer();
      console.log("📜 SDP Offer 作成:", offer);

      await peerConnectionRef.current.setLocalDescription(offer);
      console.log("✅ setLocalDescription 実行完了");

      sendMessage({ to: peerId, sdp: offer, type: "offer" });
      console.log("📤 SDP Offer 送信:", offer);
    } catch (error) {
      console.error("❌ SDP Offer 作成エラー:", error);
      isNegotiatingRef.current = false;
    }
  };

  // SDP メッセージ処理
  const handleSDPMessage = async (data: any) => {
    if (!peerConnectionRef.current) return;

    try {
      console.log("🔄 SDP 処理開始:", data.sdp);

      // 送信元のIDを自動的に記憶（受信側が相手のIDを知るため）
      if (data.from) {
        if (!peerId || peerId === "") {
          console.log(`📝 接続相手のIDを自動設定: ${data.from}`);
          setPeerId(data.from);
          peerIdRef.current = data.from; // 即座にRefも更新
        } else if (peerId !== data.from) {
          console.log(`⚠ 既に異なるPeer ID(${peerId})が設定されていますが、${data.from}から接続要求を受信しました`);
        }
      }

      // Offerを受信した場合、まずローカルトラックを追加
      if (data.sdp.type === "offer" && localStreamRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        if (senders.length === 0) {
          console.log("⚡ Offer受信時にローカルトラックを追加");
          const localStream = localStreamRef.current;
          localStream.getTracks().forEach(track => {
            console.log("➕ トラック追加:", track.kind, track.label);
            peerConnectionRef.current?.addTrack(track, localStream);
          });
        }
      }

      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      console.log("✅ setRemoteDescription 完了");

      if (data.sdp.type === "offer") {
        isNegotiatingRef.current = true;
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        sendMessage({ to: data.from, sdp: answer, type: "answer" });
        console.log("📤 SDP Answer 送信:", answer);
      }
    } catch (error) {
      console.error("❌ SDP 処理エラー:", error);
      isNegotiatingRef.current = false;
    }
  };

  // ICE Candidate メッセージ処理
  const handleIceCandidateMessage = async (data: any) => {
    if (!peerConnectionRef.current) return;

    try {
      // 送信元のIDを自動的に記憶（まだ設定されていない場合）
      if (data.from) {
        if (!peerId || peerId === "") {
          console.log(`📝 ICE Candidate受信時に接続相手のIDを自動設定: ${data.from}`);
          setPeerId(data.from);
          peerIdRef.current = data.from; // 即座にRefも更新
        }
      }

      console.log("📡 ICE Candidate 追加中:", data.candidate);
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      console.log("✅ ICE Candidate 追加完了");
    } catch (error) {
      console.error("❌ ICE Candidate 追加エラー:", error);
    }
  };

  // 接続状態の色
  const getConnectionStateColor = () => {
    switch (connectionState) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "failed":
      case "disconnected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">WebRTC Video Chat</h1>

      {/* 接続状態インジケーター */}
      <div className="mb-4 flex items-center gap-2">
        <span>接続状態:</span>
        <div className={`w-3 h-3 rounded-full ${getConnectionStateColor()}`}></div>
        <span className="font-mono">{connectionState}</span>
      </div>

      {/* クライアントID */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-400 mb-1">Your Client ID:</p>
        <p className="font-mono text-lg">{clientId || "Connecting..."}</p>
      </div>

      {/* ビデオエリア */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 w-full max-w-4xl">
        {/* ローカルビデオ */}
        <div className="relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto bg-black rounded-lg border-2 border-gray-700"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
            Your Video
          </div>
        </div>

        {/* リモートビデオ */}
        <div className="relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-auto bg-black rounded-lg border-2 border-gray-700"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
            Remote Video
          </div>
        </div>
      </div>

      {/* 接続コントロール */}
      <div className="flex flex-col items-center gap-4 p-6 bg-gray-800 rounded-lg">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="相手の Client ID を入力"
            value={peerId}
            onChange={(e) => setPeerId(e.target.value)}
            className="border-2 border-gray-600 bg-gray-700 p-3 rounded-lg text-white font-mono w-80"
          />
          <button
            onClick={createOffer}
            disabled={!isLocalStreamReady || !peerId}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
          >
            接続開始
          </button>
        </div>
        {!isLocalStreamReady && (
          <p className="text-yellow-400 text-sm">カメラ・マイクの準備中...</p>
        )}
      </div>

      {/* デバッグ情報 */}
      <div className="mt-6 text-xs text-gray-500">
        <p>ローカルストリーム: {isLocalStreamReady ? "✅ 準備完了" : "⏳ 準備中"}</p>
      </div>
    </main>
  );
}
