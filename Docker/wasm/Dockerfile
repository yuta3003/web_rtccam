# ---------------------------------
# Rust build stage
# ---------------------------------
FROM debian:stable-slim AS rust_builder

RUN apt-get update && \
    apt-get install -y \
        curl \
        libssl-dev \
        build-essential \
        pkg-config \
    && apt-get clean \
	&& rm -rf /var/lib/apt/lists/*

ENV RUST_HOME=/usr/local/lib/rust
ENV RUSTUP_HOME=${RUST_HOME}/rustup
ENV CARGO_HOME=${RUST_HOME}/cargo
ENV PATH="${CARGO_HOME}/bin:${PATH}"

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable

RUN rustup update && \
    rustup target add wasm32-unknown-unknown

RUN cargo install \
        wasm-pack \
        cargo-make

WORKDIR /wasm
COPY ./wasm ./
RUN wasm-pack build --target web

# ---------------------------------
# Node.js build stage
# ---------------------------------
#FROM node:18-slim AS node_builder
FROM node:18-slim

#RUN npm install @wasm-tool/wasm-pack-plugin

WORKDIR /webrtc
COPY ./webrtc ./
# COPY --from=rust_builder /wasm/pkg ./src/wasm

#RUN npm install
#RUN npm run build
