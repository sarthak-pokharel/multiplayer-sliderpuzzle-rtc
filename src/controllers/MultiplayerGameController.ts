import { GameController } from './GameController';
import { PeerService } from '../services/PeerService';
import { PuzzleView } from '../views/PuzzleView';
import { PuzzleModel } from '../models/PuzzleModel';

/**
 * Controller class that handles multiplayer game logic
 */
export class MultiplayerGameController extends GameController {
  private peerService: PeerService;
  private multiplayerView: PuzzleView;
  private isMultiplayerActive: boolean = false;
  private receivedMove: boolean = false;
  private opponentSolved: boolean = false;
  private waitingForPeerId: string | null = null;
  private isInitialized: boolean = false;
  private pendingCallbacks: (() => void)[] = [];
  private isHost: boolean = false;

  /**
   * Create a multiplayer game controller
   * @param container HTML element to render the game into
   */
  constructor(container: HTMLElement) {
    super(container);
    
    // Create the peer service
    this.peerService = new PeerService();
    
    // Store the view reference for multiplayer UI updates
    this.multiplayerView = this.getView();
    
    // Initialize multiplayer
    this.initializeMultiplayer();
  }

  /**
   * Initialize the multiplayer functionality
   */
  private async initializeMultiplayer(): Promise<void> {
    try {
      console.log("Starting multiplayer initialization...");
      this.multiplayerView.showLoadingMessage("Initializing peer-to-peer connections...");
      this.multiplayerView.showConnectionStatus(false);
      
      // Wait for PeerJS to initialize
      console.log("Waiting for PeerJS initialization...");
      await this.peerService.waitForInit();
      console.log("PeerJS initialized successfully");
      
      // Set up multiplayer event handlers
      this.setupMultiplayerCallbacks();
      
      this.isInitialized = true;
      
      // Run any pending callbacks
      console.log("Running pending callbacks:", this.pendingCallbacks.length);
      this.pendingCallbacks.forEach(callback => callback());
      this.pendingCallbacks = [];
      
      this.multiplayerView.hideLoadingMessage();
      this.multiplayerView.showConnectionStatus(true);
      console.log("Multiplayer initialization complete");
    } catch (error) {
      console.error("Failed to initialize multiplayer:", error);
      this.multiplayerView.showError("Failed to initialize peer-to-peer connections. Please try again.");
    }
  }

  /**
   * Run a callback when multiplayer is initialized
   */
  private whenInitialized(callback: () => void): void {
    if (this.isInitialized) {
      callback();
    } else {
      this.pendingCallbacks.push(callback);
    }
  }

  /**
   * Set up callbacks for multiplayer events
   */
  private setupMultiplayerCallbacks(): void {
    // Handle game requests
    this.peerService.onGameRequest((request) => {
      this.handleGameRequest(request);
    });
    
    // Handle game accepted
    this.peerService.onGameAccepted((peerId) => {
      this.handleGameAccepted(peerId);
    });
    
    // Handle game declined
    this.peerService.onGameDeclined((peerId) => {
      if (this.waitingForPeerId === peerId) {
        this.waitingForPeerId = null;
        this.multiplayerView.closeModal();
        this.multiplayerView.showRequestDeclinedMessage('Player');
      }
    });
    
    // Handle game start
    this.peerService.onGameStart((dimension, board) => {
      this.handleReceivedGameStart(dimension, board);
    });

    // Handle move received
    this.peerService.onMoveMade((row, col) => {
      this.handleReceivedMove(row, col);
    });

    // Handle game won notification
    this.peerService.onGameWon((playerName) => {
      this.handleOpponentWon(playerName);
    });

    // Handle reset game
    this.peerService.onResetGame(() => {
      this.handleReceivedReset();
    });

    // Handle connection status changes
    this.peerService.onConnectionStatus((isConnected, isHost) => {
      this.handleConnectionStatus(isConnected, isHost);
    });

    // Handle errors
    this.peerService.onError((error) => {
      this.multiplayerView.showError(error);
    });
  }

  /**
   * Handle receiving a game request
   */
  private handleGameRequest(request: { from: string, name: string }): void {
    this.multiplayerView.showGameRequestDialog(
      request.name,
      request.from,
      (accepted, playerId) => this.handleGameRequestResponse(accepted, playerId)
    );
  }

  /**
   * Handle the response to a game request
   */
  private handleGameRequestResponse(accepted: boolean, playerId: string): void {
    // Ensure the modal is closed immediately
    this.multiplayerView.closeModal();
    
    if (accepted) {
      // Accept the game request
      this.peerService.acceptGameRequest(playerId);
      this.isHost = false;
    } else {
      // Decline the game request
      this.peerService.declineGameRequest(playerId);
    }
  }

  /**
   * Handle when a game request is accepted
   */
  private handleGameAccepted(peerId: string): void {
    console.log("Game request accepted by:", peerId);
    
    // Clear the waiting state
    this.waitingForPeerId = null;
    
    // Close any open modal or loading message
    this.multiplayerView.closeModal();
    this.multiplayerView.hideLoadingMessage();
  }

  /**
   * Start the game with multiplayer welcome screen
   */
  override start(): void {
    // Reset multiplayer state
    this.isMultiplayerActive = false;
    this.receivedMove = false;
    this.opponentSolved = false;
    this.waitingForPeerId = null;
    
    // Render the welcome screen immediately
    const dimensionSelect = this.multiplayerView.renderMultiplayerWelcomeScreen(
      () => this.startSinglePlayerGame(),
      () => this.whenInitialized(() => this.showConnectionScreen()),
      3
    );
    
    // Set up keyboard handler for fullscreen escape
    this.setupKeyboardHandlers();
  }

  /**
   * Show the connection screen
   */
  private showConnectionScreen(): void {
    // Render the connection screen
    this.multiplayerView.renderPlayerSelectionScreen(
      () => this.backToWelcome(),
      (peerId) => this.connectToPeer(peerId),
      this.peerService.getSelfId()
    );
  }

  /**
   * Connect to a peer by ID
   */
  private connectToPeer(peerId: string): void {
    console.log("Attempting to connect to peer:", peerId);
    this.multiplayerView.showLoadingMessage(`Connecting to peer ${peerId}...`);
    
    try {
      // Try to connect to the peer
      const conn = this.peerService.connectToPeer(peerId);
      
      if (conn) {
        // Store the peer ID we're connecting to
        this.waitingForPeerId = peerId;
        
        // Send a game request to the peer
        this.peerService.requestGame(peerId);
        
        // Show waiting dialog
        setTimeout(() => {
          this.multiplayerView.hideLoadingMessage();
          this.multiplayerView.showWaitingForAcceptScreen(
            "other player",
            () => this.cancelWaitingForAccept()
          );
        }, 1000);
      } else {
        this.multiplayerView.hideLoadingMessage();
        this.multiplayerView.showError(`Failed to connect to peer ${peerId}. Please check the ID and try again.`);
      }
    } catch (error: any) {
      console.error("Error connecting to peer:", error);
      this.multiplayerView.hideLoadingMessage();
      this.multiplayerView.showError(`Error connecting to peer: ${error.message || "Unknown error"}`);
    }
  }

  /**
   * Cancel waiting for a player to accept
   */
  private cancelWaitingForAccept(): void {
    if (this.waitingForPeerId) {
      this.waitingForPeerId = null;
      this.showConnectionScreen();
    }
  }

  /**
   * Override to handle multiplayer-specific logic before starting the game
   */
  protected override startGame(): void {
    if (this.isMultiplayerActive && this.isHost) {
      this.startMultiplayerGameAsHost();
    } else {
      super.startGame();
    }
  }

  /**
   * Start a single player game
   */
  private startSinglePlayerGame(): void {
    this.isMultiplayerActive = false;
    this.startGame();
  }

  /**
   * Start multiplayer game as the host
   */
  private startMultiplayerGameAsHost(): void {
    // Prepare UI for game start
    this.prepareGameUI();
    
    const dimension = this.getDimensionSelect() ? 
      parseInt(this.getDimensionSelect()!.value) : 3;
    
    // Create a new puzzle model with the selected dimension
    this.setModel(new PuzzleModel(dimension));
    this.resetMoveCount();
    
    // Enter fullscreen and render game UI with multiplayer indicators
    this.enterFullscreen();
    this.multiplayerView.renderMultiplayerGameUI(
      dimension,
      () => this.resetGame(),
      () => this.backToWelcome(),
      this.peerService.getPlayerName(),
      'Opponent'
    );
    
    // Setup window resize handler
    this.setupResizeHandler();
    
    // Update and render the board
    this.updateBoard();
    
    // Shuffle the puzzle to start
    this.resetGame();
    
    // Send the game start info to the peer
    this.peerService.startGame(
      dimension,
      this.getModel()!.getBoard()
    );
  }

  /**
   * Handle game start info received from host
   */
  private handleReceivedGameStart(dimension: number, board: number[][]): void {
    // Prepare UI for game start
    this.prepareGameUI();
    
    // Create a new puzzle model with the received board
    const model = new PuzzleModel(dimension);
    
    // Override the board with the one from the host
    // This is a hack - should add a proper method to PuzzleModel
    const modelAny = model as any;
    modelAny.board = board;
    modelAny.emptyPosition = this.findEmptyPosition(board);
    
    this.setModel(model);
    this.resetMoveCount();
    
    // Enter fullscreen and render game UI
    this.enterFullscreen();
    this.multiplayerView.renderMultiplayerGameUI(
      dimension,
      () => this.resetGame(),
      () => this.backToWelcome(),
      this.peerService.getPlayerName(),
      'Opponent'
    );
    
    // Setup window resize handler
    this.setupResizeHandler();
    
    // Update and render the board
    this.updateBoard();
  }

  /**
   * Find the empty position in a board
   */
  private findEmptyPosition(board: number[][]): { row: number; col: number } {
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[0].length; col++) {
        if (board[row][col] === 0) {
          return { row, col };
        }
      }
    }
    
    // Default to bottom right if not found
    return { row: board.length - 1, col: board[0].length - 1 };
  }

  /**
   * Override to handle multiplayer logic for tile clicks
   */
  protected override handleTileClick(row: number, col: number): void {
    if (this.isMultiplayerActive && this.receivedMove) {
      // Ignore clicks if we're processing a received move
      this.receivedMove = false;
      return;
    }
    
    // Call the parent method to handle the actual move
    super.handleTileClick(row, col);
    
    // If in multiplayer mode, send the move to the peer
    if (this.isMultiplayerActive && this.getModel()?.canMoveTile(row, col)) {
      this.peerService.sendMove(row, col);
      
      // Check if the puzzle is solved after this move
      if (this.getModel()?.isSolved()) {
        this.peerService.sendGameWon();
      }
    }
  }

  /**
   * Handle a move received from peer
   */
  private handleReceivedMove(row: number, col: number): void {
    if (!this.isMultiplayerActive || !this.getModel()) return;
    
    // Set flag to prevent sending the move back
    this.receivedMove = true;
    
    // Call the parent method to handle the move
    this.handleTileClick(row, col);
  }

  /**
   * Override to handle multiplayer logic for reset
   */
  protected override resetGame(): void {
    super.resetGame();
    
    // If in multiplayer mode and we're the host, send the reset to the peer
    if (this.isMultiplayerActive && this.isHost) {
      this.peerService.sendResetGame();
      this.peerService.startGame(
        this.getModel()!.getDimension(),
        this.getModel()!.getBoard()
      );
    }
    
    // Reset the opponent solved flag
    this.opponentSolved = false;
    this.multiplayerView.clearOpponentWon();
  }

  /**
   * Handle reset received from host
   */
  private handleReceivedReset(): void {
    // Host will send a new game start message with the board
    this.opponentSolved = false;
    this.multiplayerView.clearOpponentWon();
  }

  /**
   * Override to handle multiplayer cleanup when returning to welcome screen
   */
  protected override backToWelcome(): void {
    // Close the multiplayer connection
    if (this.isMultiplayerActive) {
      this.peerService.close();
      this.isMultiplayerActive = false;
    }
    
    super.backToWelcome();
  }

  /**
   * Handle the opponent winning
   */
  private handleOpponentWon(playerName: string): void {
    this.opponentSolved = true;
    this.multiplayerView.showOpponentWon(playerName);
  }

  /**
   * Handle connection status changes
   */
  private handleConnectionStatus(isConnected: boolean, isHost: boolean): void {
    if (isConnected) {
      this.isMultiplayerActive = true;
      this.isHost = isHost;
      this.waitingForPeerId = null;
      
      // Prepare UI for game
      this.prepareGameUI();
      
      // Update connection status
      this.multiplayerView.showConnectionStatus(true, isHost);
      
      // If we're the host, start the game
      if (isHost) {
        this.startGame();
      }
    } else {
      this.isMultiplayerActive = false;
      this.multiplayerView.showConnectionStatus(false);
      
      // Return to welcome screen if disconnected during game
      if (this.isGameStarted()) {
        this.backToWelcome();
      }
    }
  }

  /**
   * Update game state and UI to prepare for game start
   */
  private prepareGameUI(): void {
    // Ensure all UI overlays are cleared
    this.multiplayerView.closeModal();
    this.multiplayerView.hideLoadingMessage();
    
    // Clear temporary messages
    const tempMessages = document.querySelectorAll('.temporary-message');
    tempMessages.forEach(msg => msg.remove());
  }
} 