import { SIGNALING_SERVER } from './webrtc-constants';

/**
 * WebSocketのURLを取得する
 * 環境変数 > 現在のホスト名 > デフォルト の優先順位で決定
 */
export function getWebSocketUrl(): string {
  // 環境変数が設定されている場合はそれを使用
  const envUrl = process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL;
  if (envUrl) {
    return envUrl;
  }

  // ブラウザで実行中の場合、現在のホスト名を使用
  if (typeof window !== 'undefined') {
    // HTTPSの場合はwss、HTTPの場合はwsを使用
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const currentHost = window.location.host; // host includes port if present

    // Nginx経由でアクセスしている場合（ポート番号なし、または80番）
    // WebSocketは同じホストの/wsパスで提供される
    return `${protocol}//${currentHost}${SIGNALING_SERVER.WS_PATH}`;
  }

  // デフォルト（サーバーサイドレンダリング時など）
  return `ws://${SIGNALING_SERVER.DEFAULT_HOST}:${SIGNALING_SERVER.DEFAULT_PORT}${SIGNALING_SERVER.WS_PATH}`;
}

/**
 * ピア接続にローカルストリームのトラックを追加する
 */
export function addTracksToConnection(
  peerConnection: RTCPeerConnection,
  stream: MediaStream
): void {
  const tracks = stream.getTracks();

  tracks.forEach(track => {
    console.log("➕ トラック追加:", track.kind, track.label);
    peerConnection.addTrack(track, stream);
  });

  console.log(`✅ トラック追加完了 (${tracks.length}個)`);
}

/**
 * ピア接続にトラックが既に追加されているか確認
 */
export function hasTracksAdded(peerConnection: RTCPeerConnection): boolean {
  const senders = peerConnection.getSenders();
  return senders.length > 0;
}

/**
 * 接続状態に応じたCSSクラスを返す
 */
export function getConnectionStateColor(state: string): string {
  switch (state) {
    case 'connected':
      return 'bg-green-500';
    case 'connecting':
      return 'bg-yellow-500';
    case 'failed':
    case 'disconnected':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Peer IDが未設定かどうかを判定
 */
export function isPeerIdEmpty(peerId: string): boolean {
  return !peerId || peerId === "";
}

/**
 * メディアストリームの準備ができているか確認
 */
export function isMediaStreamReady(
  isReady: boolean,
  stream: MediaStream | null
): boolean {
  return isReady && stream !== null;
}
