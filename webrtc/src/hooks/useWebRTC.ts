import { useEffect, useState, useRef, RefObject } from 'react';
import { RTC_CONFIGURATION, MESSAGE_TYPES, SIGNALING_STATES } from '@/utils/webrtc-constants';
import { addTracksToConnection, hasTracksAdded } from '@/utils/webrtc-helpers';
import type { SDPMessage, SDPOfferMessage, SDPAnswerMessage } from '@/types';

export interface UseWebRTCOptions {
  /**
   * ローカルメディアストリーム
   */
  localStream: MediaStream | null;

  /**
   * リモートビデオ要素のRef
   */
  remoteVideoRef?: RefObject<HTMLVideoElement>;

  /**
   * ICE Candidate生成時のコールバック
   */
  onIceCandidate?: (candidate: RTCIceCandidate) => void;

  /**
   * 接続状態変更時のコールバック
   */
  onConnectionStateChange?: (state: RTCIceConnectionState) => void;
}

export interface UseWebRTCReturn {
  /**
   * PeerConnection インスタンス
   */
  peerConnection: RTCPeerConnection | null;

  /**
   * 接続状態
   */
  connectionState: RTCIceConnectionState;

  /**
   * SDP Offerを作成
   */
  createOffer: () => Promise<RTCSessionDescriptionInit | null>;

  /**
   * SDP Offerを処理してAnswerを作成
   */
  handleOffer: (offer: SDPOfferMessage) => Promise<RTCSessionDescriptionInit | null>;

  /**
   * SDP Answerを処理
   */
  handleAnswer: (answer: SDPAnswerMessage) => Promise<void>;

  /**
   * ICE Candidateを追加
   */
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;

  /**
   * ネゴシエーション中かどうか
   */
  isNegotiating: boolean;
}

/**
 * WebRTC PeerConnectionを管理するカスタムフック
 *
 * @example
 * ```tsx
 * const remoteVideoRef = useRef<HTMLVideoElement>(null);
 * const { peerConnection, createOffer, handleAnswer } = useWebRTC({
 *   localStream,
 *   remoteVideoRef,
 *   onIceCandidate: (candidate) => sendToServer(candidate),
 * });
 * ```
 */
export function useWebRTC(options: UseWebRTCOptions): UseWebRTCReturn {
  const { localStream, remoteVideoRef, onIceCandidate, onConnectionStateChange } = options;

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [connectionState, setConnectionState] = useState<RTCIceConnectionState>('new');
  const [isNegotiating, setIsNegotiating] = useState(false);

  // PeerConnectionの初期化
  useEffect(() => {
    const pc = new RTCPeerConnection(RTC_CONFIGURATION);
    peerConnectionRef.current = pc;

    console.log("📡 RTCPeerConnection初期化完了");

    // ICE Candidate生成時
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("📡 ICE Candidate 生成:", event.candidate);
        onIceCandidate?.(event.candidate);
      } else {
        console.log("❗ ICE Candidate 生成完了 → ICE Gathering 終了");
      }
    };

    // ICE Gathering 状態
    pc.onicegatheringstatechange = () => {
      console.log("🔄 ICE Gathering State:", pc.iceGatheringState);
    };

    // ICE Connection 状態
    pc.oniceconnectionstatechange = () => {
      console.log("🔄 ICE Connection State:", pc.iceConnectionState);
      setConnectionState(pc.iceConnectionState);
      onConnectionStateChange?.(pc.iceConnectionState);
    };

    // リモートストリーム受信
    pc.ontrack = (event) => {
      console.log("📥 リモートトラック受信:", event.streams[0]);
      const remoteVideoElement = remoteVideoRef?.current;
      const remoteStream = event.streams[0];

      if (remoteVideoElement && remoteStream) {
        remoteVideoElement.srcObject = remoteStream;
        console.log("✅ リモートビデオ設定完了");
      }
    };

    // シグナリング状態の監視
    pc.onsignalingstatechange = () => {
      const currentState = pc.signalingState;
      console.log("🔄 Signaling State:", currentState);

      if (currentState === SIGNALING_STATES.STABLE) {
        setIsNegotiating(false);
        console.log("✅ ネゴシエーション完了（stable状態）");
      }
    };

    // クリーンアップ
    return () => {
      pc.close();
      console.log("🛑 RTCPeerConnection クローズ");
    };
  }, [remoteVideoRef, onIceCandidate, onConnectionStateChange]);

  /**
   * SDP Offerを作成
   */
  const createOffer = async (): Promise<RTCSessionDescriptionInit | null> => {
    const pc = peerConnectionRef.current;

    if (!pc || !localStream) {
      console.error("❌ PeerConnection または LocalStream が未初期化");
      return null;
    }

    if (isNegotiating) {
      console.log("⚠ 既にネゴシエーション中のため、スキップします");
      return null;
    }

    try {
      setIsNegotiating(true);
      console.log("⚡ SDP Offer 作成開始");

      // トラックが未追加の場合のみ追加
      if (!hasTracksAdded(pc)) {
        addTracksToConnection(pc, localStream);
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log("📜 SDP Offer 作成完了:", offer);
      return offer;
    } catch (error) {
      console.error("❌ SDP Offer 作成エラー:", error);
      setIsNegotiating(false);
      return null;
    }
  };

  /**
   * SDP Offerを処理してAnswerを作成
   */
  const handleOffer = async (offer: SDPOfferMessage): Promise<RTCSessionDescriptionInit | null> => {
    const pc = peerConnectionRef.current;

    if (!pc) {
      console.error("❌ PeerConnection が未初期化");
      return null;
    }

    try {
      console.log("🔄 SDP Offer 処理開始:", offer.sdp);
      setIsNegotiating(true);

      // ローカルトラックを追加（Answerを返す側も映像・音声を送る）
      if (localStream && !hasTracksAdded(pc)) {
        console.log("⚡ Offer受信時にローカルトラックを追加");
        addTracksToConnection(pc, localStream);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
      console.log("✅ setRemoteDescription 完了");

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("📤 SDP Answer 作成完了:", answer);
      return answer;
    } catch (error) {
      console.error("❌ SDP Offer 処理エラー:", error);
      setIsNegotiating(false);
      return null;
    }
  };

  /**
   * SDP Answerを処理
   */
  const handleAnswer = async (answer: SDPAnswerMessage): Promise<void> => {
    const pc = peerConnectionRef.current;

    if (!pc) {
      console.error("❌ PeerConnection が未初期化");
      return;
    }

    try {
      console.log("🔄 SDP Answer 処理開始:", answer.sdp);

      await pc.setRemoteDescription(new RTCSessionDescription(answer.sdp));
      console.log("✅ setRemoteDescription 完了");
    } catch (error) {
      console.error("❌ SDP Answer 処理エラー:", error);
    }
  };

  /**
   * ICE Candidateを追加
   */
  const addIceCandidate = async (candidate: RTCIceCandidateInit): Promise<void> => {
    const pc = peerConnectionRef.current;

    if (!pc) {
      console.error("❌ PeerConnection が未初期化");
      return;
    }

    try {
      console.log("📡 ICE Candidate 追加中:", candidate);
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("✅ ICE Candidate 追加完了");
    } catch (error) {
      console.error("❌ ICE Candidate 追加エラー:", error);
    }
  };

  return {
    peerConnection: peerConnectionRef.current,
    connectionState,
    createOffer,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    isNegotiating,
  };
}
