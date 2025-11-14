#!/bin/bash
# Simulate Render deployment

echo "=== Simulating Render deployment ==="
echo "1. Checking git commit..."
git log --oneline -1

echo -e "\n2. Checking concepts.ts exports..."
grep "export let AdaptiveSchedule" src/concepts/concepts.ts

echo -e "\n3. Starting server (like Render does)..."
deno run --allow-net --allow-write --allow-read --allow-sys --allow-env src/main.ts
