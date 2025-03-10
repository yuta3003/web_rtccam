# ---------------------------------
# Rust build stage
# ---------------------------------
# FROM debian:stable-slim AS rust_builder
FROM debian:bullseye-slim AS rust_builder

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
RUN rustup update

WORKDIR /signaling
COPY ./signaling ./
RUN cargo build --release

# ---------------------------------
# Node.js build stage
# ---------------------------------
FROM debian:bullseye-slim

RUN apt-get update && \
    apt-get install -y \
        ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=rust_builder /signaling/target/release/signaling ./

EXPOSE 8080
CMD ["/app/signaling"]
