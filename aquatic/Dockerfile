FROM rust:bookworm AS build
WORKDIR /src
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ca-certificates build-essential cmake pkg-config clang \
 && rm -rf /var/lib/apt/lists/*
RUN git clone --depth=1 https://github.com/greatest-ape/aquatic.git .
RUN cargo build --release -p aquatic_ws

FROM debian:bookworm-slim
RUN useradd -r -u 10001 -g nogroup aquatic && mkdir -p /var/lib/aquatic
COPY --from=build /src/target/release/aquatic_ws /usr/local/bin/aquatic_ws
WORKDIR /var/lib/aquatic
USER 10001:65534
ENTRYPOINT ["aquatic_ws"]
CMD ["-c","/var/lib/aquatic/aquatic-ws-config.toml"]

