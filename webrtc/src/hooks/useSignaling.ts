import { useEffect, useState, useCallback } from 'react';
import { getWebSocketUrl } from '@/utils/webrtc-helpers';
import type {
  SignalingMessage,
  SDPMessage,
  ICECandidateMessage,
  SDPOfferMessage,
  SDPAnswerMessage,
} from '@/types';
import {
  isWelcomeMessage,
  isSDPMessage,
  isICECandidateMessage,
  isOfferMessage,
  isAnswerMessage,
} from '@/types';

export interface UseSignalingOptions {
  /**
   * WebSocket URL（省略時は自動検出）
   */
  url?: string;

  /**
   * SDP Offerメッセージ受信時のコールバック
   */
  onOffer?: (message: SDPOfferMessage) => void;

  /**
   * SDP Answerメッセージ受信時のコールバック
   */
  onAnswer?: (message: SDPAnswerMessage) => void;

  /**
   * ICE Candidateメッセージ受信時のコールバック
   */
  onIceCandidate?: (message: ICECandidateMessage) => void;
}

export interface UseSignalingReturn {
  /**
   * WebSocketインスタンス
   */
  socket: WebSocket | null;

  /**
   * 自分のクライアントID
   */
  clientId: string | null;

  /**
   * WebSocket接続済みかどうか
   */
  isConnected: boolean;

  /**
   * メッセージを送信
   */
  sendMessage: (message: object) => void;

  /**
   * SDP Offerを送信
   */
  sendOffer: (to: string, sdp: RTCSessionDescriptionInit) => void;

  /**
   * SDP Answerを送信
   */
  sendAnswer: (to: string, sdp: RTCSessionDescriptionInit) => void;

  /**
   * ICE Candidateを送信
   */
  sendCandidate: (to: string, candidate: RTCIceCandidate) => void;
}

/**
 * WebSocketシグナリングを管理するカスタムフック
 *
 * @example
 * ```tsx
 * const { clientId, sendOffer, sendCandidate } = useSignaling({
 *   onOffer: (message) => handleOffer(message),
 *   onIceCandidate: (message) => addIceCandidate(message.candidate),
 * });
 * ```
 */
export function useSignaling(options: UseSignalingOptions = {}): UseSignalingReturn {
  const { url, onOffer, onAnswer, onIceCandidate } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const wsUrl = url || getWebSocketUrl();
    console.log("📡 WebSocket接続先:", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ WebSocket Connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      console.log("📩 WebSocket 受信:", event.data);
      const message: SignalingMessage = JSON.parse(event.data);

      if (isWelcomeMessage(message)) {
        // サーバーからクライアントIDを受信
        setClientId(message.id);
        console.log(`🆔 Assigned Client ID: ${message.id}`);
      } else if (isOfferMessage(message)) {
        // SDP Offer受信
        console.log("🔄 SDP Offer 受信:", message.sdp);
        onOffer?.(message);
      } else if (isAnswerMessage(message)) {
        // SDP Answer受信
        console.log("🔄 SDP Answer 受信:", message.sdp);
        onAnswer?.(message);
      } else if (isICECandidateMessage(message)) {
        // ICE Candidate受信
        console.log("📡 ICE Candidate 受信:", message.candidate);
        onIceCandidate?.(message);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket Error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.warn("⚠ WebSocket Disconnected");
      setIsConnected(false);
    };

    setSocket(ws);

    // クリーンアップ
    return () => {
      ws.close();
    };
  }, [url, onOffer, onAnswer, onIceCandidate]);

  /**
   * メッセージを送信
   */
  const sendMessage = useCallback((message: object) => {
    if (!clientId) {
      console.warn("⚠ クライアント ID が未設定のため、メッセージを送信できません:", message);
      return;
    }

    const fullMessage = { from: clientId, ...message };
    console.log("📤 WebSocket 送信:", JSON.stringify(fullMessage));
    socket?.send(JSON.stringify(fullMessage));
  }, [socket, clientId]);

  /**
   * SDP Offerを送信
   */
  const sendOffer = useCallback((to: string, sdp: RTCSessionDescriptionInit) => {
    sendMessage({ to, sdp, type: 'offer' });
  }, [sendMessage]);

  /**
   * SDP Answerを送信
   */
  const sendAnswer = useCallback((to: string, sdp: RTCSessionDescriptionInit) => {
    sendMessage({ to, sdp, type: 'answer' });
  }, [sendMessage]);

  /**
   * ICE Candidateを送信
   */
  const sendCandidate = useCallback((to: string, candidate: RTCIceCandidate) => {
    sendMessage({ to, candidate, type: 'candidate' });
  }, [sendMessage]);

  return {
    socket,
    clientId,
    isConnected,
    sendMessage,
    sendOffer,
    sendAnswer,
    sendCandidate,
  };
}
