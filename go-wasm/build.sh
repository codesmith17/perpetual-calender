#!/bin/bash

set -e  # Exit on error

echo "🔨 Building Go WebAssembly Calendar Puzzle Solver..."
echo ""

# Build with optimization flags
echo "📦 Compiling Go to WebAssembly..."
GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o solver.wasm solver.go

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Generated solver.wasm"
    
    # Copy wasm_exec.js from Go installation (try both possible paths)
    echo "📋 Copying Go WASM runtime..."
    if [ -f "$(go env GOROOT)/misc/wasm/wasm_exec.js" ]; then
        cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" .
    elif [ -f "$(go env GOROOT)/lib/wasm/wasm_exec.js" ]; then
        cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
    else
        echo "⚠️  Could not find wasm_exec.js automatically"
        echo "Please copy it manually from your Go installation"
        exit 1
    fi
    echo "✅ Copied wasm_exec.js"
    
    # Copy files to root directory for deployment
    echo ""
    echo "🚀 Deploying to root directory..."
    cp solver.wasm ../
    cp wasm_exec.js ../
    echo "✅ Copied solver.wasm and wasm_exec.js to root"
    
    # Show file sizes
    echo ""
    echo "📊 Build Summary:"
    ls -lh solver.wasm wasm_exec.js | awk '{print "   " $9 ": " $5}'
    
    echo ""
    echo "✨ Done! Your site is ready to deploy to GitHub Pages."
    echo ""
    echo "To test locally:"
    echo "   cd .. && python3 -m http.server 8080"
    echo "   Then open: http://localhost:8080"
else
    echo "❌ Build failed"
    exit 1
fi
