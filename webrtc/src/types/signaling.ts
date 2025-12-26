/**
 * シグナリングサーバーとのメッセージ型定義
 */

/**
 * メッセージタイプ
 */
export type MessageType = 'welcome' | 'offer' | 'answer' | 'candidate';

/**
 * Welcomeメッセージ
 * サーバーからクライアントIDを受信する
 */
export interface WelcomeMessage {
  type: 'welcome';
  id: string;
}

/**
 * SDP Offerメッセージ
 * 発信側が接続開始時に送信する
 */
export interface SDPOfferMessage {
  from: string;
  to: string;
  sdp: RTCSessionDescriptionInit;
  type: 'offer';
}

/**
 * SDP Answerメッセージ
 * 応答側がOfferに対して返信する
 */
export interface SDPAnswerMessage {
  from: string;
  to: string;
  sdp: RTCSessionDescriptionInit;
  type: 'answer';
}

/**
 * SDP メッセージ（Offer または Answer）
 */
export type SDPMessage = SDPOfferMessage | SDPAnswerMessage;

/**
 * ICE Candidateメッセージ
 * 接続経路の候補を交換する
 */
export interface ICECandidateMessage {
  from: string;
  to: string;
  candidate: RTCIceCandidateInit;
  type: 'candidate';
}

/**
 * シグナリングメッセージの統合型
 */
export type SignalingMessage =
  | WelcomeMessage
  | SDPOfferMessage
  | SDPAnswerMessage
  | ICECandidateMessage;

/**
 * 送信するメッセージの型
 * （Welcomeメッセージは送信しないため除外）
 */
export type OutgoingMessage = SDPOfferMessage | SDPAnswerMessage | ICECandidateMessage;

/**
 * 受信するメッセージの型
 */
export type IncomingMessage = SignalingMessage;

/**
 * メッセージが特定の型かどうかを判定する型ガード
 */
export function isWelcomeMessage(message: SignalingMessage): message is WelcomeMessage {
  return message.type === 'welcome';
}

export function isSDPMessage(message: SignalingMessage): message is SDPMessage {
  return message.type === 'offer' || message.type === 'answer';
}

export function isOfferMessage(message: SignalingMessage): message is SDPOfferMessage {
  return message.type === 'offer';
}

export function isAnswerMessage(message: SignalingMessage): message is SDPAnswerMessage {
  return message.type === 'answer';
}

export function isICECandidateMessage(message: SignalingMessage): message is ICECandidateMessage {
  return message.type === 'candidate';
}
