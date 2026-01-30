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

const allPiecesMask = (1 << 8) - 1 // 255 for 8 pieces

func solve(grid [][]int, usedMask int, solutions *[][][]int) bool {
	// Stop if we already found a solution
	if len(*solutions) > 0 {
		return true
	}
	
	// Check if all pieces are used
	if usedMask == allPiecesMask {
		*solutions = append(*solutions, copyGrid(grid))
		return true
	}

	// Find first unused piece
	pieceIndex := 0
	for pieceIndex < len(rawPieces) && (usedMask&(1<<pieceIndex)) != 0 {
		pieceIndex++
	}

	for _, shape := range transformedPieces[pieceIndex] {
		for r := 0; r < ROWS; r++ {
			for c := 0; c < COLS; c++ {
				if canPlace(grid, shape, r, c) {
					place(grid, shape, r, c, pieceIndex+1)
					newUsedMask := usedMask | (1 << pieceIndex)
					if solve(grid, newUsedMask, solutions) {
						return true
					}
					remove(grid, shape, r, c)
				}
			}
		}
	}
	return false
}

// WebAssembly bridge function
func solvePuzzle(this js.Value, args []js.Value) interface{} {
	if len(args) != 2 {
		return map[string]interface{}{
			"error": "Expected 2 arguments: month and day",
		}
	}

	month := args[0].String()
	day := args[1].String()

	startTime := time.Now()
	grid := initGrid(month, day)
	solutions := make([][][]int, 0)
	solve(grid, 0, &solutions)
	elapsed := time.Since(startTime).Seconds()

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
	fmt.Println("Go WebAssembly Calendar Puzzle Solver initialized")
	
	// Register the function to be callable from JavaScript
	js.Global().Set("goSolvePuzzle", js.FuncOf(solvePuzzle))
	
	// Keep the program running
	<-make(chan bool)
}
