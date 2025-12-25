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

## Docker化のメリット

✅ **環境構築不要**: Node.js、Rustのインストール不要
✅ **一貫性**: どの環境でも同じように動作
✅ **簡単起動**: 1コマンドで全サービス起動
✅ **分離**: ホストシステムを汚さない
✅ **スケーラブル**: 本番環境へのデプロイが容易

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

### アーキテクチャ

```
ブラウザ1                シグナリングサーバー              ブラウザ2
  |                            (Rust)                      |
  |-------- WebSocket ---------|-------- WebSocket --------|
  |                                                         |
  |<----------- SDP Offer/Answer交換（初期設定）----------->|
  |<----------- ICE Candidate交換（接続経路）-------------->|
  |                                                         |
  |============== P2P接続（直接通信） ====================|
  |         ビデオ・オーディオストリーム                    |
```

## 起動方法

### 方法1: Docker Composeで全て起動（推奨）

**開発環境（ホットリロード有効）:**
```bash
# 全サービスを起動
docker compose up -d --build

# 起動確認
docker compose ps

# ログ確認（リアルタイム）
docker compose logs -f

# 特定のサービスのログのみ確認
docker compose logs -f webrtc
docker compose logs -f signaling-server
```

**本番環境:**
```bash
# 本番環境用の設定で起動
docker compose -f docker-compose.prod.yml up -d --build

# ログ確認
docker compose -f docker-compose.prod.yml logs -f
```

**期待される出力:**
```
NAME                            SERVICE            STATUS          PORTS
web_rtccam-webrtc-1            webrtc             Up              0.0.0.0:3000->3000/tcp
web_rtccam-signaling-server-1  signaling-server   Up              0.0.0.0:8080->8080/tcp
```

ブラウザで `http://localhost:3000` にアクセス

### 方法2: 個別に起動

**シグナリングサーバーのみ:**
```bash
docker compose up -d --build signaling-server
```

**フロントエンドのみ（ローカル開発）:**
```bash
cd webrtc
npm install              # 初回のみ
npm run dev
```

**起動確認:**
```
▲ Next.js 15.2.1 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
✓ Ready in XXXms
```

## 使い方（ビデオ通話）

### ステップ1: 2つのブラウザを準備

**推奨方法:**
- **ブラウザ1**: http://localhost:3000（通常モード）
- **ブラウザ2**: http://localhost:3000（シークレットモード）

または異なるブラウザ（Chrome + Safari など）を使用

### ステップ2: カメラ・マイクの許可

両方のブラウザで、カメラとマイクへのアクセスを**許可**してください。

- 画面に「Your Video」が表示されればOK
- 「ローカルストリーム: ✅ 準備完了」と表示される

### ステップ3: Client IDの確認

各ブラウザに表示される「Your Client ID」をメモします。

**例:**
```
ブラウザ1: d937a391-46cd-4029-8d2e-d95c54609227
ブラウザ2: f2184cd9-10f3-4b2f-a160-aeb984cdfaa7
```

### ステップ4: 接続開始

1. **ブラウザ1**のClient IDをコピー
2. **ブラウザ2**で:
   - 入力欄にブラウザ1のClient IDをペースト
   - 「接続開始」ボタンをクリック

### ステップ5: 接続完了

- 接続状態が 🟢 **緑色（connected）** になる
- 両方のブラウザで相手のビデオが「Remote Video」に表示される
- 音声も聞こえる（ハウリング防止のため、ローカルは自動ミュート）

**シグナリングサーバーのログ例:**
```
🌐 新規 WebSocket 接続: d937a391-46cd-4029-8d2e-d95c54609227
✅ WebSocket 接続確立: d937a391-46cd-4029-8d2e-d95c54609227
🌐 新規 WebSocket 接続: f2184cd9-10f3-4b2f-a160-aeb984cdfaa7
✅ WebSocket 接続確立: f2184cd9-10f3-4b2f-a160-aeb984cdfaa7
📩 受信: "f2184cd9-..." -> "d937a391-..."
📤 転送成功: d937a391-...
📩 受信: "d937a391-..." -> "f2184cd9-..."
📤 転送成功: f2184cd9-...
```

## シグナリングサーバー接続テスト

### 基本的な接続テスト

```bash
# websocatを使った接続テスト
websocat ws://127.0.0.1:8080/ws

# 出力例:
# {"type": "welcome", "id": "6feb37af-a2a6-44df-8a32-2715c3051662"}
```

### 自動テストスクリプト

```bash
./test_signaling.sh
```

### 手動でのメッセージ中継テスト

**ターミナル1（受信側）:**
```bash
websocat ws://127.0.0.1:8080/ws
# welcomeメッセージが表示される
# {"type": "welcome", "id": "aaa-111-bbb"}  ← このIDをメモ
```

**ターミナル2（送信側）:**
```bash
websocat ws://127.0.0.1:8080/ws
# welcomeメッセージが表示される
# {"type": "welcome", "id": "xxx-222-yyy"}  ← このIDをメモ

# 以下を入力してEnter（受信側のIDを使用）
{"from":"xxx-222-yyy","to":"aaa-111-bbb","sdp":{"type":"offer","sdp":"test"},"candidate":null}
```

→ ターミナル1でメッセージが受信される

## WebRTCの仕組み

### SDP (Session Description Protocol)

**SDPとは**: ピア間の接続情報を記述したテキスト

**含まれる情報**:
- メディア情報（ビデオ、オーディオ、コーデック）
- ネットワーク情報（IPアドレス、ポート）
- 暗号化設定

**交換フロー**:
```
クライアントA                    クライアントB
    |                                |
    |-- 1. SDP Offer --------------->|
    |   "こういう設定で通信できます"    |
    |                                |
    |<-- 2. SDP Answer --------------|
    |   "この設定で応答します"         |
```

### ICE Candidate

**ICE Candidateとは**: 実際の接続経路の候補（IPアドレス + ポート番号）

**種類**:
1. **Host Candidate**: ローカルIPアドレス（例: 192.168.1.100:54321）
2. **Server Reflexive (srflx)**: STUNサーバーが教えるグローバルIP（例: 1.2.3.4:12345）
3. **Relay**: TURNサーバー経由の中継（最終手段）

**交換フロー**:
```
クライアントA                          クライアントB
    |                                      |
    |-- SDP Offer ----------------------->|
    |<-- SDP Answer -----------------------|
    |                                      |
    |-- ICE Candidate 1 ----------------->|
    |-- ICE Candidate 2 ----------------->|
    |<-- ICE Candidate 1 ------------------|
    |<-- ICE Candidate 2 ------------------|
    |                                      |
    |== 全候補を試して最適な経路を選択 ===|
    |======= P2P接続確立 =================|
```

**このプロジェクトの設定:**
```typescript
// webrtc/src/app/page.tsx
iceServers: [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
]
```

### メッセージフォーマット

シグナリングサーバーとの通信で使用するJSON形式:

```json
{
  "from": "送信元クライアントID",
  "to": "送信先クライアントID",
  "sdp": {
    "type": "offer",
    "sdp": "v=0\r\no=- 123456..."
  },
  "candidate": {
    "candidate": "candidate:1 1 UDP...",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

## 実装状況

### ✅ 実装完了

- [x] **シグナリングサーバー**（Rust/actix-web）
  - WebSocket接続管理
  - クライアントID自動割り当て（UUID v4）
  - SDP/ICE Candidateメッセージの中継
  - 絵文字付きログ出力

- [x] **STUN/TURNサーバー設定**
  - Google公開STUNサーバー2台設定
  - NAT越え接続が可能

- [x] **メディアストリーム実装**
  - カメラ/マイクアクセス（`getUserMedia`）
  - ビデオ/オーディオトラックの送信（`addTrack`）
  - リモートストリームの受信・表示（`ontrack`）
  - エラーハンドリング

- [x] **WebRTCシグナリングフロー**
  - SDP Offer/Answer作成・交換
  - ICE Candidate交換
  - RTCPeerConnection初期化
  - トラック重複追加の防止

- [x] **UI実装**
  - ダークテーマデザイン
  - ローカルビデオプレビュー
  - リモートビデオ表示
  - 接続状態インジケーター（色付き）
  - クライアントID表示
  - Peer ID入力フィールド
  - 接続開始ボタン
  - レスポンシブデザイン

- [x] **接続フロー**
  - ページロード時のカメラ・マイク自動取得
  - WebSocket自動接続
  - ストリームのクリーンアップ処理

- [x] **Docker化**
  - フロントエンド開発環境（Dockerfile.dev）
  - フロントエンド本番環境（Dockerfile）
  - シグナリングサーバー（Dockerfile）
  - Docker Compose設定（開発・本番）
  - ホットリロード対応
  - ボリュームマウント

### 動作確認済みの機能

✅ P2P接続確立
✅ リアルタイムビデオ通話
✅ オーディオ送受信
✅ 異なるネットワーク間の接続（STUN経由）
✅ 複数クライアントの同時接続

## トラブルシューティング

### カメラ・マイクが使えない

**症状**: カメラ映像が表示されない

**解決方法**:
1. ブラウザの設定でカメラ・マイクの権限を確認
2. HTTPSまたはlocalhostで実行していることを確認（WebRTCの制約）
3. 他のアプリケーションがカメラを使用していないか確認
4. ブラウザコンソールでエラーメッセージを確認

```bash
# ブラウザコンソールで以下を確認
❌ メディアデバイスアクセスエラー: NotAllowedError
→ カメラ・マイクの権限を許可してください
```

### シグナリングサーバーに接続できない

**症状**: 「Your Client ID」が「Connecting...」のまま

**解決方法**:
```bash
# サーバーが起動しているか確認
docker compose ps

# ログを確認
docker compose logs signaling-server

# サーバー再起動
docker compose restart signaling-server
```

### P2P接続が確立しない

**症状**: 接続状態が「failed」または「disconnected」のまま

**解決方法**:

1. **ブラウザコンソールを確認**
   - F12キーで開発者ツールを開く
   - コンソールタブでエラーを確認

2. **ICE Candidate生成を確認**
   ```
   期待されるログ:
   📡 ICE Candidate 生成: ...
   🔄 ICE Gathering State: gathering → complete
   🔄 ICE Connection State: checking → connected
   ```

3. **シグナリングサーバーのログを確認**
   ```bash
   docker compose logs -f signaling-server

   # 以下のログが出ていればOK:
   📩 受信: "クライアント1" -> "クライアント2"
   📤 転送成功: クライアント2
   ```

4. **ファイアウォール設定を確認**
   - UDPポートがブロックされていないか確認
   - 企業ネットワークの場合、ネットワーク管理者に確認

### 片方だけビデオが表示されない

**症状**: 自分のビデオは見えるが、相手のビデオが表示されない

**解決方法**:
1. 両方のブラウザでカメラ・マイクを許可したか確認
2. 「接続開始」ボタンをクリックしたか確認
3. 正しいClient IDを入力したか確認（コピペ推奨）
4. ブラウザをリロードして再接続

### 音声が聞こえない

**症状**: ビデオは見えるが音声が聞こえない

**確認事項**:
- ローカルビデオは自動ミュート（ハウリング防止）
- リモートビデオの音量を確認
- ブラウザの音声設定を確認
- マイクがミュートになっていないか確認

## デバッグ方法

### ブラウザコンソールログ

F12キーで開発者ツールを開いて、詳細なログを確認できます:

**正常な接続フロー:**
```
📹 カメラ・マイクアクセス開始...
✅ ローカルストリーム取得成功
✅ WebSocket Connected
🆔 Assigned Client ID: d937a391-46cd-4029-8d2e-d95c54609227
⚡ 接続開始: ローカルトラックを追加
➕ トラック追加: video ...
➕ トラック追加: audio ...
📤 WebSocket 送信: ...SDP Offer...
🔄 ICE Gathering State: gathering
📡 ICE Candidate 生成: ...
📩 WebSocket 受信: ...SDP Answer...
✅ setRemoteDescription 完了
📥 リモートトラック受信: MediaStream
✅ リモートビデオ設定完了
🔄 ICE Connection State: connected
```

### シグナリングサーバーログ

```bash
docker compose logs -f signaling-server
```

**正常なログ:**
```
🌐 新規 WebSocket 接続: <UUID>
✅ WebSocket 接続確立: <UUID>
📩 受信: "<from>" -> "<to>"
📤 転送成功: <UUID>
```

## 今後の拡張機能（オプション）

以下の機能を追加できます：

### 基本機能
1. **切断ボタン**: 接続を明示的に終了
2. **カメラ/マイクのON/OFF**: トラックの有効/無効切り替え
3. **デバイス選択**: 複数カメラ・マイクの選択機能

### 高度な機能
4. **画面共有**: `getDisplayMedia()` を使った画面共有
5. **チャット機能**: RTCDataChannel を使ったテキストメッセージ
6. **録画機能**: MediaRecorder API でビデオ録画
7. **ネットワーク統計**: `getStats()` で帯域幅・レイテンシ表示
8. **複数人通話**: メッシュ型またはSFU型のマルチパーティ接続
9. **ルーム機能**: 複数のルームで通話を分離

### UI/UX改善
10. QRコード生成: Client IDをQRコードで共有
11. ニックネーム設定: Client IDの代わりに表示名を使用
12. 通話履歴: 過去の接続履歴を保存

## コマンドリファレンス

### Docker Compose（推奨）

```bash
# 開発環境
docker compose up -d --build          # 全サービスをバックグラウンドで起動
docker compose up -d webrtc           # フロントエンドのみ起動
docker compose up -d signaling-server # シグナリングサーバーのみ起動
docker compose down                   # 全サービス停止・削除
docker compose logs -f                # 全サービスのログ監視
docker compose logs -f webrtc         # フロントエンドのログ監視
docker compose logs -f signaling-server  # シグナリングサーバーのログ監視
docker compose restart webrtc         # フロントエンド再起動
docker compose ps                     # コンテナ状態確認

# 本番環境
docker compose -f docker-compose.prod.yml up -d --build  # 本番環境で起動
docker compose -f docker-compose.prod.yml down           # 本番環境停止
docker compose -f docker-compose.prod.yml logs -f        # 本番環境ログ監視

# キャッシュクリア
docker compose build --no-cache       # キャッシュを使わずビルド
docker compose down -v                # ボリュームも含めて削除
```

### フロントエンド（ローカル開発）

```bash
cd webrtc
npm install                           # 依存関係インストール
npm run dev                           # 開発サーバー起動（ホットリロード）
npm run build                         # 本番ビルド
npm start                             # 本番サーバー起動
npm run lint                          # リント実行
```

### 接続テスト

```bash
./test_signaling.sh                   # 自動テストスクリプト
websocat ws://127.0.0.1:8080/ws      # 手動接続テスト
```

### トラブルシューティングコマンド

```bash
# ポート使用状況確認
lsof -i :3000                         # フロントエンドポート
lsof -i :8080                         # シグナリングサーバーポート

# Dockerボリュームの削除（クリーンスタート）
docker compose down -v
docker volume prune

# Dockerイメージの削除
docker compose down --rmi all

# コンテナ内に入る
docker compose exec webrtc sh
docker compose exec signaling-server sh
```

## 開発環境

- **Node.js**: 18.x以上推奨
- **Rust**: 1.70以上
- **Docker**: 20.x以上
- **Docker Compose**: v2以上

## ライセンス

MIT

## 参考リンク

- [WebRTC API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [RTCPeerConnection - MDN](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)
- [actix-web](https://actix.rs/)
- [Next.js](https://nextjs.org/)
- [WebRTC Samples](https://webrtc.github.io/samples/)

## 貢献

バグ報告や機能リクエストは Issue でお願いします。
