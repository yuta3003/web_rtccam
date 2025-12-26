import { RefObject } from 'react';

export interface VideoDisplayProps {
  /**
   * ローカルビデオ要素のRef
   */
  localVideoRef: RefObject<HTMLVideoElement>;

  /**
   * リモートビデオ要素のRef
   */
  remoteVideoRef: RefObject<HTMLVideoElement>;

  /**
   * ローカルビデオのラベル
   */
  localLabel?: string;

  /**
   * リモートビデオのラベル
   */
  remoteLabel?: string;
}

/**
 * ローカルとリモートのビデオを表示するコンポーネント
 */
export function VideoDisplay({
  localVideoRef,
  remoteVideoRef,
  localLabel = 'Your Video',
  remoteLabel = 'Remote Video',
}: VideoDisplayProps) {
  return (
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
          {localLabel}
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
          {remoteLabel}
        </div>
      </div>
    </div>
  );
}
