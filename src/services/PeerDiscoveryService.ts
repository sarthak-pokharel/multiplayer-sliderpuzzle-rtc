/**
 * Types of discovery messages
 */
export enum DiscoveryMessageType {
  ANNOUNCE = 'announce',         // Announce presence
  LEAVE = 'leave',               // Leave the network
  REQUEST_GAME = 'requestGame',  // Request to play a game
  ACCEPT_GAME = 'acceptGame',    // Accept a game request
  DECLINE_GAME = 'declineGame',  // Decline a game request
  OFFER = 'offer',               // WebRTC offer
  ANSWER = 'answer'              // WebRTC answer
}

/**
 * Interface for discovery messages
 */
export interface DiscoveryMessage {
  type: DiscoveryMessageType;
  from: string;
  to?: string;
  data?: any;
}

/**
 * Interface for peer info
 */
export interface PeerInfo {
  id: string;
  name: string;
  lastSeen: number;
}

/**
 * Service to discover other players without a backend using BroadcastChannel
 */
export class PeerDiscoveryService {
  private channel: BroadcastChannel;
  private peers: Map<string, PeerInfo> = new Map();
  private selfId: string;
  private playerName: string;
  private onPeersChangedCallback: ((peers: PeerInfo[]) => void) | null = null;
  private onGameRequestCallback: ((request: { from: string, name: string }) => void) | null = null;
  private onGameAcceptedCallback: ((data: { from: string, offer?: string }) => void) | null = null;
  private onGameDeclinedCallback: ((from: string) => void) | null = null;
  private onOfferCallback: ((offer: string, from: string) => void) | null = null;
  private onAnswerCallback: ((answer: string, from: string) => void) | null = null;
  private heartbeatInterval: number | null = null;
  private cleanupInterval: number | null = null;

  /**
   * Create a new peer discovery service
   */
  constructor() {
    // Create a unique ID for this peer
    this.selfId = this.generateId();
    this.playerName = 'Player ' + Math.floor(Math.random() * 1000);
    
    // Create broadcast channel for peer discovery
    this.channel = new BroadcastChannel('puzzle-game-discovery');
    
    // Set up message handler
    this.channel.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    
    // Set up intervals for heartbeat and cleanup
    this.startHeartbeat();
    this.startCleanup();
    
    // Announce presence
    this.announce();
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Start sending heartbeat messages
   */
  private startHeartbeat(): void {
    // Clear any existing interval
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Announce presence immediately
    this.announce();
    
    // Set up interval to announce presence periodically
    this.heartbeatInterval = setInterval(() => {
      this.announce();
    }, 5000) as unknown as number;
  }

  /**
   * Start cleanup of inactive peers
   */
  private startCleanup(): void {
    // Clear any existing interval
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
    }
    
    // Set up interval to clean up inactive peers
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      
      // Remove peers that haven't been seen in 15 seconds
      for (const [id, peer] of this.peers.entries()) {
        if (now - peer.lastSeen > 15000) {
          this.peers.delete(id);
          changed = true;
        }
      }
      
      // Notify if peers changed
      if (changed) {
        this.notifyPeersChanged();
      }
    }, 5000) as unknown as number;
  }

  /**
   * Announce presence to other peers
   */
  private announce(): void {
    this.channel.postMessage({
      type: DiscoveryMessageType.ANNOUNCE,
      from: this.selfId,
      data: {
        name: this.playerName
      }
    });
  }

  /**
   * Handle incoming discovery messages
   */
  private handleMessage(message: DiscoveryMessage): void {
    // Ignore messages from self
    if (message.from === this.selfId) return;
    
    // Handle different message types
    switch (message.type) {
      case DiscoveryMessageType.ANNOUNCE:
        this.handleAnnounce(message);
        break;
        
      case DiscoveryMessageType.LEAVE:
        this.handleLeave(message);
        break;
        
      case DiscoveryMessageType.REQUEST_GAME:
        this.handleGameRequest(message);
        break;
        
      case DiscoveryMessageType.ACCEPT_GAME:
        this.handleGameAccepted(message);
        break;
        
      case DiscoveryMessageType.DECLINE_GAME:
        this.handleGameDeclined(message);
        break;
        
      case DiscoveryMessageType.OFFER:
        this.handleOffer(message);
        break;
        
      case DiscoveryMessageType.ANSWER:
        this.handleAnswer(message);
        break;
    }
  }

  /**
   * Handle announce message
   */
  private handleAnnounce(message: DiscoveryMessage): void {
    // Add or update peer
    this.peers.set(message.from, {
      id: message.from,
      name: message.data.name,
      lastSeen: Date.now()
    });
    
    // Notify peers changed
    this.notifyPeersChanged();
  }

  /**
   * Handle leave message
   */
  private handleLeave(message: DiscoveryMessage): void {
    // Remove peer
    if (this.peers.delete(message.from)) {
      this.notifyPeersChanged();
    }
  }

  /**
   * Handle game request message
   */
  private handleGameRequest(message: DiscoveryMessage): void {
    // If the message is addressed to this peer
    if (message.to === this.selfId) {
      const peer = this.peers.get(message.from);
      if (peer) {
        this.onGameRequestCallback?.({
          from: message.from,
          name: peer.name
        });
      }
    }
  }

  /**
   * Handle game accepted message
   */
  private handleGameAccepted(message: DiscoveryMessage): void {
    // If the message is addressed to this peer
    if (message.to === this.selfId) {
      this.onGameAcceptedCallback?.({
        from: message.from,
        offer: message.data?.offer
      });
    }
  }

  /**
   * Handle game declined message
   */
  private handleGameDeclined(message: DiscoveryMessage): void {
    // If the message is addressed to this peer
    if (message.to === this.selfId) {
      this.onGameDeclinedCallback?.(message.from);
    }
  }

  /**
   * Handle WebRTC offer message
   */
  private handleOffer(message: DiscoveryMessage): void {
    // If the message is addressed to this peer
    if (message.to === this.selfId) {
      this.onOfferCallback?.(message.data.offer, message.from);
    }
  }

  /**
   * Handle WebRTC answer message
   */
  private handleAnswer(message: DiscoveryMessage): void {
    // If the message is addressed to this peer
    if (message.to === this.selfId) {
      this.onAnswerCallback?.(message.data.answer, message.from);
    }
  }

  /**
   * Notify that the list of peers has changed
   */
  private notifyPeersChanged(): void {
    const peerList = Array.from(this.peers.values());
    this.onPeersChangedCallback?.(peerList);
  }

  /**
   * Get the list of peers
   */
  getPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get this peer's ID
   */
  getSelfId(): string {
    return this.selfId;
  }

  /**
   * Get this peer's name
   */
  getPlayerName(): string {
    return this.playerName;
  }

  /**
   * Set this peer's name
   */
  setPlayerName(name: string): void {
    this.playerName = name;
    this.announce();
  }

  /**
   * Request a game with a peer
   */
  requestGame(peerId: string): void {
    this.channel.postMessage({
      type: DiscoveryMessageType.REQUEST_GAME,
      from: this.selfId,
      to: peerId
    });
  }

  /**
   * Accept a game request
   */
  acceptGame(peerId: string, offer?: string): void {
    this.channel.postMessage({
      type: DiscoveryMessageType.ACCEPT_GAME,
      from: this.selfId,
      to: peerId,
      data: {
        offer
      }
    });
  }

  /**
   * Decline a game request
   */
  declineGame(peerId: string): void {
    this.channel.postMessage({
      type: DiscoveryMessageType.DECLINE_GAME,
      from: this.selfId,
      to: peerId
    });
  }

  /**
   * Send a WebRTC offer to a peer
   */
  sendOffer(peerId: string, offer: string): void {
    this.channel.postMessage({
      type: DiscoveryMessageType.OFFER,
      from: this.selfId,
      to: peerId,
      data: {
        offer
      }
    });
  }

  /**
   * Send a WebRTC answer to a peer
   */
  sendAnswer(peerId: string, answer: string): void {
    this.channel.postMessage({
      type: DiscoveryMessageType.ANSWER,
      from: this.selfId,
      to: peerId,
      data: {
        answer
      }
    });
  }

  /**
   * Set callback for when the list of peers changes
   */
  onPeersChanged(callback: (peers: PeerInfo[]) => void): void {
    this.onPeersChangedCallback = callback;
  }

  /**
   * Set callback for when a game request is received
   */
  onGameRequest(callback: (request: { from: string, name: string }) => void): void {
    this.onGameRequestCallback = callback;
  }

  /**
   * Set callback for when a game request is accepted
   */
  onGameAccepted(callback: (data: { from: string, offer?: string }) => void): void {
    this.onGameAcceptedCallback = callback;
  }

  /**
   * Set callback for when a game request is declined
   */
  onGameDeclined(callback: (from: string) => void): void {
    this.onGameDeclinedCallback = callback;
  }

  /**
   * Set callback for when an offer is received
   */
  onOffer(callback: (offer: string, from: string) => void): void {
    this.onOfferCallback = callback;
  }

  /**
   * Set callback for when an answer is received
   */
  onAnswer(callback: (answer: string, from: string) => void): void {
    this.onAnswerCallback = callback;
  }

  /**
   * Clean up and disconnect
   */
  close(): void {
    // Send leave message
    this.channel.postMessage({
      type: DiscoveryMessageType.LEAVE,
      from: this.selfId
    });
    
    // Clear intervals
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Close channel
    this.channel.close();
  }
} 