#!/bin/bash

echo "Building Go WebAssembly..."

# Set GOOS and GOARCH for WebAssembly with optimization flags
GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o solver.wasm solver.go

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Generated solver.wasm"
    
    # Copy wasm_exec.js from Go installation (try both possible paths)
    if [ -f "$(go env GOROOT)/misc/wasm/wasm_exec.js" ]; then
        cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" .
    elif [ -f "$(go env GOROOT)/lib/wasm/wasm_exec.js" ]; then
        cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
    else
        echo "⚠️  Could not find wasm_exec.js automatically"
        echo "Please copy it manually from your Go installation"
    fi
    
    echo "✅ Copied wasm_exec.js"
    echo ""
    echo "To test, run: python3 -m http.server 8080"
    echo "Then open: http://localhost:8080/demo.html"
else
    echo "❌ Build failed"
    exit 1
fi
