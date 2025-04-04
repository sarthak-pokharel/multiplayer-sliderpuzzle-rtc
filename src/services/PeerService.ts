/**
 * Interface for peer info
 */
export interface PeerInfo {
  id: string;
  name: string;
  lastSeen: number;
}

/**
 * Service for managing peer-to-peer connections using PeerJS
 */
export class PeerService {
  private peer: any; // PeerJS instance
  private connections: Map<string, any> = new Map(); // PeerJS connections
  private selfId: string = '';
  private playerName: string;
  private debugMode: boolean = true;
  private initialized: boolean = false;
  private pendingInitCallbacks: (() => void)[] = [];
  private isConnectedToPeer: boolean = false;
  
  // Callback functions
  private onGameRequestCallback: ((request: { from: string, name: string }) => void) | null = null;
  private onGameAcceptedCallback: ((from: string) => void) | null = null;
  private onGameDeclinedCallback: ((from: string) => void) | null = null;
  private onGameStartCallback: ((dimension: number, board: number[][]) => void) | null = null;
  private onMoveMadeCallback: ((row: number, col: number) => void) | null = null;
  private onGameWonCallback: ((playerName: string, moves: number, timeSeconds: number) => void) | null = null;
  private onResetGameCallback: (() => void) | null = null;
  private onConnectionStatusCallback: ((isConnected: boolean, isHost: boolean) => void) | null = null;
  private onErrorCallback: ((message: string) => void) | null = null;
  
  /**
   * Create a new peer service
   */
  constructor() {
    this.playerName = 'Player ' + Math.floor(Math.random() * 1000);
    this.initialize();
  }
  
  /**
   * Initialize PeerJS
   */
  private initialize(): void {
    if (!window.Peer) {
      this.log("PeerJS not loaded, waiting...");
      setTimeout(() => this.initialize(), 1000);
      return;
    }
    
    this.log("Initializing PeerJS...");
    
    try {
      // Create a new peer with random ID
      this.peer = new window.Peer({
        debug: this.debugMode ? 2 : 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });
      
      // Handle peer events
      this.setupPeerEvents();
      
    } catch (error) {
      console.error("Error initializing PeerJS:", error);
      setTimeout(() => this.initialize(), 3000);
    }
  }
  
  /**
   * Set up peer events
   */
  private setupPeerEvents(): void {
    // Connection opened with server
    this.peer.on('open', (id: string) => {
      this.selfId = id;
      this.log("Connected to PeerJS server with ID:", id);
      
      // Mark as initialized and run callbacks
      this.initialized = true;
      this.pendingInitCallbacks.forEach(callback => callback());
      this.pendingInitCallbacks = [];
    });
    
    // Incoming connection
    this.peer.on('connection', (conn: any) => {
      this.handleIncomingConnection(conn);
    });
    
    // Error handling
    this.peer.on('error', (err: any) => {
      console.error("PeerJS error:", err);
      
      if (err.type === 'network' || err.type === 'disconnected') {
        this.log("Network error, reconnecting in 5 seconds...");
        setTimeout(() => this.reconnect(), 5000);
      }
    });
    
    // Handle disconnection
    this.peer.on('disconnected', () => {
      this.log("Disconnected from PeerJS server, attempting to reconnect...");
      this.peer.reconnect();
    });
  }
  
  /**
   * Wait for initialization to complete
   */
  public async waitForInit(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.initialized) {
        resolve();
      } else {
        this.pendingInitCallbacks.push(resolve);
      }
    });
  }
  
  /**
   * Reconnect to PeerJS server
   */
  private reconnect(): void {
    if (this.peer) {
      this.peer.destroy();
    }
    
    this.initialize();
  }
  
  /**
   * Handle an incoming connection
   */
  private handleIncomingConnection(conn: any): void {
    this.log("Incoming connection from:", conn.peer);
    
    // Store the connection
    this.connections.set(conn.peer, conn);
    
    // Set up connection events
    this.setupConnectionEvents(conn);
  }
  
  /**
   * Connect to a peer
   */
  public connectToPeer(peerId: string): any {
    // Don't connect to ourselves
    if (peerId === this.selfId) {
      return null;
    }
    
    // Check if we're already connected
    if (this.connections.has(peerId) && this.connections.get(peerId).open) {
      return this.connections.get(peerId);
    }
    
    try {
      this.log("Connecting to peer:", peerId);
      
      // Connect to the peer
      const conn = this.peer.connect(peerId, {
        reliable: true,
        metadata: {
          name: this.playerName
        }
      });
      
      if (!conn) {
        console.error("Failed to create connection to peer:", peerId);
        return null;
      }
      
      // Set up connection events
      this.setupConnectionEvents(conn);
      
      // Store the connection
      this.connections.set(peerId, conn);
      
      return conn;
    } catch (error) {
      console.error("Error connecting to peer:", error);
      return null;
    }
  }
  
  /**
   * Set up connection events
   */
  private setupConnectionEvents(conn: any): void {
    // Connection opened
    conn.on('open', () => {
      this.log("Connection opened to:", conn.peer);
      
      this.isConnectedToPeer = true;
      
      // Send our presence
      conn.send({
        type: 'presence',
        peerId: this.selfId,
        name: this.playerName,
        lastSeen: Date.now()
      });
      
      // Debug info
      this.updateDebugInfo();
    });
    
    // Data received
    conn.on('data', (data: any) => {
      this.handleData(data, conn.peer);
    });
    
    // Connection closed
    conn.on('close', () => {
      this.log("Connection closed:", conn.peer);
      this.connections.delete(conn.peer);
      
      if (this.connections.size === 0) {
        this.isConnectedToPeer = false;
        this.onConnectionStatusCallback?.(false, false);
      }
      
      // Debug info
      this.updateDebugInfo();
    });
    
    // Connection error
    conn.on('error', (err: any) => {
      console.error("Connection error:", err);
      this.connections.delete(conn.peer);
      
      if (this.connections.size === 0) {
        this.isConnectedToPeer = false;
        this.onConnectionStatusCallback?.(false, false);
      }
    });
  }
  
  /**
   * Handle data received from a peer
   */
  private handleData(data: any, peerId: string): void {
    if (!data || !data.type) return;
    
    switch (data.type) {
      case 'presence':
        // Just log the presence
        this.log(`Received presence from ${data.name} (${data.peerId})`);
        break;
        
      case 'game-request':
        // Game request
        this.onGameRequestCallback?.({
          from: peerId,
          name: data.name || 'Unknown Player'
        });
        break;
        
      case 'game-accept':
        // Game accepted - update connection status first
        this.onConnectionStatusCallback?.(true, true);
        // Then notify about acceptance
        this.onGameAcceptedCallback?.(peerId);
        break;
        
      case 'game-decline':
        // Game declined
        this.onGameDeclinedCallback?.(peerId);
        break;
        
      case 'game-start':
        // Game started
        this.onGameStartCallback?.(data.dimension, data.board);
        break;
        
      case 'move-made':
        // Move made
        this.onMoveMadeCallback?.(data.row, data.col);
        break;
        
      case 'game-won':
        // Game won
        this.onGameWonCallback?.(data.playerName, data.moves, data.timeSeconds);
        break;
        
      case 'reset-game':
        // Reset game
        this.onResetGameCallback?.();
        break;
    }
  }
  
  /**
   * Send data to a specific peer
   */
  private sendToPeer(peerId: string, data: any): void {
    // Get existing connection or create new one
    let conn = this.connections.get(peerId);
    
    if (!conn || !conn.open) {
      conn = this.connectToPeer(peerId);
      
      if (!conn) {
        console.error("Failed to connect to peer:", peerId);
        return;
      }
      
      // If connection is not yet open, wait for it
      if (!conn.open) {
        conn.on('open', () => {
          conn.send(data);
        });
        return;
      }
    }
    
    // Send the data
    if (conn.open) {
      conn.send(data);
    }
  }
  
  /**
   * Request a game with a peer
   */
  public requestGame(peerId: string): void {
    this.sendToPeer(peerId, {
      type: 'game-request',
      from: this.selfId,
      name: this.playerName
    });
  }
  
  /**
   * Accept a game request
   */
  public acceptGameRequest(peerId: string): void {
    // First notify about connection status change
    this.onConnectionStatusCallback?.(true, false);
    
    // Then send the acceptance message
    this.sendToPeer(peerId, {
      type: 'game-accept',
      from: this.selfId
    });
  }
  
  /**
   * Decline a game request
   */
  public declineGameRequest(peerId: string): void {
    this.sendToPeer(peerId, {
      type: 'game-decline',
      from: this.selfId
    });
  }
  
  /**
   * Start a game with the specified board
   */
  public startGame(dimension: number, board: number[][]): void {
    // Send to all open connections
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send({
          type: 'game-start',
          dimension,
          board
        });
      }
    });
  }
  
  /**
   * Send a move
   */
  public sendMove(row: number, col: number): void {
    // Send to all open connections
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send({
          type: 'move-made',
          row,
          col
        });
      }
    });
  }
  
  /**
   * Send game won notification
   * @param moves Number of moves taken to solve the puzzle
   * @param timeSeconds Time in seconds taken to solve the puzzle
   */
  public sendGameWon(moves: number, timeSeconds: number): void {
    // Send to all open connections
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send({
          type: 'game-won',
          playerName: this.playerName,
          moves: moves,
          timeSeconds: timeSeconds
        });
      }
    });
  }
  
  /**
   * Send reset game notification
   */
  public sendResetGame(): void {
    // Send to all open connections
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send({
          type: 'reset-game'
        });
      }
    });
  }
  
  /**
   * Close all connections
   */
  public close(): void {
    // Close all connections
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.close();
      }
    });
    
    // Clear connections
    this.connections.clear();
    
    // Reset state
    this.isConnectedToPeer = false;
    this.onConnectionStatusCallback?.(false, false);
  }
  
  /**
   * Log with debug mode
   */
  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log("[PeerService]", ...args);
    }
  }
  
  /**
   * Get player name
   */
  public getPlayerName(): string {
    return this.playerName;
  }
  
  /**
   * Set player name
   */
  public setPlayerName(name: string): void {
    this.playerName = name;
  }
  
  /**
   * Get self ID
   */
  public getSelfId(): string {
    return this.selfId;
  }
  
  /**
   * Set callback for game requests
   */
  public onGameRequest(callback: (request: { from: string, name: string }) => void): void {
    this.onGameRequestCallback = callback;
  }
  
  /**
   * Set callback for when a game is accepted
   */
  public onGameAccepted(callback: (from: string) => void): void {
    this.onGameAcceptedCallback = callback;
  }
  
  /**
   * Set callback for when a game is declined
   */
  public onGameDeclined(callback: (from: string) => void): void {
    this.onGameDeclinedCallback = callback;
  }
  
  /**
   * Set callback for when a game starts
   */
  public onGameStart(callback: (dimension: number, board: number[][]) => void): void {
    this.onGameStartCallback = callback;
  }
  
  /**
   * Set callback for when a move is made
   */
  public onMoveMade(callback: (row: number, col: number) => void): void {
    this.onMoveMadeCallback = callback;
  }
  
  /**
   * Set callback for when a player wins
   */
  public onGameWon(callback: (playerName: string, moves: number, timeSeconds: number) => void): void {
    this.onGameWonCallback = callback;
  }
  
  /**
   * Set callback for when the game is reset
   */
  public onResetGame(callback: () => void): void {
    this.onResetGameCallback = callback;
  }
  
  /**
   * Set callback for connection status changes
   */
  public onConnectionStatus(callback: (isConnected: boolean, isHost: boolean) => void): void {
    this.onConnectionStatusCallback = callback;
  }
  
  /**
   * Set callback for errors
   */
  public onError(callback: (message: string) => void): void {
    this.onErrorCallback = callback;
  }
  
  /**
   * Update our debug/connection info to help with troubleshooting
   */
  private updateDebugInfo(): void {
    this.log("--------- Debug Info ---------");
    this.log("Self ID:", this.selfId);
    this.log("Connections:", this.connections.size, Array.from(this.connections.keys()));
    this.log("-----------------------------");
  }
}

// Add PeerJS type to window
declare global {
  interface Window {
    Peer: any;
  }
} 