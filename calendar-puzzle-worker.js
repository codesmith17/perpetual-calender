// ============================================
// WEB WORKER - GO WEBASSEMBLY PUZZLE SOLVER
// Runs in background thread, doesn't block UI
// ============================================

// Import Go WebAssembly support
importScripts('wasm_exec.js');

let wasmReady = false;
let goInstance = null;

// Initialize Go WebAssembly
async function initWasm() {
    try {
        const go = new Go();
        const result = await WebAssembly.instantiateStreaming(
            fetch('solver.wasm'),
            go.importObject
        );
        
        // Run Go program
        go.run(result.instance);
        goInstance = result.instance;
        
        // Wait for Go to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        wasmReady = true;
        self.postMessage({ type: 'initialized' });
    } catch (error) {
        console.error('WASM initialization error:', error);
        self.postMessage({ 
            type: 'error', 
            message: 'Failed to load WebAssembly: ' + error.message 
        });
    }
}

// Listen for messages from main thread
self.addEventListener('message', async (event) => {
    const { month, day } = event.data;
    
    // Initialize WASM on first call
    if (!wasmReady && !goInstance) {
        await initWasm();
    }
    
    if (!wasmReady) {
        self.postMessage({ 
            type: 'error', 
            message: 'WebAssembly not ready yet' 
        });
        return;
    }
    
    try {
        // Send acknowledgment
        self.postMessage({ type: 'started' });
        
        const startTime = Date.now();
        
        // Call Go function (convert day to string)
        const result = goSolvePuzzle(month, String(day));
        
        const endTime = Date.now();
        const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
        
        if (result.error) {
            self.postMessage({ 
                type: 'complete',
                solutions: [],
                count: 0,
                time: timeTaken
            });
        } else {
            // Send progress update with first solution
            if (result.count > 0) {
                self.postMessage({
                    type: 'progress',
                    count: result.count,
                    solution: result.solutions[0]
                });
            }
            
            // Send final result
            self.postMessage({
                type: 'complete',
                solutions: result.solutions,
                count: result.count,
                time: timeTaken
            });
        }
    } catch (error) {
        console.error('Solving error:', error);
        self.postMessage({ 
            type: 'complete',
            solutions: [],
            count: 0,
            time: '0'
        });
    }
});

// Auto-initialize on worker startup
initWasm();
