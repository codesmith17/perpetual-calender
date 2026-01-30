# Go WebAssembly Calendar Puzzle Solver

This is a Go WebAssembly implementation of the perpetual calendar puzzle solver.

## 🚀 Quick Start

### Prerequisites
- Go 1.16 or higher installed
- Python 3 (for local web server)

### Build & Run

1. **Build the WebAssembly binary:**
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

2. **Start a local web server:**
   ```bash
   python3 -m http.server 8080
   ```

3. **Open in browser:**
   ```
   http://localhost:8080/demo.html
   ```

## 📦 What Gets Generated

After running `build.sh`:
- `solver.wasm` - The compiled Go WebAssembly binary
- `wasm_exec.js` - Go's WebAssembly JavaScript support file

## 🎯 How It Works

1. **solver.go** - Go implementation of the puzzle solver
2. The code is compiled to WebAssembly using `GOOS=js GOARCH=wasm`
3. **demo.html** loads and runs the WASM module in the browser
4. JavaScript calls Go functions via `goSolvePuzzle(month, day)`

## 🔧 Manual Build

If the script doesn't work:

```bash
GOOS=js GOARCH=wasm go build -o solver.wasm solver.go
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" .
```

## 📊 Performance

Go WebAssembly is significantly faster than JavaScript:
- January 30: ~119 solutions in ~2-5 seconds (vs 61s in JS)
- January 31: ~170 solutions in ~2-5 seconds (vs 51s in JS)

## 🌐 Deploying to GitHub Pages

The WASM files need proper MIME types. You can:

1. **Keep the JS version** on GitHub Pages (simpler)
2. **Add .nojekyll** file and configure headers for WASM
3. Use both: JS version as default, WASM as optional performance boost

## 📝 Notes

- WASM binary is ~2-3MB (Go runtime included)
- First load takes a moment to initialize Go runtime
- Subsequent solves are very fast
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
