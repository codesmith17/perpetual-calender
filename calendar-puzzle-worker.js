// ============================================
// WEB WORKER - PUZZLE SOLVER
// Runs in background thread, doesn't block UI
// ============================================

// Import shared puzzle logic
importScripts('puzzle-core.js');

// Wrapper for solve that sends progress updates
function solveWithProgress(grid, usedMask, solutions = []) {
  // Stop if we found enough solutions
  if (solutions.length >= MAX_SOLUTIONS) return;
  
  // Check if all pieces are used
  if (usedMask === ALL_PIECES_MASK) {
    const solutionCopy = grid.map(row => [...row]);
    solutions.push(solutionCopy);
    
    // Send progress update to main thread
    self.postMessage({
      type: 'progress',
      count: solutions.length,
      solution: solutionCopy
    });
    
    return;
  }

  // Find first unused piece
  let pieceIndex = 0;
  while (pieceIndex < rawPieces.length && (usedMask & (1 << pieceIndex))) {
    pieceIndex++;
  }

  for (let shape of transformedPieces[pieceIndex]) {
    if (solutions.length >= MAX_SOLUTIONS) return;
    
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (canPlace(grid, shape, r, c)) {
          place(grid, shape, r, c, pieceIndex + 1);
          const newUsedMask = usedMask | (1 << pieceIndex);
          solveWithProgress(grid, newUsedMask, solutions);
          remove(grid, shape, r, c);
          if (solutions.length >= MAX_SOLUTIONS) return;
        }
      }
    }
  }
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
  solveWithProgress(grid, 0, solutions);
  
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
