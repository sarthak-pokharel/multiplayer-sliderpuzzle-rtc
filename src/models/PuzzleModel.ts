/**
 * Represents the sliding puzzle game model with core game logic
 */
export class PuzzleModel {
  private board: number[][]
  private emptyPosition: { row: number; col: number }
  private readonly solution: number[][]
  private readonly dimension: number

  /**
   * Create a new puzzle model
   * @param dimension Size of the puzzle grid (e.g., 3 for 3x3)
   */
  constructor(dimension: number = 3) {
    // Ensure dimension is within valid range (2-8)
    this.dimension = Math.max(2, Math.min(8, dimension))
    
    // Initialize solution and board
    this.solution = this.createSolvedBoard()
    this.board = this.copyBoard(this.solution)
    
    // Set initial empty position to bottom right
    this.emptyPosition = {
      row: this.dimension - 1,
      col: this.dimension - 1
    }
  }

  /**
   * Get the current size of the puzzle
   */
  getDimension(): number {
    return this.dimension
  }

  /**
   * Get the current state of the puzzle board
   */
  getBoard(): number[][] {
    return this.copyBoard(this.board)
  }

  /**
   * Check if the puzzle is solved
   */
  isSolved(): boolean {
    for (let row = 0; row < this.dimension; row++) {
      for (let col = 0; col < this.dimension; col++) {
        if (this.board[row][col] !== this.solution[row][col]) {
          return false
        }
      }
    }
    return true
  }

  /**
   * Get the value of a tile at the specified position
   */
  getTileValue(row: number, col: number): number {
    if (this.isValidPosition(row, col)) {
      return this.board[row][col]
    }
    return -1 // Invalid position
  }

  /**
   * Check if a tile can be moved (in same row or column as empty space)
   */
  canMoveTile(row: number, col: number): boolean {
    if (!this.isValidPosition(row, col)) return false
    
    const { row: emptyRow, col: emptyCol } = this.emptyPosition
    
    // Allow movement if tile is in the same row or column as the empty space
    return (row === emptyRow || col === emptyCol)
  }

  /**
   * Get the tiles that would be affected by moving a specific tile
   * @returns Array of positions that would move, or empty array if move is invalid
   */
  getAffectedTiles(row: number, col: number): {row: number, col: number}[] {
    if (!this.canMoveTile(row, col)) return []
    
    const affectedTiles: {row: number, col: number}[] = []
    const { row: emptyRow, col: emptyCol } = this.emptyPosition
    
    // Don't include the clicked tile itself or the empty space
    if (row === emptyRow) {
      // Horizontal shift (same row)
      const start = Math.min(col, emptyCol) + 1
      const end = Math.max(col, emptyCol)
      
      for (let c = start; c < end; c++) {
        affectedTiles.push({row, col: c})
      }
    } else if (col === emptyCol) {
      // Vertical shift (same column)
      const start = Math.min(row, emptyRow) + 1
      const end = Math.max(row, emptyRow)
      
      for (let r = start; r < end; r++) {
        affectedTiles.push({row: r, col})
      }
    }
    
    return affectedTiles
  }

  /**
   * Move a tile if possible
   * @returns true if move was successful
   */
  moveTile(row: number, col: number): boolean {
    if (!this.canMoveTile(row, col)) return false
    
    const { row: emptyRow, col: emptyCol } = this.emptyPosition
    
    // Handle row shift (horizontal)
    if (row === emptyRow) {
      this.shiftRow(row, col)
      return true
    }
    
    // Handle column shift (vertical)
    if (col === emptyCol) {
      this.shiftColumn(col, row)
      return true
    }
    
    return false
  }

  /**
   * Shift all tiles in a row between the clicked tile and the empty space
   */
  private shiftRow(row: number, clickedCol: number): void {
    const { col: emptyCol } = this.emptyPosition
    
    // Determine direction of shift
    const direction = emptyCol < clickedCol ? 1 : -1
    
    // Move all tiles between the empty space and the clicked tile
    for (let col = emptyCol; col !== clickedCol; col += direction) {
      const nextCol = col + direction
      this.board[row][col] = this.board[row][nextCol]
    }
    
    // Place empty at the clicked position
    this.board[row][clickedCol] = 0
    
    // Update empty position
    this.emptyPosition = { row, col: clickedCol }
  }

  /**
   * Shift all tiles in a column between the clicked tile and the empty space
   */
  private shiftColumn(col: number, clickedRow: number): void {
    const { row: emptyRow } = this.emptyPosition
    
    // Determine direction of shift
    const direction = emptyRow < clickedRow ? 1 : -1
    
    // Move all tiles between the empty space and the clicked tile
    for (let row = emptyRow; row !== clickedRow; row += direction) {
      const nextRow = row + direction
      this.board[row][col] = this.board[nextRow][col]
    }
    
    // Place empty at the clicked position
    this.board[clickedRow][col] = 0
    
    // Update empty position
    this.emptyPosition = { row: clickedRow, col }
  }

  /**
   * Reset the puzzle to the solved state
   */
  reset(): void {
    this.board = this.copyBoard(this.solution)
    this.emptyPosition = {
      row: this.dimension - 1,
      col: this.dimension - 1
    }
  }

  /**
   * Shuffle the puzzle with random moves
   */
  shuffle(moves = 200): void {
    // Reset to ensure we start from a solvable state
    this.reset()
    
    // Scale moves by puzzle size
    const shuffleMoves = Math.max(moves, this.dimension * this.dimension * 10)
    
    // Make random moves to shuffle
    for (let i = 0; i < shuffleMoves; i++) {
      const possibleMoves = this.getPossibleMoves()
      
      // Choose a random move
      const randomIndex = Math.floor(Math.random() * possibleMoves.length)
      const [moveRow, moveCol] = possibleMoves[randomIndex]
      
      // Use simple adjacent-only moves for shuffling to maintain solvability
      this.moveAdjacentTile(moveRow, moveCol)
    }

    // Ensure puzzle is not already solved
    if (this.isSolved()) {
      this.shuffle(shuffleMoves)
    }
  }

  /**
   * Move a tile that is adjacent to the empty space (used for shuffling)
   */
  private moveAdjacentTile(row: number, col: number): boolean {
    if (!this.isValidPosition(row, col)) return false
    
    const { row: emptyRow, col: emptyCol } = this.emptyPosition
    
    // Only allow adjacent moves
    if ((Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
        (Math.abs(col - emptyCol) === 1 && row === emptyRow)) {
      // Swap the selected tile with the empty tile
      this.board[emptyRow][emptyCol] = this.board[row][col]
      this.board[row][col] = 0
      
      // Update empty position
      this.emptyPosition = { row, col }
      
      return true
    }
    
    return false
  }

  /**
   * Create a solved board for the current dimension
   */
  private createSolvedBoard(): number[][] {
    const board: number[][] = []
    let value = 1
    
    for (let row = 0; row < this.dimension; row++) {
      const currentRow: number[] = []
      for (let col = 0; col < this.dimension; col++) {
        // Last cell is the empty spot (0)
        if (row === this.dimension - 1 && col === this.dimension - 1) {
          currentRow.push(0)
        } else {
          currentRow.push(value++)
        }
      }
      board.push(currentRow)
    }
    
    return board
  }

  /**
   * Helper method to deep copy a board
   */
  private copyBoard(board: number[][]): number[][] {
    return board.map(row => [...row])
  }

  /**
   * Check if a position is valid on the board
   */
  private isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < this.dimension && col >= 0 && col < this.dimension
  }

  /**
   * Get possible moves from the current position
   */
  private getPossibleMoves(): [number, number][] {
    const possibleMoves: [number, number][] = []
    const { row, col } = this.emptyPosition
    
    // Check all four directions: up, down, left, right
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    
    for (const [dRow, dCol] of directions) {
      const newRow = row + dRow
      const newCol = col + dCol
      
      if (this.isValidPosition(newRow, newCol)) {
        possibleMoves.push([newRow, newCol])
      }
    }
    
    return possibleMoves
  }
} 