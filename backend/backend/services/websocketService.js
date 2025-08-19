import { Server } from 'socket.io';

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Set();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*", // Configure this properly for production
        methods: ["GET", "POST"]
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`📡 Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send current stats on connection
      this.sendCurrentStats(socket);

      socket.on('disconnect', () => {
        console.log(`📡 Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle client requests for updates
      socket.on('request-update', () => {
        this.sendCurrentStats(socket);
      });
    });

    console.log('✅ WebSocket service initialized');
  }

  async sendCurrentStats(socket = null) {
    try {
      const MyScheme = (await import('../models/schemeModel.js')).default;
      
      const totalSchemes = await MyScheme.countDocuments();
      const recentSchemes = await MyScheme.find()
        .sort({ lastUpdated: -1 })
        .limit(5)
        .select('schemeName ministry category lastUpdated');
      
      const stats = {
        totalSchemes,
        recentSchemes,
        lastUpdated: new Date().toISOString(),
        connectedClients: this.connectedClients.size
      };

      if (socket) {
        socket.emit('stats-update', stats);
      } else {
        this.broadcast('stats-update', stats);
      }
    } catch (error) {
      console.error('❌ Error sending stats:', error.message);
    }
  }

  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
      console.log(`📡 Broadcasted ${event} to ${this.connectedClients.size} clients`);
    }
  }

  notifySyncStart() {
    this.broadcast('sync-started', {
      message: 'Data synchronization started',
      timestamp: new Date().toISOString()
    });
  }

  notifySyncProgress(progress) {
    this.broadcast('sync-progress', {
      ...progress,
      timestamp: new Date().toISOString()
    });
  }

  notifySyncComplete(result) {
    this.broadcast('sync-completed', {
      ...result,
      message: 'Data synchronization completed',
      timestamp: new Date().toISOString()
    });
    
    // Send updated stats
    this.sendCurrentStats();
  }

  notifyError(error) {
    this.broadcast('error', {
      message: error.message || 'An error occurred',
      timestamp: new Date().toISOString()
    });
  }
}

export default new WebSocketService();