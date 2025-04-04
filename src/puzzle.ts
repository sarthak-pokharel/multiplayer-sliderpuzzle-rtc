// Game state and logic for the puzzle game
export class Puzzle {
  // The current state of the puzzle
  private board: number[][];
  // Position of the empty tile (represented as 0)
  private emptyRow: number;
  private emptyCol: number;
  // Solution state
  private readonly solution: number[][];
  // Dimension of the puzzle (e.g., 3 for 3x3, 4 for 4x4, etc.)
  private readonly dimension: number;

  constructor(dimension: number = 3) {
    // Ensure dimension is within valid range
    this.dimension = Math.max(2, Math.min(8, dimension));
    
    // Initialize a solved board
    this.solution = this.createSolvedBoard();
    
    // Set the initial board to the solution
    this.board = this.copyBoard(this.solution);
    this.emptyRow = this.dimension - 1;
    this.emptyCol = this.dimension - 1;
  }

  // Create a solved board for the current dimension
  private createSolvedBoard(): number[][] {
    const board: number[][] = [];
    let value = 1;
    
    for (let i = 0; i < this.dimension; i++) {
      const row: number[] = [];
      for (let j = 0; j < this.dimension; j++) {
        // Last cell is the empty spot (0)
        if (i === this.dimension - 1 && j === this.dimension - 1) {
          row.push(0);
        } else {
          row.push(value++);
        }
      }
      board.push(row);
    }
    
    return board;
  }

  // Get the dimension of the puzzle
  getDimension(): number {
    return this.dimension;
  }

  // Get the current board state
  getBoard(): number[][] {
    return this.copyBoard(this.board);
  }

  // Helper method to deep copy a board
  private copyBoard(board: number[][]): number[][] {
    return board.map(row => [...row]);
  }

  // Check if the puzzle is solved
  isSolved(): boolean {
    for (let i = 0; i < this.dimension; i++) {
      for (let j = 0; j < this.dimension; j++) {
        if (this.board[i][j] !== this.solution[i][j]) {
          return false;
        }
      }
    }
    
    return true;
  }

  // Get the value at a specific position
  getTileValue(row: number, col: number): number {
    if (row >= 0 && row < this.dimension && col >= 0 && col < this.dimension) {
      return this.board[row][col];
    }
    return -1; // Invalid position
  }

  // Check if a tile can be moved
  canMove(row: number, col: number): boolean {
    return (
      (Math.abs(row - this.emptyRow) === 1 && col === this.emptyCol) ||
      (Math.abs(col - this.emptyCol) === 1 && row === this.emptyRow)
    );
  }

  // Move a tile if it's adjacent to the empty space
  // Returns true if the move was successful
  move(row: number, col: number): boolean {
    if (this.canMove(row, col)) {
      // Swap the selected tile with the empty tile
      this.board[this.emptyRow][this.emptyCol] = this.board[row][col];
      this.board[row][col] = 0;
      
      // Update empty tile position
      this.emptyRow = row;
      this.emptyCol = col;
      
      return true;
    }
    
    return false;
  }

  // Reset the board to the solution state
  reset(): void {
    this.board = this.copyBoard(this.solution);
    this.emptyRow = this.dimension - 1;
    this.emptyCol = this.dimension - 1;
  }

  // Shuffle the board to create a new puzzle
  shuffle(moves = 200): void {
    // First reset to ensure we start from a solvable state
    this.reset();
    
    // For larger puzzles, we need more moves to shuffle
    const shuffleMoves = Math.max(moves, this.dimension * this.dimension * 10);
    
    // Make random moves to shuffle the board
    for (let i = 0; i < shuffleMoves; i++) {
      const possibleMoves = this.getPossibleMoves();
      
      // Choose a random move
      const randomIndex = Math.floor(Math.random() * possibleMoves.length);
      const [moveRow, moveCol] = possibleMoves[randomIndex];
      
      // Make the move
      this.move(moveRow, moveCol);
    }

    // If we ended up with a solved puzzle (by chance), shuffle again
    if (this.isSolved()) {
      this.shuffle(shuffleMoves);
    }
  }

  // Get possible moves from the current position
  private getPossibleMoves(): [number, number][] {
    const possibleMoves: [number, number][] = [];
    
    // Check all four directions
    const directions = [
      [-1, 0], // up
      [1, 0],  // down
      [0, -1], // left
      [0, 1]   // right
    ];
    
    for (const [dRow, dCol] of directions) {
      const newRow = this.emptyRow + dRow;
      const newCol = this.emptyCol + dCol;
      
      // Make sure the move is within the board
      if (newRow >= 0 && newRow < this.dimension && newCol >= 0 && newCol < this.dimension) {
        possibleMoves.push([newRow, newCol]);
      }
    }
    
    return possibleMoves;
  }
}