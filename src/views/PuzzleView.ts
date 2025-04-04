import { isTouchDevice } from '../utils/helpers'

/**
 * Type for board click handler
 */
export type TileClickHandler = (row: number, col: number) => void

/**
 * Type for button click handlers
 */
export type ButtonClickHandler = () => void

/**
 * View class responsible for rendering the puzzle UI
 */
export class PuzzleView {
  private container: HTMLElement
  private boardElement: HTMLElement | null = null
  private movesCounter: HTMLElement | null = null
  private statusMessage: HTMLElement | null = null
  private currentDimension: number = 3
  private isTouch: boolean = false
  private tileElements: Map<number, HTMLElement> = new Map()
  private isAnimating: boolean = false
  private tileSize: number = 0 // Store tile size for animations

  /**
   * Create a new puzzle view
   * @param container DOM element to render into
   */
  constructor(container: HTMLElement) {
    this.container = container
    this.isTouch = isTouchDevice()
  }

  /**
   * Render the welcome screen UI
   * @param startHandler Handler for start button click
   * @param initialDimension Default puzzle dimension
   * @returns Selected dimension element for access
   */
  renderWelcomeScreen(startHandler: ButtonClickHandler, initialDimension: number = 3): HTMLSelectElement {
    // Clear any existing tile references when returning to welcome screen
    this.tileElements.clear()
    
    this.container.innerHTML = `
      <div class="welcome-screen">
        <h1>Sliding Puzzle Game</h1>
        <div class="welcome-content">
          <p>Select a puzzle size and click Start Game to begin!</p>
          <div class="dimension-selector">
            <label for="dimension-select">Choose puzzle size:</label>
            <select id="dimension-select" aria-label="Puzzle size selection">
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
    `

    // Set up event handlers
    const startButton = this.container.querySelector('#start-game') as HTMLButtonElement
    const dimensionSelect = this.container.querySelector('#dimension-select') as HTMLSelectElement
    
    // Set initial value
    dimensionSelect.value = initialDimension.toString()
    
    // Add click handler
    startButton.addEventListener('click', startHandler)
    
    return dimensionSelect
  }

  /**
   * Render the game UI
   * @param dimension Puzzle dimension
   * @param shuffleHandler Handler for shuffle button click
   * @param backHandler Handler for back button click
   */
  renderGameUI(dimension: number, shuffleHandler: ButtonClickHandler, backHandler: ButtonClickHandler): void {
    this.currentDimension = dimension
    
    // Update container with game UI
    this.container.innerHTML = `
      <div class="puzzle-container fullscreen">
        <div class="game-header">
          <h2>Sliding Puzzle ${dimension}×${dimension}</h2>
          <div class="game-stats">
            <div id="moves-counter" aria-live="polite">Moves: 0</div>
            <div id="status-message" aria-live="assertive"></div>
          </div>
        </div>
        <div class="puzzle-board" id="puzzle-board" role="grid" aria-label="Sliding puzzle game board"></div>
        <div class="puzzle-controls">
          <button id="shuffle-button">Shuffle</button>
          <button id="back-button">Back</button>
        </div>
      </div>
    `

    // Store references to elements
    this.boardElement = this.container.querySelector('.puzzle-board')
    this.movesCounter = this.container.querySelector('#moves-counter')
    this.statusMessage = this.container.querySelector('#status-message')

    // Set up event handlers
    const shuffleButton = this.container.querySelector('#shuffle-button') as HTMLButtonElement
    const backButton = this.container.querySelector('#back-button') as HTMLButtonElement
    
    shuffleButton.addEventListener('click', shuffleHandler)
    backButton.addEventListener('click', backHandler)
    
    // Clear previous tile references
    this.tileElements.clear()
  }

  /**
   * Update the board display with current game state
   * @param board The game board state
   * @param clickHandler Handler for tile clicks
   */
  updateBoard(board: number[][], clickHandler: TileClickHandler): void {
    if (!this.boardElement) return
    
    const dimension = board.length
    
    // If this is a complete reset (like after shuffle), clear all tiles
    if (this.tileElements.size === 0 || this.tileElements.size !== dimension * dimension - 1) {
      // Clear the board
      this.boardElement.innerHTML = ''
      this.tileElements.clear()
      
      // Update board grid styling
      this.updateBoardStyle(dimension)
      
      // Create new tile elements
      this.createTileElements(board, clickHandler)
    } else {
      // Just update positions of existing tiles
      this.updateTilePositions(board, clickHandler)
    }
  }

  /**
   * Create all tile elements for the board
   */
  private createTileElements(board: number[][], clickHandler: TileClickHandler): void {
    if (!this.boardElement) return
    
    const dimension = board.length
    
    // Add creating-tiles class for appear animation
    this.boardElement.classList.add('creating-tiles')
    
    // Calculate tile size based on board dimensions
    const boardRect = this.boardElement.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(this.boardElement)
    const boardPadding = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight)
    const gap = 6 // Gap between tiles
    
    // Calculate available space and tile size
    const availableSpace = boardRect.width - boardPadding
    this.tileSize = (availableSpace - (dimension - 1) * gap) / dimension
    
    // Create tile elements
    for (let row = 0; row < dimension; row++) {
      for (let col = 0; col < dimension; col++) {
        const value = board[row][col]
        
        // Skip empty space (0)
        if (value === 0) continue
        
        // Create a tile element
        const tile = document.createElement('div')
        tile.className = 'puzzle-tile'
        tile.textContent = value.toString()
        
        // Add accessibility attributes
        tile.setAttribute('role', 'button')
        tile.setAttribute('aria-label', `Tile ${value}`)
        
        // Add tabindex for keyboard navigation
        tile.setAttribute('tabindex', '0')
        
        // Store initial position
        tile.dataset.row = row.toString()
        tile.dataset.col = col.toString()
        tile.dataset.value = value.toString()
        
        // Position the tile using absolute positioning
        this.setTilePosition(tile, row, col, false)
        
        // Add event handlers for both mouse and keyboard
        tile.addEventListener('click', () => {
          if (!this.isAnimating) {
            clickHandler(parseInt(tile.dataset.row!), parseInt(tile.dataset.col!))
          }
        })
        
        // Add keyboard handler
        tile.addEventListener('keydown', (e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !this.isAnimating) {
            clickHandler(parseInt(tile.dataset.row!), parseInt(tile.dataset.col!))
            e.preventDefault()
          }
        })
        
        // Add touch-specific styles if on a touch device
        if (this.isTouch) {
          tile.classList.add('touch-device')
        }
        
        // Store reference to the tile
        this.tileElements.set(value, tile)
        
        this.boardElement.appendChild(tile)
      }
    }
    
    // Remove the creating-tiles class after animation completes
    setTimeout(() => {
      if (this.boardElement) {
        this.boardElement.classList.remove('creating-tiles')
      }
    }, 200); // Reduced from 350ms to match faster animation
  }

  /**
   * Update positions of existing tiles
   */
  private updateTilePositions(board: number[][], clickHandler: TileClickHandler): void {
    if (!this.boardElement) return
    
    const dimension = board.length
    
    // Find and update positions of all tiles
    for (let row = 0; row < dimension; row++) {
      for (let col = 0; col < dimension; col++) {
        const value = board[row][col]
        
        // Skip empty space (0)
        if (value === 0) continue
        
        const tile = this.tileElements.get(value)
        
        if (tile) {
          const oldRow = parseInt(tile.dataset.row || '0')
          const oldCol = parseInt(tile.dataset.col || '0')
          
          // Only animate if position has changed
          if (oldRow !== row || oldCol !== col) {
            // Update data attributes
            tile.dataset.row = row.toString()
            tile.dataset.col = col.toString()
            
            // Animate the move
            this.animateTileMove(tile, oldRow, oldCol, row, col)
          }
        }
      }
    }
  }

  /**
   * Position a tile at specific row/col using transforms
   */
  private setTilePosition(tile: HTMLElement, row: number, col: number, animate: boolean = true): void {
    // Set the size of the tile
    tile.style.width = `${this.tileSize}px`
    tile.style.height = `${this.tileSize}px`
    
    // Get actual board padding from computed style
    const computedStyle = window.getComputedStyle(this.boardElement!)
    const boardPadding = parseFloat(computedStyle.paddingLeft)
    const gap = 6 // Gap between tiles
    
    // Calculate position including the board padding
    const x = boardPadding + col * (this.tileSize + gap)
    const y = boardPadding + row * (this.tileSize + gap)
    
    if (animate) {
      // For animated moves, apply a transform
      tile.style.transform = `translate3d(${x}px, ${y}px, 0)`
    } else {
      // For initial positioning, set the transform without transition
      tile.style.transition = 'none'
      tile.style.transform = `translate3d(${x}px, ${y}px, 0)`
      
      // Force a reflow to ensure the transition is disabled
      void tile.offsetWidth
      
      // Re-enable transitions after initial positioning
      setTimeout(() => {
        tile.style.transition = ''
      }, 10)
    }
  }

  /**
   * Animate a tile moving from one position to another
   */
  private animateTileMove(tile: HTMLElement, fromRow: number, fromCol: number, toRow: number, toCol: number): void {
    this.isAnimating = true
    
    // Calculate the distance the tile is moving
    const rowDistance = Math.abs(toRow - fromRow)
    const colDistance = Math.abs(toCol - fromCol)
    const isLongMove = rowDistance > 1 || colDistance > 1
    
    // Add animation class
    tile.classList.add('sliding')
    
    // Add class for long moves (multiple positions)
    if (isLongMove) {
      tile.classList.add('long-move')
    }
    
    // Set position with transform for smooth animation
    this.setTilePosition(tile, toRow, toCol, true)
    
    // After animation completes
    const handleAnimationEnd = () => {
      tile.classList.remove('sliding')
      if (isLongMove) {
        tile.classList.remove('long-move')
      }
      this.isAnimating = false
    }
    
    // Listen for the end of the transition
    tile.addEventListener('transitionend', handleAnimationEnd, { once: true })
    
    // Fallback in case the transition event doesn't fire
    // Faster timing to match CSS
    const animationDuration = isLongMove ? 350 : 250
    setTimeout(() => {
      tile.classList.remove('sliding')
      if (isLongMove) {
        tile.classList.remove('long-move')
      }
      this.isAnimating = false
    }, animationDuration)
  }

  /**
   * Update the move counter display
   * @param moves Current move count
   */
  updateMoveCount(moves: number): void {
    if (this.movesCounter) {
      this.movesCounter.textContent = `Moves: ${moves}`
    }
  }

  /**
   * Display a success message when puzzle is solved
   * @param moves Number of moves taken to solve
   */
  showSuccessMessage(moves: number): void {
    if (this.statusMessage) {
      this.statusMessage.textContent = `Congratulations! You solved the ${this.currentDimension}×${this.currentDimension} puzzle in ${moves} moves!`
      this.statusMessage.className = 'success-message'
    }
  }

  /**
   * Clear any status messages
   */
  clearStatusMessage(): void {
    if (this.statusMessage) {
      this.statusMessage.textContent = ''
      this.statusMessage.className = ''
    }
  }

  /**
   * Update board sizing based on viewport and dimension
   */
  private updateBoardStyle(dimension: number): void {
    if (!this.boardElement) return
    
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    
    // Calculate maximum size that fits the screen
    const maxSize = Math.min(viewportHeight * 0.7, viewportWidth * 0.8)
    const boardSize = maxSize
    
    // Update board size
    this.boardElement.style.width = `${boardSize}px`
    this.boardElement.style.height = `${boardSize}px`
    
    // Set current dimension for CSS grid pattern
    document.documentElement.style.setProperty('--current-dimension', dimension.toString())
    
    // Get the actual board size after applying CSS
    const boardRect = this.boardElement.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(this.boardElement)
    const boardPadding = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight)
    const gap = 6 // Gap between tiles
    
    // Calculate available space for tiles
    const availableSpace = boardRect.width - boardPadding
    
    // Calculate tile size to exactly fill the available space
    this.tileSize = (availableSpace - (dimension - 1) * gap) / dimension
    
    // Adjust font size based on dimension
    const fontSize = Math.max(16, Math.floor(48 / dimension * 3))
    document.documentElement.style.setProperty('--tile-font-size', `${fontSize}px`)
    
    // Update positions of all existing tiles with new size
    this.updateTileSizes()
  }
  
  /**
   * Update all tile sizes when board is resized
   */
  private updateTileSizes(): void {
    this.tileElements.forEach((tile) => {
      const row = parseInt(tile.dataset.row || '0')
      const col = parseInt(tile.dataset.col || '0')
      this.setTilePosition(tile, row, col, false)
    })
  }

  /**
   * Adjust the board size on window resize
   */
  handleResize(): void {
    this.updateBoardStyle(this.currentDimension)
  }
} 