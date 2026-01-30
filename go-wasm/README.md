# Go WebAssembly Calendar Puzzle Solver

This folder contains the Go implementation of the calendar puzzle solver, compiled to WebAssembly.

## 🚀 Quick Build

```bash
./build.sh
```

This will:
1. Compile Go to WebAssembly with optimizations
2. Copy `wasm_exec.js` from your Go installation
3. Deploy both files to the root directory for GitHub Pages

## 📦 What Gets Generated

- `solver.wasm` - The compiled Go WebAssembly binary (~2.8 MB)
- `wasm_exec.js` - Go's WebAssembly runtime support (~17 KB)

Both files are automatically copied to the root directory for deployment.

## 🔧 Manual Build

If you need to build manually:

```bash
GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o solver.wasm solver.go
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
cp solver.wasm wasm_exec.js ../
```

## 📊 Performance

Go WebAssembly is significantly faster than pure JavaScript:
- Finds 10 solutions in ~2-3 seconds (vs 60+ seconds in JS)
- Runs in Web Worker for non-blocking UI
- Same beautiful interface, blazing-fast backend

## 🎯 Algorithm

The solver uses:
- Backtracking with early termination
- Bitmask for piece tracking (fast operations)
- Finds up to 10 solutions per date
- Console logs to verify Go is running

## 📝 Files

- `solver.go` - Main Go solver implementation
- `build.sh` - Build and deployment script
- `go.mod` - Go module definition
- `.gitignore` - Ignore build artifacts
