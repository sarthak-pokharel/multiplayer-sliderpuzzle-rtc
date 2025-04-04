import { PuzzleModel } from '../models/PuzzleModel'
import { PuzzleView } from '../views/PuzzleView'
import { debounce, supportsFullscreen } from '../utils/helpers'

/**
 * Controller class that manages game state and connects model with view
 */
export class GameController {
  private model: PuzzleModel | null = null
  private view: PuzzleView
  private moveCount: number = 0
  private dimensionSelect: HTMLSelectElement | null = null
  private gameStarted: boolean = false
  private isMoving: boolean = false
  
  // Debounced resize handler
  private resizeHandler = debounce(() => {
    if (this.gameStarted) {
      this.view.handleResize()
    }
  }, 150)

  /**
   * Create a new game controller
   * @param container HTML element to render game into
   */
  constructor(container: HTMLElement) {
    this.view = new PuzzleView(container)
  }

  /**
   * Start the game by displaying welcome screen
   */
  start(): void {
    // Initial dimension
    const initialDimension = 3
    
    // Render welcome screen
    this.dimensionSelect = this.view.renderWelcomeScreen(
      () => this.startGame(),
      initialDimension
    )
    
    // Set up keyboard handler for fullscreen escape
    this.setupKeyboardHandlers()
  }

  /**
   * Start the actual puzzle game with selected settings
   */
  private startGame(): void {
    this.gameStarted = true
    
    // Get selected dimension
    const dimension = this.dimensionSelect ? 
      parseInt(this.dimensionSelect.value) : 3
    
    // Create puzzle model
    this.model = new PuzzleModel(dimension)
    
    // Reset move count
    this.moveCount = 0
    
    // Try to enter fullscreen mode
    this.enterFullscreen()
    
    // Render game UI
    this.view.renderGameUI(
      dimension,
      () => this.resetGame(),
      () => this.backToWelcome()
    )
    
    // Setup window resize handler
    window.addEventListener('resize', this.resizeHandler)
    
    // Update and render the board
    this.updateBoard()
    
    // Shuffle the puzzle to start
    this.resetGame()
  }

  /**
   * Handle tile click events with animation handling
   */
  private handleTileClick(row: number, col: number): void {
    if (!this.model || this.isMoving) return
    
    // Check if the move is valid
    if (this.model.canMoveTile(row, col)) {
      // Now that we know the move is valid, prevent multiple moves
      this.isMoving = true
      
      // Get affected tiles before making the move (for animation delay)
      const affectedTiles = this.model.getAffectedTiles(row, col)
      const isLongMove = affectedTiles.length > 0
      
      // Perform the move
      this.model.moveTile(row, col)
      this.moveCount++
      this.view.updateMoveCount(this.moveCount)
      
      // Update the board with animation
      this.updateBoard()
      
      // Check if puzzle is solved
      if (this.model.isSolved()) {
        this.view.showSuccessMessage(this.moveCount)
      }
      
      // Animation timeout to prevent rapid clicks
      // Allow more time for longer moves
      const animationDuration = isLongMove ? 350 : 250
      setTimeout(() => {
        this.isMoving = false
      }, animationDuration)
    }
  }

  /**
   * Reset the game with a freshly shuffled board
   */
  private resetGame(): void {
    if (!this.model) return
    
    this.model.shuffle()
    this.moveCount = 0
    
    this.view.updateMoveCount(this.moveCount)
    this.view.clearStatusMessage()
    this.updateBoard()
  }

  /**
   * Return to welcome screen
   */
  private backToWelcome(): void {
    this.exitFullscreen()
    this.gameStarted = false
    
    // Remove resize listener when returning to welcome screen
    window.removeEventListener('resize', this.resizeHandler)
    
    this.start()
  }

  /**
   * Update the board display based on model state
   */
  private updateBoard(): void {
    if (!this.model) return
    
    this.view.updateBoard(
      this.model.getBoard(),
      (row, col) => this.handleTileClick(row, col)
    )
  }

  /**
   * Attempt to enter fullscreen mode
   */
  private enterFullscreen(): void {
    if (supportsFullscreen()) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error entering fullscreen: ${err.message}`)
      })
    }
  }

  /**
   * Exit fullscreen mode if active
   */
  private exitFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.log(`Error exiting fullscreen: ${err.message}`)
      })
    }
  }

  /**
   * Set up keyboard event handlers
   */
  private setupKeyboardHandlers(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.gameStarted && document.fullscreenElement) {
        // Just exit fullscreen, don't exit the game
        this.exitFullscreen()
      }
    })
  }
} 