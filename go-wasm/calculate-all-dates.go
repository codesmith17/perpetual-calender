package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
)

const (
	ROWS       = 7
	COLS       = 7
	NUM_PIECES = 8
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

const allPiecesMask = (1 << NUM_PIECES) - 1

func solve(
	grid *[ROWS][COLS]int,
	usedMask int,
	solutions *[][ROWS][COLS]int,
	solutionSet *map[uint64][][ROWS][COLS]int,
	memo *map[uint64]bool,
) {
	hash := gridHash(grid, usedMask)
	if (*memo)[hash] {
		return
	}
	(*memo)[hash] = true

	if usedMask == allPiecesMask {
		if existing, found := (*solutionSet)[hash]; found {
			for i := range existing {
				if existing[i] == *grid {
					return
				}
			}
		}
		gridCopy := *grid
		(*solutionSet)[hash] = append((*solutionSet)[hash], gridCopy)
		*solutions = append(*solutions, gridCopy)
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
					solve(grid, newUsedMask, solutions, solutionSet, memo)
					remove(grid, shape, r, c)
				}
			}
		}
	}
}

type DateResult struct {
	Month     string          `json:"month"`
	Day       int             `json:"day"`
	Solutions int             `json:"solutions"`
	Grids     [][][]int       `json:"grids"`
	Time      float64         `json:"time"`
}

type AllResults struct {
	GeneratedAt string       `json:"generated_at"`
	TotalTime   float64      `json:"total_time"`
	Results     []DateResult `json:"results"`
}

func main() {
	months := []string{"JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"}
	daysInMonth := []int{31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31}

	var allResults AllResults
	allResults.GeneratedAt = time.Now().Format(time.RFC3339)
	globalStart := time.Now()

	total := 0
	for _, days := range daysInMonth {
		total += days
	}

	fmt.Printf("🚀 Calculating ALL solutions for all %d dates...\n", total)
	fmt.Println(strings.Repeat("=", 71))

	count := 0
	for monthIdx, month := range months {
		maxDay := daysInMonth[monthIdx]
		for day := 1; day <= maxDay; day++ {
			count++
			dayStr := fmt.Sprintf("%d", day)

			fmt.Printf("\r[%3d/%d] %s %2d ", count, total, month, day)

			start := time.Now()
			grid := initGrid(month, dayStr)
			solutions := make([][ROWS][COLS]int, 0)
			solutionSet := make(map[uint64][][ROWS][COLS]int)
			memo := make(map[uint64]bool)

			solve(&grid, 0, &solutions, &solutionSet, &memo)

			elapsed := time.Since(start).Seconds()

			// Convert fixed arrays to slices for JSON
			grids := make([][][]int, len(solutions))
			for i, sol := range solutions {
				grids[i] = make([][]int, ROWS)
				for r := 0; r < ROWS; r++ {
					grids[i][r] = make([]int, COLS)
					copy(grids[i][r], sol[r][:])
				}
			}

			result := DateResult{
				Month:     month,
				Day:       day,
				Solutions: len(solutions),
				Grids:     grids,
				Time:      elapsed,
			}
			allResults.Results = append(allResults.Results, result)

			fmt.Printf("✓ %3d solutions in %.3fs", len(solutions), elapsed)
		}
		fmt.Println()
	}

	allResults.TotalTime = time.Since(globalStart).Seconds()

	// Write to JSON file
	jsonData, err := json.MarshalIndent(allResults, "", "  ")
	if err != nil {
		fmt.Printf("Error marshaling JSON: %v\n", err)
		return
	}

	err = os.WriteFile("all-solutions.json", jsonData, 0644)
	if err != nil {
		fmt.Printf("Error writing file: %v\n", err)
		return
	}

	fmt.Println("\n" + strings.Repeat("=", 71))
	fmt.Printf("✅ Complete! Total time: %.2fs\n", allResults.TotalTime)
	fmt.Printf("📁 Results saved to: all-solutions.json\n")
}
