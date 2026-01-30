# 🗓️ Perpetual Calendar Puzzle Solver

A beautiful web-based solver for the perpetual calendar puzzle (also known as the daily calendar puzzle or 365-day puzzle). This puzzle challenges you to arrange 8 wooden pieces to cover all cells on a calendar board except for the current month and date.

![Puzzle Demo](https://img.shields.io/badge/Puzzle-Daily%20Calendar-blue)
![Status](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎯 About the Puzzle

The perpetual calendar puzzle is a spatial logic puzzle where:
- You have a board with 12 months and 31 days
- You have 8 wooden pieces of different shapes
- Goal: Arrange all pieces so **only** today's month and date remain visible
- Every date has at least one valid solution!

## ✨ Features

- 🎨 **Beautiful UI**: Modern, responsive design with smooth animations
- ⚡ **Blazing Fast**: Powered by Go WebAssembly for maximum performance
- 💾 **Smart Caching**: LocalStorage caching for instant repeated lookups
- 🎯 **Any Date**: Solve for any date (past, present, or future)
- 📱 **Responsive**: Works perfectly on desktop, tablet, and mobile
- 🌈 **Color-Coded**: Each puzzle piece has a unique color
- 🔧 **Web Worker**: Non-blocking background computation

## 🚀 Quick Start

### Option 1: Open Locally
1. Clone this repository
2. Open `index.html` in your web browser
3. That's it! No build process or dependencies needed

### Option 2: Direct Download
1. Download the repository as ZIP
2. Extract and open `index.html`
3. Start solving puzzles!

## 🎮 How to Use

1. **Select a date**: Choose any month and day from the dropdowns
2. **Click "Solve Puzzle"**: The algorithm will find a solution
3. **View the solution**: Colored pieces show where each wooden piece goes
4. **Try different dates**: Each date has unique solutions!

## 🧩 The Algorithm

The solver uses a **backtracking algorithm** with several optimizations:

1. **Piece Transformations**: Generates all rotations and flips for each piece
2. **Constraint Checking**: Validates placements against board boundaries and occupied cells
3. **Memoization**: Caches board states to avoid recomputing
4. **LocalStorage Caching**: Saves complete solutions for instant retrieval

### Performance
- First solve: ~0.5-2 seconds (depending on date complexity)
- Cached solve: Instant! ⚡

## 📁 Project Structure

```
perpetual-calendar/
├── index.html                      # Main HTML interface
├── calendar-puzzle-solver-web.js  # UI logic and board rendering
├── calendar-puzzle-worker.js      # Web Worker (calls Go WASM)
├── solver.wasm                    # Go WebAssembly solver (generated)
├── wasm_exec.js                   # Go WASM runtime support
├── go-wasm/                       # Go source code
│   ├── solver.go                  # Go solver implementation
│   ├── build.sh                   # Build script
│   └── README.md                  # Go WASM documentation
└── README.md                      # This file
```

## 🎨 Puzzle Pieces

The puzzle includes 8 unique pieces:

1. **Purple Zig-Corner** (5 blocks)
2. **Cyan U-Shape** (5 blocks)
3. **Blue Chunky L** (5 blocks)
4. **Green Tall Zig** (5 blocks)
5. **Big Purple L** (5 blocks)
6. **Peach Zig L** (5 blocks)
7. **Light Blue Long L** (5 blocks)
8. **Pink Rectangle** (6 blocks)

Total: 41 blocks to cover 41 cells (leaving 2 visible for month + date)

## 🔧 Technical Details

- **Frontend**: Pure JavaScript (ES6+) with modern CSS
- **Solver Engine**: Go compiled to WebAssembly for maximum performance
- **No Dependencies**: Standalone application, no external libraries
- **Browser Support**: Modern browsers with WebAssembly support (Chrome, Firefox, Safari, Edge)
- **Storage**: LocalStorage for solution caching
- **Architecture**: Web Worker for non-blocking computation

## 🎓 Algorithm Complexity

- **Time Complexity**: O(n! × 8^m) in worst case (where n = pieces, m = transformations)
- **Space Complexity**: O(n) for recursion stack + O(k) for memoization cache
- **Optimizations**: 
  - State memoization reduces redundant computation
  - Early termination on solution found
  - LocalStorage caching for O(1) repeated lookups

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📜 License

MIT License - Feel free to use this project for personal or commercial purposes.

## 🌟 Acknowledgments

Inspired by the classic wooden perpetual calendar puzzle that has fascinated puzzle enthusiasts worldwide.

## 📞 Contact

Have questions or suggestions? Feel free to open an issue!

---

**Enjoy solving your daily puzzle!** 🧩✨
