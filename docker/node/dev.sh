#!/bin/sh
# Starts the Vite dev server in the `vite` container. node_modules lives in a Docker
# volume (Linux builds of the native packages, separate from the host's), and is
# reinstalled whenever package-lock.json changes.
set -e

lock_hash=$(md5sum package-lock.json | cut -d ' ' -f 1)
if [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$lock_hash" ]; then
    npm ci --ignore-scripts --no-audit --no-fund
    echo "$lock_hash" > node_modules/.lock-hash
fi

exec node_modules/.bin/vite
