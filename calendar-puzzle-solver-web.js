// ============================================
// PERPETUAL CALENDAR PUZZLE SOLVER - WEB VERSION
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

function serialize(grid, used) {
  return grid.flat().join(",") + "|" + used.join("");
}

let memo = new Set();

// Backtracking solver
function solve(grid, used) {
  if (used.every(v => v)) return true;

  const key = serialize(grid, used);
  if (memo.has(key)) return false;

  const pieceIndex = used.findIndex(v => !v);

  for (let shape of transformedPieces[pieceIndex]) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (canPlace(grid, shape, r, c)) {
          place(grid, shape, r, c, pieceIndex + 1);
          used[pieceIndex] = true;

          if (solve(grid, used)) return true;

          used[pieceIndex] = false;
          remove(grid, shape, r, c);
        }
      }
    }
  }

  memo.add(key);
  return false;
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

// ============================================
// LOCALSTORAGE CACHING
// ============================================

const CACHE_KEY = 'calendar_puzzle_solutions';
const CACHE_VERSION = 'v1';

function getCachedSolution(month, day) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
    if (cache.version !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    const key = `${month}-${day}`;
    return cache[key] || null;
  } catch (e) {
    return null;
  }
}

function saveSolutionToCache(month, day, solutions, timeTaken) {
  try {
    let cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
    cache.version = CACHE_VERSION;
    const key = `${month}-${day}`;
    cache[key] = {
      solutions: solutions,
      count: solutions.length,
      time: timeTaken
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to cache solution:', e);
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('Cache cleared successfully');
  } catch (e) {
    console.error('Failed to clear cache:', e);
  }
}

// ============================================
// UI FUNCTIONS
// ============================================

function renderBoard(grid) {
  const boardElement = document.getElementById('board');
  boardElement.innerHTML = '';

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      if (boardLayout[r][c] === null) {
        cell.classList.add('empty');
      } else {
        const val = grid[r][c];
        if (val === -1) {
          cell.classList.add('target');
          cell.textContent = boardLayout[r][c];
        } else if (val === 0) {
          cell.classList.add('available');
          cell.textContent = boardLayout[r][c];
        } else {
          cell.classList.add('piece', `piece-${val}`);
          cell.textContent = val;
        }
      }

      boardElement.appendChild(cell);
    }
  }
  
  // Reattach hover listeners after board is rendered
  attachLegendHoverListeners();
}

function attachLegendHoverListeners() {
  const legendPieces = document.querySelectorAll('.legend-piece');
  
  legendPieces.forEach(legendPiece => {
    // Remove old listeners by cloning
    const newLegendPiece = legendPiece.cloneNode(true);
    legendPiece.parentNode.replaceChild(newLegendPiece, legendPiece);
  });
  
  // Add new listeners
  document.querySelectorAll('.legend-piece').forEach(legendPiece => {
    legendPiece.addEventListener('mouseenter', () => {
      const pieceNum = legendPiece.getAttribute('data-piece');
      
      // Highlight all cells with matching piece number
      const boardCells = document.querySelectorAll('.cell');
      boardCells.forEach(cell => {
        if (pieceNum === 'target' && cell.classList.contains('target')) {
          cell.classList.add('highlight');
        } else if (cell.classList.contains(`piece-${pieceNum}`)) {
          cell.classList.add('highlight');
        }
      });
    });

    legendPiece.addEventListener('mouseleave', () => {
      // Remove all highlights
      const highlightedCells = document.querySelectorAll('.cell.highlight');
      highlightedCells.forEach(cell => {
        cell.classList.remove('highlight');
      });
    });

    // Click effect
    legendPiece.addEventListener('click', () => {
      legendPiece.classList.add('clicked');
      setTimeout(() => {
        legendPiece.classList.remove('clicked');
      }, 400);
    });
  });
}

function showStatus(message, type) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
}

function solvePuzzleUI(month, day) {
  // Check cache first
  const cachedData = getCachedSolution(month, day);
  if (cachedData) {
    allSolutions = cachedData.solutions;
    currentSolutionIndex = 0;
    renderBoard(allSolutions[0]);
    updateSolutionNavigation(cachedData.count, cachedData.time);
    showStatus(`✅ Found ${cachedData.count} solution${cachedData.count > 1 ? 's' : ''}!`, 'success');
    return;
  }

  showStatus('🔄 Finding all solutions...', 'solving');

  memo.clear();
  allSolutions = [];
  currentSolutionIndex = 0;
  const grid = initGrid(month, day);
  const used = Array(rawPieces.length).fill(false);

  const startTime = Date.now();

  // Use setTimeout to allow UI to update
  setTimeout(() => {
    solve(grid, used, allSolutions);
    const endTime = Date.now();
    const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

    if (allSolutions.length > 0) {
      // Save all solutions to cache
      saveSolutionToCache(month, day, allSolutions, timeTaken);
      renderBoard(allSolutions[0]);
      updateSolutionNavigation(allSolutions.length, timeTaken);
      showStatus(`✅ Found ${allSolutions.length} solution${allSolutions.length > 1 ? 's' : ''} in ${timeTaken}s!`, 'success');
    } else {
      renderBoard(initGrid(month, day));
      showStatus(`❌ No solution found (searched for ${timeTaken} seconds)`, 'error');
      hideSolutionNavigation();
    }
  }, 100);
}

function updateSolutionNavigation(count, time) {
  const navElement = document.getElementById('solutionNav');
  const counterElement = document.getElementById('solutionCounter');
  const timeElement = document.getElementById('solveTime');
  
  if (count > 1) {
    navElement.style.display = 'flex';
    counterElement.textContent = `Solution ${currentSolutionIndex + 1} of ${count}`;
  } else {
    navElement.style.display = 'none';
  }
  
  timeElement.style.display = 'block';
  const timeContent = timeElement.querySelector('span');
  timeContent.textContent = `⏱️ Solved in ${time}s • ${count} solution${count > 1 ? 's' : ''} found`;
}

function hideSolutionNavigation() {
  document.getElementById('solutionNav').style.display = 'none';
  document.getElementById('solveTime').style.display = 'none';
}

function showNextSolution() {
  if (allSolutions.length === 0) return;
  currentSolutionIndex = (currentSolutionIndex + 1) % allSolutions.length;
  renderBoard(allSolutions[currentSolutionIndex]);
  document.getElementById('solutionCounter').textContent = 
    `Solution ${currentSolutionIndex + 1} of ${allSolutions.length}`;
}

function showPreviousSolution() {
  if (allSolutions.length === 0) return;
  currentSolutionIndex = (currentSolutionIndex - 1 + allSolutions.length) % allSolutions.length;
  renderBoard(allSolutions[currentSolutionIndex]);
  document.getElementById('solutionCounter').textContent = 
    `Solution ${currentSolutionIndex + 1} of ${allSolutions.length}`;
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Populate day select
  const daySelect = document.getElementById('daySelect');
  for (let i = 1; i <= 31; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    daySelect.appendChild(option);
  }

  // Set today's date
  const today = new Date();
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
                      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  document.getElementById('monthSelect').value = monthNames[today.getMonth()];
  document.getElementById('daySelect').value = today.getDate();

  // Render initial empty board
  renderBoard(initGrid(monthNames[today.getMonth()], today.getDate()));

  // Event listeners
  document.getElementById('solveBtn').addEventListener('click', () => {
    const month = document.getElementById('monthSelect').value;
    const day = parseInt(document.getElementById('daySelect').value);
    solvePuzzleUI(month, day);
  });

  document.getElementById('todayBtn').addEventListener('click', () => {
    const today = new Date();
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
                        "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const month = monthNames[today.getMonth()];
    const day = today.getDate();
    
    document.getElementById('monthSelect').value = month;
    document.getElementById('daySelect').value = day;
    
    solvePuzzleUI(month, day);
  });

  // Solution navigation buttons
  document.getElementById('prevSolution').addEventListener('click', showPreviousSolution);
  document.getElementById('nextSolution').addEventListener('click', showNextSolution);

  // Initialize hover listeners
  attachLegendHoverListeners();
});
