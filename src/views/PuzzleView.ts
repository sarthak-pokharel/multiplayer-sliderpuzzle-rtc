import { isTouchDevice } from '../utils/helpers'
import { PeerInfo } from '../services/PeerDiscoveryService';

/**
 * Type for board click handler
 */
export type TileClickHandler = (row: number, col: number) => void

/**
 * Type for button click handlers
 */
export type ButtonClickHandler = () => void

/**
 * Type for connection code callback
 */
export type ConnectionCodeCallback = (code: string) => void

/**
 * Type for player selection callback
 */
export type PlayerSelectCallback = (playerId: string) => void

/**
 * Type for game request response callback
 */
export type GameRequestResponseCallback = (accepted: boolean, playerId: string) => void

/**
 * View class responsible for rendering the puzzle UI
 */
export class PuzzleView {
  public container: HTMLElement
  private boardElement: HTMLElement | null = null
  private movesCounter: HTMLElement | null = null
  private statusMessage: HTMLElement | null = null
  private currentDimension: number = 3
  private isTouch: boolean = false
  private tileElements: Map<number, HTMLElement> = new Map()
  private isAnimating: boolean = false
  private tileSize: number = 0 // Store tile size for animations
  private multiplayerStatus: HTMLElement | null = null
  private opponentStatus: HTMLElement | null = null
  private modalOverlay: HTMLElement | null = null

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
   * Render multiplayer welcome screen with additional buttons
   * @param singlePlayerHandler Handler for single player button
   * @param multiplayerHandler Handler for play together button
   * @param initialDimension Default puzzle dimension
   * @returns Selected dimension element for access
   */
  renderMultiplayerWelcomeScreen(
    singlePlayerHandler: ButtonClickHandler,
    multiplayerHandler: ButtonClickHandler,
    initialDimension: number = 3
  ): HTMLSelectElement {
    // Clear any existing tile references when returning to welcome screen
    this.tileElements.clear()
    
    this.container.innerHTML = `
      <div class="welcome-screen">
        <h1>Sliding Puzzle Game</h1>
        <div class="welcome-content">
          <p>Select a puzzle size and choose how you want to play!</p>
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
          <div class="button-group">
            <button id="single-player" class="game-button">Play Solo</button>
            <button id="multiplayer" class="game-button pulse-button">Play Together</button>
          </div>
        </div>
      </div>
    `

    // Set up event handlers
    const singlePlayerButton = this.container.querySelector('#single-player') as HTMLButtonElement
    const multiplayerButton = this.container.querySelector('#multiplayer') as HTMLButtonElement
    const dimensionSelect = this.container.querySelector('#dimension-select') as HTMLSelectElement
    
    // Set initial value
    dimensionSelect.value = initialDimension.toString()
    
    // Add click handlers
    singlePlayerButton.addEventListener('click', singlePlayerHandler)
    multiplayerButton.addEventListener('click', multiplayerHandler)
    
    return dimensionSelect
  }

  /**
   * Render the player selection screen
   * @param ownPeerId The user's own peer ID
   * @param backHandler Handler for back button
   * @param connectHandler Handler for manual peer connection
   */
  renderPlayerSelectionScreen(
    backHandler: ButtonClickHandler,
    connectHandler: ConnectionCodeCallback,
    ownPeerId?: string
  ): void {
    this.container.innerHTML = `
      <div class="player-selection-screen">
        <h2>Connect to Another Player</h2>
        ${ownPeerId ? `
          <div class="own-peer-id">
            <p>Your Peer ID: <span class="peer-id-value">${ownPeerId}</span></p>
          </div>
        ` : ''}
        
        <div class="manual-connect">
          <p>Connect to a peer by ID:</p>
          <div class="connect-form">
            <input type="text" id="peer-id-input" placeholder="Enter peer ID" />
            <button id="connect-button">Connect</button>
          </div>
        </div>
        
        <div class="selection-controls">
          <button id="back-button">Back</button>
        </div>
      </div>
    `;

    // Set up event handlers
    const backButton = this.container.querySelector('#back-button') as HTMLButtonElement;
    const connectButton = this.container.querySelector('#connect-button') as HTMLButtonElement;
    const peerIdInput = this.container.querySelector('#peer-id-input') as HTMLInputElement;
    
    backButton.addEventListener('click', backHandler);
    
    // Set up manual connection
    connectButton.addEventListener('click', () => {
      const peerId = peerIdInput.value.trim();
      if (peerId) {
        connectHandler(peerId);
        peerIdInput.value = '';
      } else {
        peerIdInput.classList.add('error');
        setTimeout(() => peerIdInput.classList.remove('error'), 1000);
      }
    });
    
    // Also handle Enter key
    peerIdInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        connectButton.click();
        e.preventDefault();
      }
    });
  }

  /**
   * Show waiting screen after sending game request
   * @param playerName Name of the player we're waiting for
   * @param cancelHandler Handler for cancel button
   */
  showWaitingForAcceptScreen(playerName: string, cancelHandler: ButtonClickHandler): void {
    const modal = this.createModalElement();
    
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Waiting for Player</h2>
        <p>Waiting for ${playerName} to accept your game invite...</p>
        <div class="loading-spinner"></div>
        <div class="modal-buttons">
          <button id="cancel-button">Cancel</button>
        </div>
      </div>
    `;
    
    // Set up event handlers
    const cancelButton = modal.querySelector('#cancel-button') as HTMLButtonElement;
    
    cancelButton.addEventListener('click', () => {
      this.closeModal();
      cancelHandler();
    });
  }

  /**
   * Show game request dialog
   * @param playerName Name of the player who sent the request
   * @param responseHandler Handler for accept/decline buttons
   */
  showGameRequestDialog(
    playerName: string, 
    playerId: string,
    responseHandler: GameRequestResponseCallback
  ): void {
    const modal = this.createModalElement();
    
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Game Invitation</h2>
        <p>${playerName} has invited you to play a puzzle game!</p>
        <div class="modal-buttons">
          <button id="accept-button" class="primary-button">Accept</button>
          <button id="decline-button">Decline</button>
        </div>
      </div>
    `;
    
    // Set up event handlers
    const acceptButton = modal.querySelector('#accept-button') as HTMLButtonElement;
    const declineButton = modal.querySelector('#decline-button') as HTMLButtonElement;
    
    acceptButton.addEventListener('click', () => {
      this.closeModal();
      responseHandler(true, playerId);
    });
    
    declineButton.addEventListener('click', () => {
      this.closeModal();
      responseHandler(false, playerId);
    });
  }

  /**
   * Show error message when a game request is declined
   * @param playerName Name of the player who declined
   */
  showRequestDeclinedMessage(playerName: string): void {
    const modal = this.createModalElement();
    
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Request Declined</h2>
        <p>${playerName} has declined your game invitation.</p>
        <div class="modal-buttons">
          <button id="ok-button">OK</button>
        </div>
      </div>
    `;
    
    // Set up event handlers
    const okButton = modal.querySelector('#ok-button') as HTMLButtonElement;
    
    okButton.addEventListener('click', () => {
      this.closeModal();
    });
  }

  /**
   * Show modal dialog to host a game
   * @param offerCode The offer code to share with the other player
   * @param answerCallback Callback for when the user enters the answer code
   */
  showHostGameDialog(offerCode: string, answerCallback: ConnectionCodeCallback): void {
    const modal = this.createModalElement();
    
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Host a Game</h2>
        <p>Share this code with the player you want to play with:</p>
        <div class="connection-code">
          <textarea id="offer-code" readonly>${offerCode}</textarea>
          <button id="copy-code">Copy</button>
        </div>
        <p>Once they give you their code, paste it below:</p>
        <div class="connection-code">
          <textarea id="answer-code" placeholder="Paste their answer code here"></textarea>
        </div>
        <div class="modal-buttons">
          <button id="connect-button" class="primary-button">Connect</button>
          <button id="cancel-button">Cancel</button>
        </div>
      </div>
    `;
    
    // Setup event handlers
    const copyButton = modal.querySelector('#copy-code') as HTMLButtonElement;
    const connectButton = modal.querySelector('#connect-button') as HTMLButtonElement;
    const cancelButton = modal.querySelector('#cancel-button') as HTMLButtonElement;
    const offerTextarea = modal.querySelector('#offer-code') as HTMLTextAreaElement;
    const answerTextarea = modal.querySelector('#answer-code') as HTMLTextAreaElement;
    
    copyButton.addEventListener('click', () => {
      offerTextarea.select();
      document.execCommand('copy');
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    });
    
    connectButton.addEventListener('click', () => {
      const answerCode = answerTextarea.value.trim();
      if (answerCode) {
        this.closeModal();
        answerCallback(answerCode);
      } else {
        answerTextarea.classList.add('error');
        setTimeout(() => {
          answerTextarea.classList.remove('error');
        }, 1000);
      }
    });
    
    cancelButton.addEventListener('click', () => {
      this.closeModal();
    });
  }

  /**
   * Show modal dialog to join a game
   * @param joinCallback Callback for when the user enters the offer code
   */
  showJoinGameDialog(joinCallback: ConnectionCodeCallback): void {
    const modal = this.createModalElement();
    
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Join a Game</h2>
        <p>Enter the code provided by the host:</p>
        <div class="connection-code">
          <textarea id="offer-code" placeholder="Paste their code here"></textarea>
        </div>
        <div class="modal-buttons">
          <button id="join-button" class="primary-button">Join Game</button>
          <button id="cancel-button">Cancel</button>
        </div>
      </div>
    `;
    
    // Setup event handlers
    const joinButton = modal.querySelector('#join-button') as HTMLButtonElement;
    const cancelButton = modal.querySelector('#cancel-button') as HTMLButtonElement;
    const offerTextarea = modal.querySelector('#offer-code') as HTMLTextAreaElement;
    
    joinButton.addEventListener('click', () => {
      const offerCode = offerTextarea.value.trim();
      if (offerCode) {
        this.closeModal();
        joinCallback(offerCode);
      } else {
        offerTextarea.classList.add('error');
        setTimeout(() => {
          offerTextarea.classList.remove('error');
        }, 1000);
      }
    });
    
    cancelButton.addEventListener('click', () => {
      this.closeModal();
    });
  }

  /**
   * Show modal dialog with answer code for joining player
   * @param answerCode The answer code to share with the host
   */
  showJoinResponseDialog(answerCode: string): void {
    const modal = this.createModalElement();
    
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Almost there!</h2>
        <p>Send this code back to the host:</p>
        <div class="connection-code">
          <textarea id="answer-code" readonly>${answerCode}</textarea>
          <button id="copy-code">Copy</button>
        </div>
        <p>Once the host connects with your code, the game will start automatically.</p>
        <div class="modal-buttons">
          <button id="ok-button" class="primary-button">OK</button>
        </div>
      </div>
    `;
    
    // Setup event handlers
    const copyButton = modal.querySelector('#copy-code') as HTMLButtonElement;
    const okButton = modal.querySelector('#ok-button') as HTMLButtonElement;
    const answerTextarea = modal.querySelector('#answer-code') as HTMLTextAreaElement;
    
    copyButton.addEventListener('click', () => {
      answerTextarea.select();
      document.execCommand('copy');
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    });
    
    okButton.addEventListener('click', () => {
      this.closeModal();
    });
  }

  /**
   * Create a modal overlay element
   */
  private createModalElement(): HTMLElement {
    // Close any existing modals
    this.closeModal();
    
    // Create a new modal
    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'modal-overlay';
    
    // Append to document body instead of container to ensure proper z-index handling
    document.body.appendChild(this.modalOverlay);
    
    return this.modalOverlay;
  }

  /**
   * Close any open modal
   */
  public closeModal(): void {
    // Remove any modal overlay
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => overlay.remove());
    
    // Remove any error modals
    const errorModals = document.querySelectorAll('.error-modal');
    errorModals.forEach(modal => modal.remove());
    
    // Clear modal reference
    this.modalOverlay = null;
  }

  /**
   * Show a loading message
   * @param message The message to display
   */
  public showLoadingMessage(message: string): void {
    // Remove any existing loading message first
    this.hideLoadingMessage();
    
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-message';
    loadingElement.innerHTML = `
      <div class="loading-spinner"></div>
      <p>${message}</p>
    `;
    
    // Append to document body to ensure it's visible above all content
    document.body.appendChild(loadingElement);
  }

  /**
   * Hide the loading message
   */
  public hideLoadingMessage(): void {
    // Look for loading messages in both the container and document body
    const loadingElements = document.querySelectorAll('.loading-message');
    loadingElements.forEach(el => el.remove());
  }

  /**
   * Show an error message
   * @param message The error message to display
   */
  public showError(message: string): void {
    // Close any existing modals first
    this.closeModal();
    
    const errorModal = document.createElement('div');
    errorModal.className = 'modal-overlay error-modal';
    errorModal.innerHTML = `
      <div class="modal-content">
        <h3>Error</h3>
        <p>${message}</p>
        <button class="modal-button">OK</button>
      </div>
    `;
    
    // Add click handler to close
    const button = errorModal.querySelector('.modal-button');
    if (button) {
      button.addEventListener('click', () => this.closeModal());
    }
    
    // Append to document body to ensure it's visible above all content
    document.body.appendChild(errorModal);
  }

  /**
   * Show connection status in the game
   * @param isConnected Whether connected to the global network
   * @param isHost Optional parameter specifying if the player is the host (not needed in new implementation)
   */
  public showConnectionStatus(isConnected: boolean, isHost?: boolean): void {
    // Remove any existing status
    const existingStatus = document.querySelector('.connection-status');
    if (existingStatus) {
      existingStatus.remove();
    }
    
    // Create status element
    const statusElement = document.createElement('div');
    statusElement.className = 'connection-status';
    
    if (isConnected) {
      statusElement.textContent = isHost ? '🌐 Host' : '🌐 Connected';
      statusElement.classList.add('connected');
    } else {
      statusElement.textContent = '🔄 Connecting...';
      statusElement.classList.add('connecting');
    }
    
    // Add to document
    document.body.appendChild(statusElement);
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
   * Render the multiplayer game UI
   * @param dimension Puzzle dimension
   * @param shuffleHandler Handler for shuffle button click
   * @param backHandler Handler for back button click
   * @param playerName Current player's name
   * @param opponentName Opponent's name
   */
  renderMultiplayerGameUI(
    dimension: number, 
    shuffleHandler: ButtonClickHandler, 
    backHandler: ButtonClickHandler,
    playerName: string = 'You',
    opponentName: string = 'Opponent'
  ): void {
    this.currentDimension = dimension
    
    // Update container with game UI
    this.container.innerHTML = `
      <div class="puzzle-container fullscreen">
        <div class="game-header">
          <h2>Sliding Puzzle ${dimension}×${dimension} - Play Together</h2>
          <div class="game-stats">
            <div id="moves-counter" aria-live="polite">Moves: 0</div>
            <div id="status-message" aria-live="assertive"></div>
          </div>
          <div class="multiplayer-status">
            <div id="connection-status">Connected</div>
            <div id="opponent-status"></div>
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
    this.multiplayerStatus = this.container.querySelector('#connection-status')
    this.opponentStatus = this.container.querySelector('#opponent-status')

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
   * Show a success message when the puzzle is solved
   */
  showSuccessMessage(moves: number): void {
    if (this.statusMessage) {
      this.statusMessage.textContent = `Puzzle solved in ${moves} moves! 🎉`
      this.statusMessage.classList.add('success')
    }
  }

  /**
   * Clear the status message
   */
  clearStatusMessage(): void {
    if (this.statusMessage) {
      this.statusMessage.textContent = ''
      this.statusMessage.classList.remove('success')
    }
  }

  /**
   * Show message when the opponent has won
   * @param playerName Name of the player who won
   */
  showOpponentWon(playerName: string): void {
    if (this.opponentStatus) {
      this.opponentStatus.textContent = `${playerName} solved the puzzle first! 🏆`;
      this.opponentStatus.classList.add('opponent-won');
    }
  }

  /**
   * Clear the opponent won message
   */
  clearOpponentWon(): void {
    if (this.opponentStatus) {
      this.opponentStatus.textContent = '';
      this.opponentStatus.classList.remove('opponent-won');
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

  /**
   * Show a temporary message that disappears after a timeout
   * @param message The message to display
   * @param duration Time in milliseconds to show the message
   */
  public showTemporaryMessage(message: string, duration: number = 3000): void {
    const messageElement = document.createElement('div');
    messageElement.className = 'temporary-message';
    messageElement.textContent = message;
    
    this.container.appendChild(messageElement);
    
    // Remove after duration
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, duration);
  }
} 