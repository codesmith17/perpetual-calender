package main

import (
	"syscall/js"
)

const (
	ROWS          = 7
	COLS          = 7
	NUM_PIECES    = 8
	MAX_SOLUTIONS = 10
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
	{{0, 1}, {0, 2}, {1, 1}, {2, 0}, {2, 1}},
	{{0, 0}, {1, 0}, {1, 1}, {1, 2}, {0, 2}},
	{{0, 0}, {1, 0}, {2, 0}, {1, 1}, {2, 1}},
	{{0, 1}, {1, 1}, {2, 0}, {2, 1}, {3, 1}},
	{{0, 0}, {1, 0}, {2, 0}, {2, 1}, {2, 2}},
	{{0, 0}, {1, 0}, {2, 0}, {2, 1}, {3, 1}},
	{{0, 0}, {1, 0}, {2, 0}, {3, 0}, {3, 1}},
	{{0, 0}, {0, 1}, {1, 0}, {1, 1}, {2, 0}, {2, 1}},
}

var transformedPieces [NUM_PIECES][][]Point

func init() {
	for i := 0; i < NUM_PIECES; i++ {
		transformedPieces[i] = getTransforms(rawPieces[i])
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

func shapeEqual(a, b []Point) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i].R != b[i].R || a[i].C != b[i].C {
			return false
		}
	}
	return true
}

func getTransforms(shape []Point) [][]Point {
	var unique [][]Point
	s := shape
	for i := 0; i < 4; i++ {
		s = rotate(s)
		norm := normalize(s)
		isUnique := true
		for _, existing := range unique {
			if shapeEqual(norm, existing) {
				isUnique = false
				break
			}
		}
		if isUnique {
			unique = append(unique, norm)
		}
		flipped := make([]Point, len(norm))
		for j, p := range norm {
			flipped[j] = Point{R: p.R, C: -p.C}
		}
		flippedNorm := normalize(flipped)
		isUnique = true
		for _, existing := range unique {
			if shapeEqual(flippedNorm, existing) {
				isUnique = false
				break
			}
		}
		if isUnique {
			unique = append(unique, flippedNorm)
		}
	}
	return unique
}

func canPlace(grid *[ROWS][COLS]int, shape []Point, r, c int) bool {
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

func place(grid *[ROWS][COLS]int, shape []Point, r, c, pieceID int) {
	for _, p := range shape {
		grid[r+p.R][c+p.C] = pieceID
	}
}

func remove(grid *[ROWS][COLS]int, shape []Point, r, c int) {
	for _, p := range shape {
		grid[r+p.R][c+p.C] = 0
	}
}

func initGrid(month, day string) [ROWS][COLS]int {
	var grid [ROWS][COLS]int
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

func gridHash(grid *[ROWS][COLS]int, usedMask int) uint64 {
	const (
		offset64 = 14695981039346656037
		prime64  = 1099511628211
	)
	hash := uint64(offset64)
	for r := 0; r < ROWS; r++ {
		for c := 0; c < COLS; c++ {
			hash ^= uint64(grid[r][c])
			hash *= prime64
		}
	}
	hash ^= uint64(usedMask)
	hash *= prime64
	return hash
}

func gridsEqual(g1, g2 *[ROWS][COLS]int) bool {
	return *g1 == *g2
}

const allPiecesMask = (1 << NUM_PIECES) - 1

func solve(
	grid *[ROWS][COLS]int,
	usedMask int,
	solutions *[][ROWS][COLS]int,
	solutionSet *map[uint64][][ROWS][COLS]int,
	memo *map[uint64]bool,
	progressCallback js.Value,
) {
	if len(*solutions) >= MAX_SOLUTIONS {
		return
	}

	hash := gridHash(grid, usedMask)
	if (*memo)[hash] {
		return
	}
	(*memo)[hash] = true

	if usedMask == allPiecesMask {
		if existing, found := (*solutionSet)[hash]; found {
			for i := range existing {
				if gridsEqual(grid, &existing[i]) {
					return
				}
			}
		}
		gridCopy := *grid
		(*solutionSet)[hash] = append((*solutionSet)[hash], gridCopy)
		*solutions = append(*solutions, gridCopy)

		if !progressCallback.IsUndefined() {
			count := len(*solutions)
			jsGrid := gridToJS(&gridCopy)
			progressCallback.Invoke(count, jsGrid)
		}
		return
	}

	pieceIndex := 0
	for pieceIndex < NUM_PIECES && (usedMask&(1<<pieceIndex)) != 0 {
		pieceIndex++
	}

	shapes := transformedPieces[pieceIndex]
	newUsedMask := usedMask | (1 << pieceIndex)
	pieceID := pieceIndex + 1

	for _, shape := range shapes {
		for r := 0; r < ROWS; r++ {
			for c := 0; c < COLS; c++ {
				if canPlace(grid, shape, r, c) {
					place(grid, shape, r, c, pieceID)
					solve(grid, newUsedMask, solutions, solutionSet, memo, progressCallback)
					remove(grid, shape, r, c)
					if len(*solutions) >= MAX_SOLUTIONS {
						return
					}
				}
			}
		}
	}
}

func gridToJS(grid *[ROWS][COLS]int) js.Value {
	jsGrid := js.Global().Get("Array").New(ROWS)
	for i := 0; i < ROWS; i++ {
		jsRow := js.Global().Get("Array").New(COLS)
		for j := 0; j < COLS; j++ {
			jsRow.SetIndex(j, grid[i][j])
		}
		jsGrid.SetIndex(i, jsRow)
	}
	return jsGrid
}

func solvePuzzle(this js.Value, args []js.Value) interface{} {
	if len(args) < 2 {
		return map[string]interface{}{"error": "Need month and day"}
	}

	month := args[0].String()
	day := args[1].String()

	var progressCallback js.Value
	if len(args) >= 3 && !args[2].IsUndefined() {
		progressCallback = args[2]
	}

	grid := initGrid(month, day)
	solutions := make([][ROWS][COLS]int, 0, MAX_SOLUTIONS)
	solutionSet := make(map[uint64][][ROWS][COLS]int)
	memo := make(map[uint64]bool)

	solve(&grid, 0, &solutions, &solutionSet, &memo, progressCallback)

	jsSolutions := js.Global().Get("Array").New(len(solutions))
	for i := range solutions {
		jsSolutions.SetIndex(i, gridToJS(&solutions[i]))
	}

	return map[string]interface{}{
		"solutions": jsSolutions,
		"count":     len(solutions),
	}
}

func main() {
	js.Global().Set("goSolvePuzzle", js.FuncOf(solvePuzzle))
	select {}
}
