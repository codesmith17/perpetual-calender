// ============================================
// PUZZLE CORE - SHARED LOGIC
// Used by both main thread and worker thread
// ============================================

const ROWS = 7;
const COLS = 7;

const boardLayout = [
  ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", null],
  ["JUL", "AUG", "SEP", "OCT", "NOV", "DEC", null],
  ["1", "2", "3", "4", "5", "6", "7"],
  ["8", "9", "10", "11", "12", "13", "14"],
  ["15", "16", "17", "18", "19", "20", "21"],
  ["22", "23", "24", "25", "26", "27", "28"],
  ["29", "30", "31", null, null, null, null]
];

const rawPieces = [
  [[0, 1], [0, 2], [1, 1], [2, 0], [2, 1]],      // Piece 1 - Purple
  [[0, 0], [1, 0], [1, 1], [1, 2], [0, 2]],      // Piece 2 - Cyan U
  [[0, 0], [1, 0], [2, 0], [1, 1], [2, 1]],      // Piece 3 - Blue chunky L
  [[0, 1], [1, 1], [2, 0], [2, 1], [3, 1]],      // Piece 4 - Green tall
  [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],      // Piece 5 - Big L
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1]],      // Piece 6 - Peach zig L
  [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]],      // Piece 7 - Light blue long L
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]] // Piece 8 - Pink double bar
];

// Rotation and transformation functions
function rotate(shape) {
  return shape.map(([r, c]) => [c, -r]);
}

function normalize(shape) {
  const minR = Math.min(...shape.map(p => p[0]));
  const minC = Math.min(...shape.map(p => p[1]));
  return shape
    .map(([r, c]) => [r - minR, c - minC])
    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
}

function getTransforms(shape) {
  const forms = new Set();
  let s = shape;

  for (let i = 0; i < 4; i++) {
    s = rotate(s);
    const norm = normalize(s);
    forms.add(JSON.stringify(norm));

    const flipped = norm.map(([r, c]) => [r, -c]);
    forms.add(JSON.stringify(normalize(flipped)));
  }

  return [...forms].map(f => JSON.parse(f));
}

const transformedPieces = rawPieces.map(getTransforms);

// Grid manipulation functions
function canPlace(grid, shape, r, c) {
  for (let [dr, dc] of shape) {
    const nr = r + dr;
    const nc = c + dc;

    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
    if (boardLayout[nr][nc] === null) return false;
    if (grid[nr][nc] !== 0) return false;
  }
  return true;
}

function place(grid, shape, r, c, pieceId) {
  for (let [dr, dc] of shape) {
    grid[r + dr][c + dc] = pieceId;
  }
}

function remove(grid, shape, r, c) {
  for (let [dr, dc] of shape) {
    grid[r + dr][c + dc] = 0;
  }
}

function initGrid(month, day) {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = boardLayout[r][c];
      if (cell === month || cell === String(day)) {
        grid[r][c] = -1;
      }
    }
  }

  return grid;
}

// Solver constants
const MAX_SOLUTIONS = 10;
const ALL_PIECES_MASK = (1 << rawPieces.length) - 1; // 255 for 8 pieces

// Backtracking solver - find ALL solutions (no limit)
function solve(grid, usedMask, solutions = [], onSolutionFound = null) {
  // Check if all pieces are used (bitmask comparison - O(1))
  if (usedMask === ALL_PIECES_MASK) {
    // Found a solution! Save a copy
    const solutionCopy = grid.map(row => [...row]);
    solutions.push(solutionCopy);
    
    // Call the callback to update UI
    if (onSolutionFound) {
      onSolutionFound(solutions.length, solutionCopy);
    }
    
    return; // Continue searching for more solutions
  }

  // Find first unused piece using bitmask
  let pieceIndex = 0;
  while (pieceIndex < rawPieces.length && (usedMask & (1 << pieceIndex))) {
    pieceIndex++;
  }

  for (let shape of transformedPieces[pieceIndex]) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (canPlace(grid, shape, r, c)) {
          place(grid, shape, r, c, pieceIndex + 1);
          
          // Set bit for this piece (much faster than array) - O(1)
          const newUsedMask = usedMask | (1 << pieceIndex);

          solve(grid, newUsedMask, solutions, onSolutionFound); // Recursive call

          remove(grid, shape, r, c);
        }
      }
    }
  }
}

// Helper functions
function getDaysInMonth(month, year) {
  const daysMap = {
    'JAN': 31, 'FEB': isLeapYear(year) ? 29 : 28, 'MAR': 31,
    'APR': 30, 'MAY': 31, 'JUN': 30,
    'JUL': 31, 'AUG': 31, 'SEP': 30,
    'OCT': 31, 'NOV': 30, 'DEC': 31
  };
  return daysMap[month] || 31;
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ROWS, COLS, boardLayout, rawPieces, transformedPieces,
    canPlace, place, remove, initGrid, solve,
    MAX_SOLUTIONS, ALL_PIECES_MASK,
    getDaysInMonth, isLeapYear
  };
}
