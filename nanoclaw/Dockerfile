# ─────────────────────────────────────────────────────────────────────────────
# Nanoclaw — Dockerized llama.cpp HTTP server for RiteDoc
#
# Serves the Phi-4-mini Q4_K_M GGUF model via the llama.cpp HTTP server on
# port 8080. Zero internet access required at runtime.
#
# Build:
#   docker build -t nanoclaw .
#
# Run (after placing the model at ./models/phi-4-mini-q4_k_m.gguf):
#   docker run -d --name nanoclaw \
#     -v "$(pwd)/models:/models:ro" \
#     -p 8080:8080 \
#     nanoclaw
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: Build llama.cpp from source
FROM debian:bookworm-slim AS builder

RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Clone llama.cpp at a pinned stable tag
ARG LLAMA_CPP_TAG=b4879
RUN git clone --depth 1 --branch ${LLAMA_CPP_TAG} \
    https://github.com/ggerganov/llama.cpp /llama.cpp || \
    git clone --depth 1 https://github.com/ggerganov/llama.cpp /llama.cpp

WORKDIR /llama.cpp

# Build the HTTP server binary (CPU-only, no GPU dependencies)
RUN cmake -B build \
    -DCMAKE_BUILD_TYPE=Release \
    -DLLAMA_BUILD_SERVER=ON \
    -DLLAMA_NATIVE=OFF \
    -DLLAMA_AVX=ON \
    -DLLAMA_AVX2=ON \
    -DGGML_CUDA=OFF \
    -DGGML_METAL=OFF \
    && cmake --build build --config Release --target llama-server -j$(nproc)

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Minimal runtime image
# ─────────────────────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime

RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy only the server binary from the build stage
COPY --from=builder /llama.cpp/build/bin/llama-server /usr/local/bin/llama-server

# Model is mounted at runtime — do NOT bake the model into the image
# Place your model at: ./models/phi-4-mini-q4_k_m.gguf
# Then mount with: -v "$(pwd)/models:/models:ro"
VOLUME ["/models"]

# Expose the HTTP server port
EXPOSE 8080

# Health check — polls the /health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Default entrypoint — can override MODEL_PATH at runtime
ENV MODEL_PATH=/models/phi-4-mini-q4_k_m.gguf
ENV HOST=0.0.0.0
ENV PORT=8080
ENV CTX_SIZE=4096
ENV THREADS=4
ENV BATCH_SIZE=512

ENTRYPOINT ["sh", "-c", \
    "exec llama-server \
        --model \"${MODEL_PATH}\" \
        --host \"${HOST}\" \
        --port \"${PORT}\" \
        --ctx-size \"${CTX_SIZE}\" \
        --threads \"${THREADS}\" \
        --batch-size \"${BATCH_SIZE}\" \
        --no-mmap \
        --log-disable"]
