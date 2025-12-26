import { useEffect, useState, useRef, RefObject } from 'react';
import { MEDIA_CONSTRAINTS } from '@/utils/webrtc-constants';

export interface UseMediaStreamOptions {
  /**
   * ローカルビデオ要素のRef
   * ストリームを自動的にこの要素に設定する
   */
  videoRef?: RefObject<HTMLVideoElement>;

  /**
   * メディア制約（デフォルト: MEDIA_CONSTRAINTS）
   */
  constraints?: MediaStreamConstraints;
}

export interface UseMediaStreamReturn {
  /**
   * ローカルメディアストリーム
   */
  stream: MediaStream | null;

  /**
   * ストリームの準備が完了しているか
   */
  isReady: boolean;

  /**
   * エラー情報
   */
  error: Error | null;

  /**
   * ストリームを再取得する
   */
  retry: () => void;
}

/**
 * カメラ・マイクへのアクセスを管理するカスタムフック
 *
 * @example
 * ```tsx
 * const localVideoRef = useRef<HTMLVideoElement>(null);
 * const { stream, isReady, error } = useMediaStream({ videoRef: localVideoRef });
 * ```
 */
export function useMediaStream(options: UseMediaStreamOptions = {}): UseMediaStreamReturn {
  const { videoRef, constraints = MEDIA_CONSTRAINTS } = options;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const initMediaStream = async () => {
      try {
        console.log("📹 カメラ・マイクアクセス開始...");

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!isMounted) {
          // コンポーネントがアンマウントされていたらストリームを停止
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        // ストリームを保存
        setStream(mediaStream);
        setError(null);

        // ビデオ要素が指定されている場合、ストリームを設定
        if (videoRef?.current) {
          videoRef.current.srcObject = mediaStream;
        }

        setIsReady(true);
        console.log("✅ ローカルストリーム取得成功");
      } catch (err) {
        console.error("❌ メディアデバイスアクセスエラー:", err);

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsReady(false);

        // ユーザーに通知
        alert("カメラ・マイクへのアクセスが拒否されました");
      }
    };

    initMediaStream();

    // クリーンアップ: ストリームを停止
    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log(`🛑 トラック停止: ${track.kind}`);
        });
      }
    };
  }, [constraints, retryCount]); // videoRefは依存配列に含めない（Refは変わらないため）

  /**
   * ストリームの再取得を試みる
   */
  const retry = () => {
    setRetryCount(prev => prev + 1);
  };

  return {
    stream,
    isReady,
    error,
    retry,
  };
}
