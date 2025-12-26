/**
 * 型定義のエクスポート
 */

// シグナリング関連の型
export type {
  MessageType,
  WelcomeMessage,
  SDPOfferMessage,
  SDPAnswerMessage,
  SDPMessage,
  ICECandidateMessage,
  SignalingMessage,
  OutgoingMessage,
  IncomingMessage,
} from './signaling';

export {
  isWelcomeMessage,
  isSDPMessage,
  isOfferMessage,
  isAnswerMessage,
  isICECandidateMessage,
} from './signaling';

// WebRTC関連の型
export type {
  ConnectionState,
  SignalingState,
  IceGatheringState,
  PeerInfo,
  MediaStreamInfo,
  WebRTCConfig,
  MediaDeviceConstraints,
} from './webrtc';

export {
  isConnecting,
  isConnected,
  isDisconnected,
  isStable,
} from './webrtc';
