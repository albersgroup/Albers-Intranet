FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Native build/runtime deps shared by both apps:
#  - build-essential, python3: node-gyp (bcrypt) and Ruby native extension builds
#  - libpq-dev, postgresql-client: pg gem + psql
#  - libvips: Rails image processing
#  - libyaml-dev, pkg-config: Ruby build requirements
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libvips \
        libyaml-dev \
        pkg-config \
        postgresql-client \
        python3 \
    && rm -rf /var/lib/apt/lists/*

USER vscode

# mise reads .mise.toml (root: Node 24) and rails/.mise.toml (Ruby 3.3.6),
# keeping the container's toolchain identical to what local dev already pins.
ENV MISE_DATA_DIR="/home/vscode/.local/share/mise" \
    PATH="/home/vscode/.local/bin:/home/vscode/.local/share/mise/shims:${PATH}"
RUN curl https://mise.run | sh
