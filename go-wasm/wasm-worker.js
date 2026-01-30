// Web Worker for Go WebAssembly
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
        self.postMessage({ type: 'ready' });
    } catch (error) {
        self.postMessage({ 
            type: 'error', 
            message: 'Failed to load WebAssembly: ' + error.message 
        });
    }
}

// Listen for messages from main thread
self.addEventListener('message', async (event) => {
    const { type, month, day } = event.data;
    
    if (type === 'init') {
        initWasm();
        return;
    }
    
    if (type === 'solve') {
        if (!wasmReady) {
            self.postMessage({ 
                type: 'error', 
                message: 'WebAssembly not ready yet' 
            });
            return;
        }
        
        try {
            self.postMessage({ type: 'started' });
            
            // Call Go function
            const result = goSolvePuzzle(month, day);
            
            if (result.error) {
                self.postMessage({ 
                    type: 'error', 
                    message: result.error 
                });
            } else {
                self.postMessage({
                    type: 'complete',
                    solutions: result.solutions,
                    count: result.count,
                    time: result.time
                });
            }
        } catch (error) {
            self.postMessage({ 
                type: 'error', 
                message: 'Error during solving: ' + error.message 
            });
        }
    }
});
