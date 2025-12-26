/**
 * WebRTC関連の定数定義
 */

// シグナリングサーバーの設定
export const SIGNALING_SERVER = {
  DEFAULT_PORT: 8080,
  WS_PATH: '/ws',
  DEFAULT_HOST: 'localhost',
} as const;

// STUN/TURNサーバーの設定
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// WebRTC接続設定
export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: ICE_SERVERS,
};

// メディアストリームの制約
export const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: true,
  audio: true,
};

// メッセージタイプ
export const MESSAGE_TYPES = {
  WELCOME: 'welcome',
  OFFER: 'offer',
  ANSWER: 'answer',
  CANDIDATE: 'candidate',
} as const;

// 接続状態
export const CONNECTION_STATES = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  FAILED: 'failed',
} as const;

// シグナリング状態
export const SIGNALING_STATES = {
  STABLE: 'stable',
} as const;
