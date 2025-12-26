"use client";

import { useEffect, useRef, useState } from "react";
import {
  RTC_CONFIGURATION,
  MEDIA_CONSTRAINTS,
  MESSAGE_TYPES,
  SIGNALING_STATES
} from "@/utils/webrtc-constants";
import {
  getWebSocketUrl,
  addTracksToConnection,
  hasTracksAdded,
  getConnectionStateColor,
  isPeerIdEmpty,
  isMediaStreamReady,
} from "@/utils/webrtc-helpers";
import type {
  SignalingMessage,
  SDPMessage,
  ICECandidateMessage,
} from "@/types";
import {
  isWelcomeMessage as checkWelcomeMessage,
  isSDPMessage as checkSDPMessage,
  isICECandidateMessage as checkICECandidateMessage,
} from "@/types";

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
  const [pendingSDP, setPendingSDP] = useState<SDPMessage | null>(null);
  const [connectionState, setConnectionState] = useState<string>("disconnected");
  const [isLocalStreamReady, setIsLocalStreamReady] = useState<boolean>(false);

  // peerIdが変更されたらRefも更新
  useEffect(() => {
    peerIdRef.current = peerId;
  }, [peerId]);

  useEffect(() => {
    /**
     * カメラとマイクへのアクセスを初期化
     * 取得したストリームをローカルビデオに表示する
     */
    const initLocalStream = async () => {
      try {
        console.log("📹 カメラ・マイクアクセス開始...");

        const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);

        // ストリームを保存
        localStreamRef.current = stream;

        // ローカルビデオ要素が存在する場合、ストリームを設定
        const localVideoElement = localVideoRef.current;
        if (localVideoElement) {
          localVideoElement.srcObject = stream;
        }

        setIsLocalStreamReady(true);
        console.log("✅ ローカルストリーム取得成功");
      } catch (error) {
        console.error("❌ メディアデバイスアクセスエラー:", error);
        alert("カメラ・マイクへのアクセスが拒否されました");
      }
    };

    initLocalStream();

    /**
     * WebSocketシグナリングサーバーへの接続
     * 環境変数 > 現在のホスト名 > デフォルト の順で接続先を決定
     */
    const wsUrl = getWebSocketUrl();
    console.log("📡 WebSocket接続先:", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ WebSocket Connected");
    };

    ws.onmessage = (event) => {
      console.log("📩 WebSocket 受信:", event.data);
      const message: SignalingMessage = JSON.parse(event.data);

      if (checkWelcomeMessage(message)) {
        // サーバーからクライアントIDを受信
        setClientId(message.id);
        console.log(`🆔 Assigned Client ID: ${message.id}`);
      } else if (checkSDPMessage(message)) {
        // SDP Offer/Answerメッセージを受信
        console.log("🔄 SDP メッセージ受信:", message.sdp);
        setPendingSDP(message);
      } else if (checkICECandidateMessage(message)) {
        // ICE Candidateメッセージを受信
        console.log("📡 ICE Candidate 受信:", message.candidate);
        handleIceCandidateMessage(message);
      }
    };

    ws.onerror = (error) => console.error("❌ WebSocket Error:", error);
    ws.onclose = () => console.warn("⚠ WebSocket Disconnected");

    setSocket(ws);

    /**
     * WebRTC Peer Connectionの初期化
     * STUN/TURNサーバーを設定してNAT越え接続を可能にする
     */
    const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
    peerConnectionRef.current = peerConnection;

    console.log("📡 RTCPeerConnection初期化完了");

    /**
     * ICE Candidate生成時のハンドラー
     * 生成されたCandidateを相手に送信する
     */
    peerConnection.onicecandidate = (event) => {
      const hasCandidate = event.candidate !== null;
      const hasPeerId = peerIdRef.current !== "";

      if (hasCandidate) {
        console.log("📡 ICE Candidate 生成:", event.candidate);
        console.log("📝 現在の接続先Peer ID:", peerIdRef.current);

        if (hasPeerId) {
          console.log(`📤 ICE Candidateを${peerIdRef.current}に送信`);
          sendMessage({
            to: peerIdRef.current,
            candidate: event.candidate,
            type: MESSAGE_TYPES.CANDIDATE
          });
        } else {
          console.warn("⚠ ICE Candidate生成されましたが、Peer IDが未設定のため送信できません");
        }
      } else {
        console.log("❗ ICE Candidate 生成完了 → ICE Gathering 終了");
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
      const remoteVideoElement = remoteVideoRef.current;
      const remoteStream = event.streams[0];

      if (remoteVideoElement && remoteStream) {
        remoteVideoElement.srcObject = remoteStream;
        console.log("✅ リモートビデオ設定完了");
      }
    };

    /**
     * シグナリング状態変更時のハンドラー
     * stable状態になったらネゴシエーション完了とみなす
     */
    peerConnection.onsignalingstatechange = () => {
      const currentState = peerConnection.signalingState;
      console.log("🔄 Signaling State:", currentState);

      const isNegotiationComplete = currentState === SIGNALING_STATES.STABLE;
      if (isNegotiationComplete) {
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

  /**
   * SDP Offerを作成して接続を開始する
   * @description 発信側（Caller）が実行する関数
   */
  const createOffer = async () => {
    const peerConnection = peerConnectionRef.current;
    const localStream = localStreamRef.current;

    // 事前条件チェック: Peer Connectionが初期化されているか
    const isPeerConnectionReady = peerConnection !== null;
    const hasPeerId = !isPeerIdEmpty(peerId);
    const isStreamReady = isMediaStreamReady(isLocalStreamReady, localStream);
    const isAlreadyNegotiating = isNegotiatingRef.current;

    if (!isPeerConnectionReady || !hasPeerId) {
      console.error("❌ 接続先の Peer ID が未設定");
      alert("接続先のClient IDを入力してください");
      return;
    }

    if (!isStreamReady || !localStream) {
      console.error("❌ ローカルストリームが準備できていません");
      alert("カメラの準備ができていません");
      return;
    }

    if (isAlreadyNegotiating) {
      console.log("⚠ 既にネゴシエーション中のため、接続開始をスキップします");
      return;
    }

    try {
      // ネゴシエーション開始フラグを立てる
      isNegotiatingRef.current = true;
      console.log("⚡ 接続開始: ローカルトラックを追加");

      // トラックが未追加の場合のみ追加する（重複を防ぐ）
      const alreadyHasTracks = hasTracksAdded(peerConnection);
      if (!alreadyHasTracks) {
        // この時点でlocalStreamはnullでないことが保証されている
        addTracksToConnection(peerConnection, localStream);
      } else {
        console.log("⚠ トラックは既に追加済みです");
      }

      // SDP Offerを作成
      console.log("⚡ SDP Offer 作成開始");
      const offer = await peerConnection.createOffer();
      console.log("📜 SDP Offer 作成完了:", offer);

      // ローカルのSessionDescriptionを設定
      await peerConnection.setLocalDescription(offer);
      console.log("✅ setLocalDescription 実行完了");

      // 相手にOfferを送信
      sendMessage({
        to: peerId,
        sdp: offer,
        type: MESSAGE_TYPES.OFFER
      });
      console.log("📤 SDP Offer 送信完了");
    } catch (error) {
      console.error("❌ SDP Offer 作成エラー:", error);
      isNegotiatingRef.current = false;
    }
  };

  /**
   * SDP Offer/Answerメッセージを処理する
   * @description 相手から受信したSDPを設定し、必要に応じてAnswerを返す
   */
  const handleSDPMessage = async (data: SDPMessage) => {
    const peerConnection = peerConnectionRef.current;
    const localStream = localStreamRef.current;

    if (!peerConnection) return;

    try {
      console.log("🔄 SDP 処理開始:", data.sdp);

      // 送信元のPeer IDを自動設定（受信側が相手のIDを知るため）
      const hasSenderInfo = data.from !== undefined;
      const currentPeerIdIsEmpty = isPeerIdEmpty(peerId);
      const isDifferentPeer = peerId !== data.from;

      if (hasSenderInfo) {
        if (currentPeerIdIsEmpty) {
          // Peer IDが未設定の場合、送信元を自動設定
          console.log(`📝 接続相手のIDを自動設定: ${data.from}`);
          setPeerId(data.from);
          peerIdRef.current = data.from;
        } else if (isDifferentPeer) {
          console.log(`⚠ 既に異なるPeer ID(${peerId})が設定されていますが、${data.from}から接続要求を受信しました`);
        }
      }

      // Offer受信時: ローカルトラックを追加（Answerを返す側も映像・音声を送る）
      const isOfferMessage = data.sdp.type === MESSAGE_TYPES.OFFER;
      const needsToAddTracks = !hasTracksAdded(peerConnection);

      if (isOfferMessage && localStream && needsToAddTracks) {
        console.log("⚡ Offer受信時にローカルトラックを追加");
        // この時点でlocalStreamはnullでないことが保証されている
        addTracksToConnection(peerConnection, localStream);
      }

      // リモートのSessionDescriptionを設定
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      console.log("✅ setRemoteDescription 完了");

      // Offerを受信した場合はAnswerを作成して返送
      if (isOfferMessage) {
        isNegotiatingRef.current = true;

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        sendMessage({
          to: data.from,
          sdp: answer,
          type: MESSAGE_TYPES.ANSWER
        });
        console.log("📤 SDP Answer 送信完了");
      }
    } catch (error) {
      console.error("❌ SDP 処理エラー:", error);
      isNegotiatingRef.current = false;
    }
  };

  /**
   * ICE Candidateメッセージを処理する
   * @description 相手から受信したICE Candidateを追加する
   */
  const handleIceCandidateMessage = async (data: ICECandidateMessage) => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) return;

    try {
      // 送信元のPeer IDを自動設定（まだ設定されていない場合）
      const hasSenderInfo = data.from !== undefined;
      const currentPeerIdIsEmpty = isPeerIdEmpty(peerId);

      if (hasSenderInfo && currentPeerIdIsEmpty) {
        console.log(`📝 ICE Candidate受信時に接続相手のIDを自動設定: ${data.from}`);
        setPeerId(data.from);
        peerIdRef.current = data.from;
      }

      // ICE Candidateを追加
      console.log("📡 ICE Candidate 追加中:", data.candidate);
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      console.log("✅ ICE Candidate 追加完了");
    } catch (error) {
      console.error("❌ ICE Candidate 追加エラー:", error);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">WebRTC Video Chat</h1>

      {/* 接続状態インジケーター */}
      <div className="mb-4 flex items-center gap-2">
        <span>接続状態:</span>
        <div className={`w-3 h-3 rounded-full ${getConnectionStateColor(connectionState)}`}></div>
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
