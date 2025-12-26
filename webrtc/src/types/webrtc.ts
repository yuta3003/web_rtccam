/**
 * WebRTC関連の型定義
 */

/**
 * RTCIceConnectionState の型定義
 * WebRTCの接続状態を表す
 */
export type ConnectionState =
  | 'new'
  | 'checking'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'disconnected'
  | 'closed';

/**
 * RTCSignalingState の型定義
 * シグナリング状態を表す
 */
export type SignalingState =
  | 'stable'
  | 'have-local-offer'
  | 'have-remote-offer'
  | 'have-local-pranswer'
  | 'have-remote-pranswer'
  | 'closed';

/**
 * RTCIceGatheringState の型定義
 * ICE Candidate収集状態を表す
 */
export type IceGatheringState = 'new' | 'gathering' | 'complete';

/**
 * Peer情報
 */
export interface PeerInfo {
  /** Peer ID */
  id: string;
  /** 接続状態 */
  connectionState: ConnectionState;
  /** シグナリング状態 */
  signalingState: SignalingState;
}

/**
 * メディアストリーム情報
 */
export interface MediaStreamInfo {
  /** ストリームID */
  id: string;
  /** ビデオトラックの有無 */
  hasVideo: boolean;
  /** オーディオトラックの有無 */
  hasAudio: boolean;
  /** アクティブかどうか */
  active: boolean;
}

/**
 * WebRTC設定オプション
 */
export interface WebRTCConfig {
  /** STUN/TURNサーバー設定 */
  iceServers: RTCIceServer[];
  /** ICE候補のポリシー */
  iceTransportPolicy?: RTCIceTransportPolicy;
  /** バンドルポリシー */
  bundlePolicy?: RTCBundlePolicy;
}

/**
 * メディアデバイス制約
 */
export interface MediaDeviceConstraints {
  /** ビデオ制約 */
  video: boolean | MediaTrackConstraints;
  /** オーディオ制約 */
  audio: boolean | MediaTrackConstraints;
}

/**
 * 接続状態が接続中かどうかを判定
 */
export function isConnecting(state: ConnectionState): boolean {
  return state === 'new' || state === 'checking';
}

/**
 * 接続状態が接続済みかどうかを判定
 */
export function isConnected(state: ConnectionState): boolean {
  return state === 'connected' || state === 'completed';
}

/**
 * 接続状態が切断済みかどうかを判定
 */
export function isDisconnected(state: ConnectionState): boolean {
  return state === 'disconnected' || state === 'failed' || state === 'closed';
}

/**
 * シグナリング状態が安定しているかどうかを判定
 */
export function isStable(state: SignalingState): boolean {
  return state === 'stable';
}
