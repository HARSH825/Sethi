// src/services/websocketService.ts (COMPLETE FIXED VERSION)
import { io, Socket } from 'socket.io-client';

interface WebSocketEventData {
  userId?: string;
  message?: string;
  timestamp?: Date;
  [key: string]: any;
}

interface VoiceCommandData {
  userId: string;
  command: string;
  context?: Record<string, any>;
  timestamp: Date;
}

type EventCallback = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private userId: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  connect(userId: string): void {
    if (this.connected && this.socket?.connected) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    this.userId = userId || `user_${Date.now()}`;
    console.log('🔌 Connecting WebSocket for userId:', this.userId);

    this.socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      upgrade: true,
      timeout: 10000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to Saarthi backend, socket ID:', this.socket?.id);
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Join user session immediately
      this.socket!.emit('join-session', { userId: this.userId });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from backend, reason:', reason);
      this.connected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.connected = false;
      this.reconnectAttempts++;
      
      this.emit('connection-error', { error, attempts: this.reconnectAttempts });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      this.connected = true;
      this.socket!.emit('join-session', { userId: this.userId });
    });

    // Session events
    this.socket.on('session-joined', (data: WebSocketEventData) => {
      console.log('✅ Session joined successfully:', data.message);
      this.emit('session-joined', data);
    });

    // Voice processing events
    this.socket.on('onboarding-progress', (data: WebSocketEventData) => {
      console.log('📝 Received onboarding-progress event:', data);
      this.emit('onboarding-progress', data);
    });

    // Backup global event
    this.socket.on('onboarding-progress-global', (data: WebSocketEventData) => {
      if (data.userId === this.userId) {
        console.log('📝 Received backup onboarding-progress-global:', data);
        this.emit('onboarding-progress', data);
      }
    });

    this.socket.on('navigation-response', (data: WebSocketEventData) => {
      console.log('🧭 Received navigation-response event:', data);
      this.emit('navigation-response', data);
    });

    this.socket.on('command-received', (data: WebSocketEventData) => {
      console.log('📨 Received command-received event:', data);
      this.emit('command-received', data);
    });

    // Test connection
    this.socket.on('test-response', (data: WebSocketEventData) => {
      console.log('🧪 Test response received:', data);
    });
  }

  sendVoiceCommand(command: string, context: Record<string, any> = {}): void {
    if (!this.connected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot send voice command');
      return;
    }

    const commandData: VoiceCommandData = {
      userId: this.userId!,
      command,
      context,
      timestamp: new Date()
    };

    console.log('📤 Sending voice command:', commandData);
    this.socket.emit('voice-command', commandData);
  }

  testConnection(): void {
    if (this.socket) {
      console.log('🧪 Testing WebSocket connection...');
      this.socket.emit('test-connection', { userId: this.userId });
    }
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    console.log('👂 Added listener for event:', event);
  }

  off(event: string, callback: EventCallback): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Event listener error for ${event}:`, error);
        }
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }

  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' | 'error' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    return 'connecting';
  }

  getUserId(): string | null {
    return this.userId;
  }
}

export default new WebSocketService();
