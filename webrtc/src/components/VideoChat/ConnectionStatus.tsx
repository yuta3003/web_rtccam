import { getConnectionStateColor } from '@/utils/webrtc-helpers';

export interface ConnectionStatusProps {
  /**
   * クライアントID
   */
  clientId: string | null;

  /**
   * 接続状態
   */
  connectionState: string;
}

/**
 * 接続状態とクライアントIDを表示するコンポーネント
 */
export function ConnectionStatus({ clientId, connectionState }: ConnectionStatusProps) {
  return (
    <div className="w-full max-w-4xl space-y-4">
      {/* 接続状態インジケーター */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-gray-300">接続状態:</span>
        <div className={`w-3 h-3 rounded-full ${getConnectionStateColor(connectionState)}`}></div>
        <span className="font-mono text-white">{connectionState}</span>
      </div>

      {/* クライアントID */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-400 mb-1 text-center">Your Client ID:</p>
        <p className="font-mono text-lg text-white text-center">
          {clientId || "Connecting..."}
        </p>
      </div>
    </div>
  );
}
