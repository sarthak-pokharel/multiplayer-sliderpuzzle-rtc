import { Puzzle } from './puzzle';

export function setupPuzzle(container: HTMLElement) {
  // Default starting dimension
  let currentDimension = 3;
  let gameStarted = false;
  let puzzle: Puzzle;
  let moveCount = 0;

  // Create initial welcome screen
  container.innerHTML = `
    <div class="welcome-screen">
      <h1>Sliding Puzzle Game</h1>
      <div class="welcome-content">
        <p>Select a puzzle size and click Start Game to begin!</p>
        <div class="dimension-selector">
          <label for="dimension-select">Choose puzzle size:</label>
          <select id="dimension-select">
            <option value="3">3×3 (Easy)</option>
            <option value="4">4×4 (Medium)</option>
            <option value="5">5×5 (Hard)</option>
            <option value="6">6×6 (Expert)</option>
            <option value="7">7×7 (Master)</option>
            <option value="8">8×8 (Impossible)</option>
          </select>
        </div>
        <button id="start-game" class="pulse-button">Start Game</button>
      </div>
    </div>
  `;

  // Initialize event listeners for the welcome screen
  const startButton = container.querySelector('#start-game') as HTMLButtonElement;
  const dimensionSelect = container.querySelector('#dimension-select') as HTMLSelectElement;

  startButton.addEventListener('click', () => {
    currentDimension = parseInt(dimensionSelect.value);
    startGame();
  });

  // Function to start the game
  function startGame() {
    gameStarted = true;
    
    // Create puzzle instance with selected dimension
    puzzle = new Puzzle(currentDimension);
    
    // Switch to fullscreen
    document.documentElement.requestFullscreen().catch(err => {
      console.log(`Error attempting to enable fullscreen: ${err.message}`);
    });
    
    // Update container with game UI
    container.innerHTML = `
      <div class="puzzle-container fullscreen">
        <div class="game-header">
          <h2>Sliding Puzzle ${currentDimension}×${currentDimension}</h2>
          <div class="game-stats">
            <div id="moves-counter">Moves: 0</div>
            <div id="status-message"></div>
          </div>
        </div>
        <div class="puzzle-board" id="puzzle-board"></div>
        <div class="puzzle-controls">
          <button id="shuffle-button">Shuffle</button>
          <button id="back-button">Back</button>
        </div>
      </div>
    `;

    // Get new element references
    const boardElement = container.querySelector('.puzzle-board') as HTMLElement;
    const shuffleButton = container.querySelector('#shuffle-button') as HTMLButtonElement;
    const backButton = container.querySelector('#back-button') as HTMLButtonElement;
    const movesCounter = container.querySelector('#moves-counter') as HTMLElement;
    const statusMessage = container.querySelector('#status-message') as HTMLElement;

    // Reset move counter
    moveCount = 0;

    // Update board size based on dimension
    function updateBoardStyle(dimension: number) {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Calculate the maximum size that can fit the screen (with some margin)
      const maxSize = Math.min(viewportHeight * 0.7, viewportWidth * 0.8);
      const tileSize = Math.floor(maxSize / dimension);
      const boardSize = tileSize * dimension + (dimension * 2);
      
      boardElement.style.gridTemplateColumns = `repeat(${dimension}, 1fr)`;
      boardElement.style.gridTemplateRows = `repeat(${dimension}, 1fr)`;
      boardElement.style.width = `${boardSize}px`;
      boardElement.style.height = `${boardSize}px`;
      
      // Adjust font size for tiles based on dimension
      const fontSize = Math.max(16, Math.floor(48 / dimension * 3));
      document.documentElement.style.setProperty('--tile-font-size', `${fontSize}px`);
    }
    
    // Function to update the UI based on the current game state
    function updateBoard() {
      const board = puzzle.getBoard();
      const dimension = puzzle.getDimension();
      
      // Clear the board
      boardElement.innerHTML = '';
      
      // Update board grid styling
      updateBoardStyle(dimension);
      
      // Create the tile elements
      for (let row = 0; row < dimension; row++) {
        for (let col = 0; col < dimension; col++) {
          const value = board[row][col];
          
          // Don't create a tile for the empty space (0)
          if (value === 0) continue;
          
          // Create a tile element
          const tile = document.createElement('div');
          tile.className = 'puzzle-tile';
          tile.textContent = value.toString();
          
          // Position the tile using CSS grid
          tile.style.gridRow = `${row + 1}`;
          tile.style.gridColumn = `${col + 1}`;
          
          // Add click handler
          tile.addEventListener('click', () => handleTileClick(row, col));
          
          boardElement.appendChild(tile);
        }
      }
    }
    
    // Handle tile click
    function handleTileClick(row: number, col: number) {
      // Try to move the tile
      if (puzzle.move(row, col)) {
        moveCount++;
        movesCounter.textContent = `Moves: ${moveCount}`;
        updateBoard();
        
        // Check if the puzzle is solved
        if (puzzle.isSolved()) {
          statusMessage.textContent = `Congratulations! You solved the ${currentDimension}×${currentDimension} puzzle in ${moveCount} moves!`;
          statusMessage.className = 'success-message';
        }
      }
    }
    
    // Reset game state
    function resetGame() {
      puzzle.shuffle();
      moveCount = 0;
      movesCounter.textContent = 'Moves: 0';
      statusMessage.textContent = '';
      statusMessage.className = '';
      updateBoard();
    }
    
    // Return to welcome screen
    function backToWelcome() {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.log(`Error exiting fullscreen: ${err.message}`);
        });
      }
      
      gameStarted = false;
      setupPuzzle(container);
    }
    
    // Event listeners
    shuffleButton.addEventListener('click', resetGame);
    backButton.addEventListener('click', backToWelcome);
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (gameStarted) {
        updateBoardStyle(currentDimension);
      }
    });
    
    // Initial board setup and shuffle
    updateBoardStyle(currentDimension);
    updateBoard();
    resetGame();
  }
  
  // Add keyboard escape handler to exit fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameStarted && document.fullscreenElement) {
      // Don't exit the game, just exit fullscreen
      document.exitFullscreen().catch(err => {
        console.log(`Error exiting fullscreen: ${err.message}`);
      });
    }
  });

  return {
    startGame: () => {
      if (!gameStarted) {
        currentDimension = parseInt(dimensionSelect.value);
        startGame();
      }
    }
  };
} 