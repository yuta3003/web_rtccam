# WebRTC Camera Project

WebRTCを使ったリアルタイムビデオ通信アプリケーション

**✅ 動作確認済み - P2P接続によるリアルタイムビデオ通話が実装完了**

## プロジェクト構成

```
web_rtccam/
├── signaling/                  # Rustで実装したシグナリングサーバー
│   ├── src/main.rs
│   └── Cargo.toml
├── wasm/                      # Rustで実装したWASMモジュール（カメラアクセス用）
│   ├── src/lib.rs
│   └── Cargo.toml
├── webrtc/                    # Next.js (React) フロントエンド
│   ├── src/
│   │   ├── app/page.tsx       # メインのWebRTC実装
│   │   └── components/
│   ├── package.json
│   └── .dockerignore
├── Docker/                    # Dockerfiles
│   ├── signaling/Dockerfile   # シグナリングサーバー用
│   ├── webrtc/
│   │   ├── Dockerfile.dev     # フロントエンド開発環境用
│   │   └── Dockerfile         # フロントエンド本番環境用
│   └── wasm/Dockerfile        # WASM用
├── docker-compose.yml         # 開発環境用Docker Compose設定
├── docker-compose.prod.yml    # 本番環境用Docker Compose設定
└── test_signaling.sh          # 接続テストスクリプト
```

## 技術スタック

### バックエンド (シグナリングサーバー)
- **言語**: Rust
- **フレームワーク**: actix-web
- **WebSocket**: actix-web-actors
- **ポート**: 8080

### フロントエンド
- **フレームワーク**: Next.js 15.2.1
- **言語**: TypeScript
- **WebRTC**: ネイティブAPI (RTCPeerConnection)
- **WebSocket**: ネイティブAPI
- **STUN**: Google公開STUNサーバー


## 起動方法

**開発環境:**
```bash
docker compose up -d --build
docker compose logs -f
```

**本番環境:**
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f
```
