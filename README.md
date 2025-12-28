# WebRTC Camera Project

WebRTCを使ったリアルタイムビデオ通信アプリケーション

**✅ 動作確認済み - P2P接続によるリアルタイムビデオ通話が実装完了**

## プロジェクト構成

```
web_rtccam/
├── signaling/                 # Rustで実装したシグナリングサーバー
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
├── nginx/                     # Nginxリバースプロキシ設定
│   ├── nginx.conf             # Nginx設定ファイル
│   ├── cert.pem               # SSL証明書（自己生成、.gitignoreで除外）
│   └── key.pem                # SSL秘密鍵（自己生成、.gitignoreで除外）
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


## セットアップ手順

### 1. SSL証明書の生成

WebRTCはセキュアコンテキスト（HTTPS）を要求するため、LAN内で使用する場合でもSSL証明書が必要です。

#### 方法1: OpenSSLで自己署名証明書を生成（推奨）

```bash
cd nginx

# 自己署名証明書を生成
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/CN=<あなたのIPアドレス>" \
  -addext "subjectAltName = DNS:localhost,IP:<あなたのIPアドレス>"
```

**例:**
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/CN=192.168.10.118" \
  -addext "subjectAltName = DNS:localhost,IP:192.168.10.118"
```

#### 方法2: mkcertを使用（Macで推奨）

```bash
# mkcertのインストール（Homebrewを使用）
brew install mkcert

# ローカルCA証明書のインストール
mkcert -install

# 証明書の生成
cd nginx
mkcert -cert-file cert.pem -key-file key.pem localhost <あなたのIPアドレス>
```

**注意:**
- `cert.pem` と `key.pem` は `.gitignore` で除外されているため、Gitにコミットされません
- セキュリティ上、これらのファイルは絶対に共有しないでください

### 2. アプリケーションの起動

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

### 3. アクセス方法

起動後、以下のURLでアクセスできます：

**Mac本体から:**
```
https://localhost
または
https://<あなたのIPアドレス>
```

**同じLAN内の別のデバイス（スマホ、タブレット）から:**
```
https://<あなたのIPアドレス>
```

例: `https://192.168.10.118`

### 4. モバイルデバイスでの証明書インストール

モバイルデバイス（iPhone/Android）からアクセスする場合、自己署名証明書をインストールする必要があります。

#### iPhoneの場合

1. **証明書をiPhoneに転送**
   - AirDropで `nginx/cert.pem` を送信
   - または、簡易サーバーでダウンロード:
     ```bash
     cd nginx && python3 -m http.server 8000
     ```
     iPhoneのSafariで `http://<MacのIPアドレス>:8000/cert.pem` にアクセス

2. **証明書をインストール**
   - 受信した `cert.pem` をタップ
   - 「設定」→「プロファイルがダウンロードされました」
   - 「インストール」をタップ
   - パスコードを入力

3. **証明書を信頼する（重要！）**
   - 「設定」→「一般」→「情報」
   - 一番下の「**証明書信頼設定**」をタップ
   - インストールした証明書のスイッチを**ON**
   - 警告が出るので「続ける」

#### Androidの場合

1. **証明書をAndroidに転送**
   - 上記と同様の方法で `cert.pem` を転送

2. **証明書をインストール**
   - 「設定」→「セキュリティ」→「暗号化と認証情報」
   - 「証明書のインストール」→「CA証明書」
   - ダウンロードした `cert.pem` を選択

## 使い方

1. 2つ以上のデバイスで上記URLを開く
2. カメラ・マイクのアクセス許可を与える
3. 各デバイスに **Client ID** が表示される
4. 一方のデバイスで、相手の **Client ID** を入力
5. 「接続開始」ボタンをクリック
6. P2Pビデオ通話が開始されます

## トラブルシューティング

### "このサイトは安全に接続できません"と表示される

- Macの場合: 「詳細を表示」→「このWebサイトを訪問」で進む
- iPhone/Androidの場合: 上記の証明書インストール手順を実行してください

### カメラ・マイクにアクセスできない

- HTTPSでアクセスしているか確認してください（`https://` で始まるURL）
- localhostまたはプライベートIPアドレス以外からはHTTPSが必須です

### WebSocket接続エラー

- Nginxコンテナが正常に起動しているか確認: `docker compose ps`
- ログを確認: `docker compose logs nginx`
