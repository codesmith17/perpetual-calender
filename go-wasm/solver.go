package main

import (
	"encoding/json"
	"fmt"
	"syscall/js"
	"time"
)

const (
	ROWS = 7
	COLS = 7
)

var boardLayout = [][]string{
	{"JAN", "FEB", "MAR", "APR", "MAY", "JUN", ""},
	{"JUL", "AUG", "SEP", "OCT", "NOV", "DEC", ""},
	{"1", "2", "3", "4", "5", "6", "7"},
	{"8", "9", "10", "11", "12", "13", "14"},
	{"15", "16", "17", "18", "19", "20", "21"},
	{"22", "23", "24", "25", "26", "27", "28"},
	{"29", "30", "31", "", "", "", ""},
}

type Point struct {
	R, C int
}

var rawPieces = [][]Point{
	{{0, 1}, {0, 2}, {1, 1}, {2, 0}, {2, 1}},      // Piece 1
	{{0, 0}, {1, 0}, {1, 1}, {1, 2}, {0, 2}},      // Piece 2
	{{0, 0}, {1, 0}, {2, 0}, {1, 1}, {2, 1}},      // Piece 3
	{{0, 1}, {1, 1}, {2, 0}, {2, 1}, {3, 1}},      // Piece 4
	{{0, 0}, {1, 0}, {2, 0}, {2, 1}, {2, 2}},      // Piece 5
	{{0, 0}, {1, 0}, {2, 0}, {2, 1}, {3, 1}},      // Piece 6
	{{0, 0}, {1, 0}, {2, 0}, {3, 0}, {3, 1}},      // Piece 7
	{{0, 0}, {0, 1}, {1, 0}, {1, 1}, {2, 0}, {2, 1}}, // Piece 8
}

var transformedPieces [][][]Point

func init() {
	transformedPieces = make([][][]Point, len(rawPieces))
	for i, piece := range rawPieces {
		transformedPieces[i] = getTransforms(piece)
	}
}

func rotate(shape []Point) []Point {
	result := make([]Point, len(shape))
	for i, p := range shape {
		result[i] = Point{R: p.C, C: -p.R}
	}
	return result
}

func normalize(shape []Point) []Point {
	if len(shape) == 0 {
		return shape
	}

	minR, minC := shape[0].R, shape[0].C
	for _, p := range shape {
		if p.R < minR {
			minR = p.R
		}
		if p.C < minC {
			minC = p.C
		}
	}

	result := make([]Point, len(shape))
	for i, p := range shape {
		result[i] = Point{R: p.R - minR, C: p.C - minC}
	}
	return result
}

func shapeToString(shape []Point) string {
	data, _ := json.Marshal(shape)
	return string(data)
}

func getTransforms(shape []Point) [][]Point {
	formsMap := make(map[string][]Point)
	s := shape

	for i := 0; i < 4; i++ {
		s = rotate(s)
		norm := normalize(s)
		formsMap[shapeToString(norm)] = norm

		flipped := make([]Point, len(norm))
		for j, p := range norm {
			flipped[j] = Point{R: p.R, C: -p.C}
		}
		flippedNorm := normalize(flipped)
		formsMap[shapeToString(flippedNorm)] = flippedNorm
	}

	result := make([][]Point, 0, len(formsMap))
	for _, form := range formsMap {
		result = append(result, form)
	}
	return result
}

func canPlace(grid [][]int, shape []Point, r, c int) bool {
	for _, p := range shape {
		nr, nc := r+p.R, c+p.C
		if nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS {
			return false
		}
		if boardLayout[nr][nc] == "" {
			return false
		}
		if grid[nr][nc] != 0 {
			return false
		}
	}
	return true
}

func place(grid [][]int, shape []Point, r, c, pieceID int) {
	for _, p := range shape {
		grid[r+p.R][c+p.C] = pieceID
	}
}

func remove(grid [][]int, shape []Point, r, c int) {
	for _, p := range shape {
		grid[r+p.R][c+p.C] = 0
	}
}

func initGrid(month, day string) [][]int {
	grid := make([][]int, ROWS)
	for i := range grid {
		grid[i] = make([]int, COLS)
	}

	for r := 0; r < ROWS; r++ {
		for c := 0; c < COLS; c++ {
			cell := boardLayout[r][c]
			if cell == month || cell == day {
				grid[r][c] = -1
			}
		}
	}

	return grid
}

func copyGrid(grid [][]int) [][]int {
	newGrid := make([][]int, len(grid))
	for i := range grid {
		newGrid[i] = make([]int, len(grid[i]))
		copy(newGrid[i], grid[i])
	}
	return newGrid
}

const (
	allPiecesMask = (1 << 8) - 1 // 255 for 8 pieces
	maxSolutions  = 10             // Find up to 10 solutions
)

// Convert grid to string for deduplication
func gridToString(grid [][]int) string {
	var result string
	for _, row := range grid {
		for _, val := range row {
			result += fmt.Sprintf("%d,", val)
		}
	}
	return result
}

func solve(grid [][]int, usedMask int, solutions *[][][]int, solutionSet map[string]bool) {
	// Stop if we found enough solutions
	if len(*solutions) >= maxSolutions {
		return
	}
	
	// Check if all pieces are used
	if usedMask == allPiecesMask {
		// Check for duplicate solution
		gridStr := gridToString(grid)
		
		fmt.Printf("\n🔍 Found solution, checking uniqueness...\n")
		fmt.Printf("   Grid hash: %s\n", gridStr[:50]+"...") // Show first 50 chars
		fmt.Printf("   Already in set: %v\n", solutionSet[gridStr])
		
		if solutionSet[gridStr] {
			fmt.Println("⚠️  Skipping duplicate solution")
			return // Skip duplicate
		}
		
		gridCopy := copyGrid(grid)
		solutionSet[gridStr] = true
		*solutions = append(*solutions, gridCopy)
		
		// Log the grid for debugging
		fmt.Printf("\n✅ Unique solution #%d added:\n", len(*solutions))
		for _, row := range gridCopy {
			fmt.Printf("  %v\n", row)
		}
		
		// Send progress update if callback is provided
		if !progressCallback.IsUndefined() {
			count := len(*solutions)
			fmt.Printf("📊 Sending to UI: solution %d/%d\n", count, maxSolutions)
			
			// Convert grid to JS format
			jsGrid := make([]interface{}, len(gridCopy))
			for i, row := range gridCopy {
				jsRow := make([]interface{}, len(row))
				for j, val := range row {
					jsRow[j] = val
				}
				jsGrid[i] = jsRow
			}
			
			// Call JavaScript callback
			progressCallback.Invoke(count, jsGrid)
		}
		
		return
	}

	// Find first unused piece
	pieceIndex := 0
	for pieceIndex < len(rawPieces) && (usedMask&(1<<pieceIndex)) != 0 {
		pieceIndex++
	}

	for _, shape := range transformedPieces[pieceIndex] {
		if len(*solutions) >= maxSolutions {
			return
		}
		
		for r := 0; r < ROWS; r++ {
			for c := 0; c < COLS; c++ {
				if canPlace(grid, shape, r, c) {
					place(grid, shape, r, c, pieceIndex+1)
					newUsedMask := usedMask | (1 << pieceIndex)
					solve(grid, newUsedMask, solutions, solutionSet)
					remove(grid, shape, r, c)
					
					if len(*solutions) >= maxSolutions {
						return
					}
				}
			}
		}
	}
}

// Global callback for progress updates
var progressCallback js.Value

// WebAssembly bridge function
func solvePuzzle(this js.Value, args []js.Value) interface{} {
	if len(args) < 2 {
		return map[string]interface{}{
			"error": "Expected at least 2 arguments: month and day",
		}
	}

	month := args[0].String()
	day := args[1].String()
	
	// Optional callback for progress updates
	if len(args) >= 3 && !args[2].IsUndefined() {
		progressCallback = args[2]
	}

	// Console logs to show Go is running
	fmt.Printf("🚀 Go WebAssembly Solver started for %s %s\n", month, day)
	
	startTime := time.Now()
	grid := initGrid(month, day)
	solutions := make([][][]int, 0)
	
	// Initialize solution set for deduplication
	solutionSet := make(map[string]bool)
	
	fmt.Println("🔍 Searching for unique solutions...")
	solve(grid, 0, &solutions, solutionSet)
	
	elapsed := time.Since(startTime).Seconds()
	fmt.Printf("✅ Go found %d solution(s) in %.3f seconds\n", len(solutions), elapsed)

	// Convert solutions to JS format
	jsSolutions := make([]interface{}, len(solutions))
	for i, sol := range solutions {
		jsGrid := make([]interface{}, len(sol))
		for j, row := range sol {
			jsRow := make([]interface{}, len(row))
			for k, val := range row {
				jsRow[k] = val
			}
			jsGrid[j] = jsRow
		}
		jsSolutions[i] = jsGrid
	}

	return map[string]interface{}{
		"solutions": jsSolutions,
		"count":     len(solutions),
		"time":      fmt.Sprintf("%.3f", elapsed),
	}
}

func main() {
	fmt.Println("🎯 Go WebAssembly Calendar Puzzle Solver initialized!")
	fmt.Println("⚡ Powered by Go - Finding up to 10 solutions per date")
	
	// Register the function to be callable from JavaScript
	js.Global().Set("goSolvePuzzle", js.FuncOf(solvePuzzle))
	
	// Keep the program running
	<-make(chan bool)
}
