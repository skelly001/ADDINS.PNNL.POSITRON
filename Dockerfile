# Multi-stage Dockerfile for sandbox-sync development environment
# Provides Rust, Node.js, R, and all tools needed for building and testing

FROM ubuntu:22.04 AS base

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install base system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    gnupg \
    lsb-release \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# Rust Installation
# ============================================================================
FROM base AS rust-builder

# Install Rust via rustup
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile default \
    && chmod -R a+w $RUSTUP_HOME $CARGO_HOME

# Install additional Rust components and tools
RUN rustup component add rustfmt clippy \
    && cargo install cargo-watch cargo-audit

# Add cross-compilation targets
RUN rustup target add x86_64-unknown-linux-musl \
    && rustup target add x86_64-pc-windows-gnu \
    && rustup target add x86_64-apple-darwin \
    && rustup target add aarch64-apple-darwin

# Install cross-compilation toolchains
RUN apt-get update && apt-get install -y \
    musl-tools \
    mingw-w64 \
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# Node.js Installation
# ============================================================================
FROM rust-builder AS node-builder

# Install Node.js 20.x LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages for VS Code extension development
RUN npm install -g \
    @vscode/vsce \
    typescript \
    eslint \
    prettier \
    ts-node \
    && npm cache clean --force

# ============================================================================
# R Installation
# ============================================================================
FROM node-builder AS r-builder

# Add R repository and install R
RUN wget -qO- https://cloud.r-project.org/bin/linux/ubuntu/marutter_pubkey.asc | tee -a /etc/apt/trusted.gpg.d/cran_ubuntu_key.asc \
    && echo "deb https://cloud.r-project.org/bin/linux/ubuntu $(lsb_release -cs)-cran40/" | tee -a /etc/apt/sources.list.d/cran-r.list \
    && apt-get update \
    && apt-get install -y \
        r-base \
        r-base-dev \
        r-recommended \
    && rm -rf /var/lib/apt/lists/*

# Install essential R packages
RUN R -e "install.packages(c('jsonlite', 'testthat'), repos='https://cloud.r-project.org/')"

# ============================================================================
# Final Development Image
# ============================================================================
FROM r-builder AS development

# Create non-root user for development
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Install additional development utilities
RUN apt-get update && apt-get install -y \
    vim \
    nano \
    less \
    tree \
    jq \
    ripgrep \
    fd-find \
    bat \
    && rm -rf /var/lib/apt/lists/*

# Set up workspace directory
WORKDIR /workspace

# Create test directories matching the project requirements
RUN mkdir -p /test-scripts /test-data \
    && chown -R $USERNAME:$USERNAME /test-scripts /test-data

# Create cargo and npm cache directories
RUN mkdir -p /home/$USERNAME/.cargo /home/$USERNAME/.npm \
    && chown -R $USERNAME:$USERNAME /home/$USERNAME/.cargo /home/$USERNAME/.npm

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER $USERNAME

# Set environment variables for the development user
ENV PATH=/home/$USERNAME/.cargo/bin:/usr/local/cargo/bin:$PATH \
    CARGO_HOME=/home/$USERNAME/.cargo \
    RUSTUP_HOME=/usr/local/rustup \
    NODE_ENV=development

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD command -v cargo && command -v node && command -v R || exit 1

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Default command: start an interactive bash shell
CMD ["/bin/bash"]

# Expose common development ports (if needed for future extensions)
# Port 3000 for potential web UI, 9229 for Node debugging
EXPOSE 3000 9229

# Labels for metadata
LABEL maintainer="PNNL Development Team"
LABEL description="Development environment for sandbox-sync tool (Rust + Node.js + R)"
LABEL version="1.0"
