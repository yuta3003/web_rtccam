# 本番環境用Dockerfile
# Next.js公式推奨のマルチステージビルド

# ---------------------------------
# Dependencies stage
# ---------------------------------
FROM node:18-alpine AS deps

WORKDIR /app

# パッケージファイルをコピー
COPY webrtc/package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# ---------------------------------
# Builder stage
# ---------------------------------
FROM node:18-alpine AS builder

WORKDIR /app

# 依存関係をコピー
COPY webrtc/package*.json ./
RUN npm ci

# ソースコードをコピー
COPY webrtc/ ./

# Next.jsビルド
RUN npm run build

# ---------------------------------
# Runner stage
# ---------------------------------
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# システムユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 必要なファイルのみをコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
