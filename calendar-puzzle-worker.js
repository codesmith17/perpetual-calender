// ============================================
// WEB WORKER - PUZZLE SOLVER
// Runs in background thread, doesn't block UI
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
  [[0, 1], [0, 2], [1, 1], [2, 0], [2, 1]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [1, 1], [2, 1]],
  [[0, 1], [1, 1], [2, 0], [2, 1], [3, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]],
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]]
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

// Backtracking solver - find up to MAX_SOLUTIONS
const MAX_SOLUTIONS = 10;
const ALL_PIECES_MASK = (1 << rawPieces.length) - 1; // 255 for 8 pieces

function solve(grid, usedMask, solutions = []) {
  // Stop if we found enough solutions
  if (solutions.length >= MAX_SOLUTIONS) return;
  
  // Check if all pieces are used (bitmask comparison - O(1))
  if (usedMask === ALL_PIECES_MASK) {
    // Found a solution! Save a copy
    const solutionCopy = grid.map(row => [...row]);
    solutions.push(solutionCopy);
    
    // Send progress update to main thread
    self.postMessage({
      type: 'progress',
      count: solutions.length,
      solution: solutionCopy
    });
    
    return; // Continue searching for more solutions
  }

  // Find first unused piece using bitmask
  let pieceIndex = 0;
  while (pieceIndex < rawPieces.length && (usedMask & (1 << pieceIndex))) {
    pieceIndex++;
  }

  for (let shape of transformedPieces[pieceIndex]) {
    // Early exit if we have enough solutions
    if (solutions.length >= MAX_SOLUTIONS) return;
    
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (canPlace(grid, shape, r, c)) {
          place(grid, shape, r, c, pieceIndex + 1);
          
          // Set bit for this piece (much faster than array) - O(1)
          const newUsedMask = usedMask | (1 << pieceIndex);

          solve(grid, newUsedMask, solutions); // Recursive call

          remove(grid, shape, r, c);
          
          // Early exit check
          if (solutions.length >= MAX_SOLUTIONS) return;
        }
      }
    }
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

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  const { month, day } = event.data;
  
  // Send acknowledgment
  self.postMessage({ type: 'started' });
  
  const startTime = Date.now();
  const grid = initGrid(month, day);
  const solutions = [];
  
  // Solve the puzzle
  solve(grid, 0, solutions);
  
  const endTime = Date.now();
  const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
  
  // Send final result
  self.postMessage({
    type: 'complete',
    solutions: solutions,
    count: solutions.length,
    time: timeTaken
  });
});
