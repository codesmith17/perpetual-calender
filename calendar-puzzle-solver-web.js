// ============================================
// PERPETUAL CALENDAR PUZZLE SOLVER - WEB VERSION
// Main thread UI logic only (core logic in puzzle-core.js)
// ============================================

// Suppress browser extension errors (not our code!)
window.addEventListener('error', function(event) {
  if (event.message && event.message.includes('message channel closed')) {
    event.preventDefault();
    return true;
  }
}, true);

// Note: Core puzzle logic (board, pieces, solver) loaded from puzzle-core.js via script tag

// ============================================
// LOCALSTORAGE CACHING
// ============================================

const CACHE_KEY = 'calendar_puzzle_solutions';
const CACHE_VERSION = 'v2'; // Updated version to clear old cache format

function getCachedSolution(month, day) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
    if (cache.version !== CACHE_VERSION) {
      // Clear old cache if version mismatch
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    const key = `${month}-${day}`;
    const data = cache[key];
    
    // Validate cache data structure
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    // Check if it's the new format with solutions array
    if (!Array.isArray(data.solutions) || data.solutions.length === 0) {
      return null;
    }
    
    return data;
  } catch (e) {
    console.error('Cache read error:', e);
    // Clear corrupted cache
    localStorage.removeItem(CACHE_KEY);
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
    // Force page reload to start fresh
    window.location.reload();
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
          cell.setAttribute('data-piece', val);
        }
      }

      boardElement.appendChild(cell);
    }
  }
  
  // Reattach hover listeners after board is rendered
  attachBoardHoverListeners();
  attachLegendHoverListeners();
}

function attachBoardHoverListeners() {
  const boardCells = document.querySelectorAll('.cell[data-piece]');
  
  boardCells.forEach(cell => {
    cell.addEventListener('mouseenter', () => {
      const pieceNum = cell.getAttribute('data-piece');
      
      // Highlight all cells with same piece number
      document.querySelectorAll(`.cell.piece-${pieceNum}`).forEach(c => {
        c.classList.add('highlight');
      });
      
      // Highlight corresponding legend item
      const legendPiece = document.querySelector(`.legend-piece[data-piece="${pieceNum}"]`);
      if (legendPiece) {
        legendPiece.classList.add('shimmer-active');
      }
    });

    cell.addEventListener('mouseleave', () => {
      // Remove all highlights
      document.querySelectorAll('.cell.highlight').forEach(c => {
        c.classList.remove('highlight');
      });
      
      // Remove legend shimmer
      document.querySelectorAll('.legend-piece.shimmer-active').forEach(lp => {
        lp.classList.remove('shimmer-active');
      });
    });
  });
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
      
      // Add shimmer to legend piece itself
      legendPiece.classList.add('shimmer-active');
    });

    legendPiece.addEventListener('mouseleave', () => {
      // Remove all highlights
      const highlightedCells = document.querySelectorAll('.cell.highlight');
      highlightedCells.forEach(cell => {
        cell.classList.remove('highlight');
      });
      
      // Remove shimmer
      legendPiece.classList.remove('shimmer-active');
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

// Web Worker for background computation
let puzzleWorker = null;

function solvePuzzleUI(month, day) {
  // Reset board immediately to show the new target date
  const grid = initGrid(month, day);
  renderBoard(grid);
  
  // Always show solving status first
  showStatus('🔄 Checking solutions...', 'solving');
  hideSolutionNavigation();
  
  // Add rotation animation to board
  const boardElement = document.getElementById('board');
  boardElement.classList.add('solving');
  
  // Check cache first
  const cachedData = getCachedSolution(month, day);
  if (cachedData && cachedData.solutions && cachedData.solutions.length > 0) {
    // Small delay to show the solving message
    setTimeout(() => {
      boardElement.classList.remove('solving');
      allSolutions = cachedData.solutions;
      currentSolutionIndex = 0;
      renderBoard(allSolutions[0]);
      updateSolutionNavigation(cachedData.count, cachedData.time);
      showStatus(`✅ Found ${cachedData.count} solution${cachedData.count > 1 ? 's' : ''}!`, 'success');
    }, 200);
    return;
  }

  showStatus('🔄 Finding solutions...', 'solving');
  
  allSolutions = [];
  currentSolutionIndex = 0;

  // Terminate existing worker if any
  if (puzzleWorker) {
    puzzleWorker.terminate();
  }

  // Create new Web Worker
  try {
    puzzleWorker = new Worker('calendar-puzzle-worker.js');
  } catch (error) {
    console.error('Failed to create worker:', error);
    boardElement.classList.remove('solving');
    showStatus('❌ Failed to start solver. Please refresh the page.', 'error');
    return;
  }

  // Listen for messages from worker
  puzzleWorker.onmessage = function(event) {
    const { type, count, solution, solutions, time } = event.data;

    if (type === 'started') {
      showStatus('🔄 Finding solutions...', 'solving');
    }
    else if (type === 'progress') {
      // Real-time progress updates
      if (count === 1) {
        renderBoard(solution);
      }
      showStatus(`🔍 Found ${count} solution${count > 1 ? 's' : ''}...`, 'solving');
    }
    else if (type === 'complete') {
      // Remove rotation animation
      boardElement.classList.remove('solving');

      if (solutions.length > 0) {
        allSolutions = solutions;
        currentSolutionIndex = 0;
        
        // Save all solutions to cache
        saveSolutionToCache(month, day, solutions, time);
        renderBoard(solutions[0]);
        updateSolutionNavigation(solutions.length, time);
        showStatus(`✅ Found ${solutions.length} solution${solutions.length > 1 ? 's' : ''} in ${time}s!`, 'success');
      } else {
        renderBoard(initGrid(month, day));
        showStatus(`❌ No solution found (searched for ${time} seconds)`, 'error');
        hideSolutionNavigation();
      }

      // Clean up worker
      puzzleWorker.terminate();
      puzzleWorker = null;
    }
  };

  // Handle worker errors
  puzzleWorker.onerror = function(error) {
    console.error('Worker error:', error);
    boardElement.classList.remove('solving');
    showStatus('❌ Error during solving. Please try again.', 'error');
    puzzleWorker.terminate();
    puzzleWorker = null;
  };

  // Send message to worker to start solving
  puzzleWorker.postMessage({ month, day });
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

// ============================================
// INITIALIZATION
// ============================================

// Note: getDaysInMonth and isLeapYear now loaded from puzzle-core.js

function updateDayOptions(month) {
  const daySelect = document.getElementById('daySelect');
  const currentDay = parseInt(daySelect.value) || 1;
  const maxDays = getDaysInMonth(month);
  
  daySelect.innerHTML = '';
  
  for (let i = 1; i <= maxDays; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    daySelect.appendChild(option);
  }
  
  // Restore previous selection if valid
  if (currentDay <= maxDays) {
    daySelect.value = currentDay;
  } else {
    daySelect.value = maxDays;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Clear old cache on first load if needed
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
    if (cache.version && cache.version !== CACHE_VERSION) {
      console.log('Clearing old cache version:', cache.version);
      localStorage.removeItem(CACHE_KEY);
    }
  } catch (e) {
    localStorage.removeItem(CACHE_KEY);
  }
  
  // Populate day select based on current month
  const monthSelect = document.getElementById('monthSelect');
  const daySelect = document.getElementById('daySelect');
  
  // Set today's date
  const today = new Date();
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
                      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const currentMonth = monthNames[today.getMonth()];
  
  monthSelect.value = currentMonth;
  updateDayOptions(currentMonth);
  daySelect.value = today.getDate();

  // Update days when month changes
  monthSelect.addEventListener('change', (e) => {
    updateDayOptions(e.target.value);
  });

  // Render initial empty board
  renderBoard(initGrid(currentMonth, today.getDate()));

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

  // Success message
  console.log('%c✅ Puzzle Solver Loaded Successfully!', 'color: #4ec9b0; font-size: 14px; font-weight: bold;');
  console.log('%cℹ️ Note: Any "message channel closed" errors are from browser extensions, not this app.', 'color: #8b6f47; font-size: 12px;');
});
