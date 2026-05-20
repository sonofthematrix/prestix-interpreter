#!/usr/bin/env bash
# Prestix Desktop Launcher (Linux/macOS)
# Starts Next.js dev server + Electron window

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

APP_URL="http://localhost:4318"
DEV_PID=""
STARTED_DEV=0

cleanup() {
    if [[ "$STARTED_DEV" -eq 1 && -n "$DEV_PID" ]]; then
        echo "Shutting down dev server..."
        kill "$DEV_PID" 2>/dev/null || true
    fi
}

server_ready() {
    curl -fsS "$APP_URL" > /dev/null 2>&1
}

trap cleanup EXIT INT TERM

echo "=== Prestix Desktop ==="

if ! command -v bun > /dev/null 2>&1; then
    echo "Error: bun is not installed or not available on PATH."
    exit 1
fi

if ! command -v curl > /dev/null 2>&1; then
    echo "Error: curl is required to wait for the Next.js dev server."
    exit 1
fi

if server_ready; then
    echo "Next.js dev server already running on :4318."
else
    echo "Starting Next.js dev server on :4318 ..."
    bun run dev &
    DEV_PID=$!
    STARTED_DEV=1

    # Wait for server to be ready
    echo "Waiting for server..."
    for _ in $(seq 1 60); do
        if server_ready; then
            echo "Server ready!"
            break
        fi

        if ! kill -0 "$DEV_PID" 2>/dev/null; then
            echo "Error: Next.js dev server stopped before it became ready."
            exit 1
        fi

        sleep 1
    done

    if ! server_ready; then
        echo "Error: Next.js dev server did not become ready at $APP_URL."
        exit 1
    fi
fi

echo "Launching Electron..."
bun run desktop:electron
