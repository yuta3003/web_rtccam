export interface ConnectionControlsProps {
  /**
   * 入力されたPeer ID
   */
  peerId: string;

  /**
   * Peer ID変更時のハンドラー
   */
  onPeerIdChange: (peerId: string) => void;

  /**
   * 接続開始ボタンクリック時のハンドラー
   */
  onConnect: () => void;

  /**
   * ローカルストリームが準備できているか
   */
  isStreamReady: boolean;

  /**
   * 無効化するかどうか
   */
  disabled?: boolean;
}

/**
 * 接続コントロール（Peer ID入力 + 接続ボタン）コンポーネント
 */
export function ConnectionControls({
  peerId,
  onPeerIdChange,
  onConnect,
  isStreamReady,
  disabled = false,
}: ConnectionControlsProps) {
  const canConnect = isStreamReady && peerId.trim() !== '' && !disabled;

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-800 rounded-lg">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="相手の Client ID を入力"
          value={peerId}
          onChange={(e) => onPeerIdChange(e.target.value)}
          className="border-2 border-gray-600 bg-gray-700 p-3 rounded-lg text-white font-mono w-80"
          disabled={disabled}
        />
        <button
          onClick={onConnect}
          disabled={!canConnect}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
        >
          接続開始
        </button>
      </div>

      {/* ステータスメッセージ */}
      {!isStreamReady && (
        <p className="text-yellow-400 text-sm">カメラ・マイクの準備中...</p>
      )}
    </div>
  );
}
