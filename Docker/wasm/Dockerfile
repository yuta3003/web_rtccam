# Rust build stage
#FROM debian:stable-slim AS rust_builder
FROM debian:stable-slim

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

WORKDIR /src
COPY ./wasm ./
RUN wasm-pack build --target web
