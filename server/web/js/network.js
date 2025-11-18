/** 网络通信模块 - network.js **/

/**
 * Socket.IO网络管理器
 */
class NetworkManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.roomId = null;
        this.playerId = null;
        this.playerName = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventHandlers = {};
        
        this.setupEventHandlers();
    }

    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        this.eventHandlers = {
            'connect': [],
            'disconnect': [],
            'joinRoom': [],
            'playerJoined': [],
            'playerLeft': [],
            'gameStart': [],
            'makeMove': [],
            'moveMade': [],
            'gameOver': [],
            'chatMessage': [],
            'error': []
        };
    }

    /**
     * 连接到服务器
     */
    connect(serverUrl = null) {
        try {
            // 使用Socket.IO连接到服务器
            const ioUrl = serverUrl || this.getServerUrl();
            console.log('正在连接Socket.IO到:', ioUrl);
            
            this.socket = io(ioUrl, {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                forceNew: true
            });
            
            this.setupSocketEvents();
            console.log('Socket.IO连接请求已发送');
        } catch (error) {
            console.error('Socket.IO连接失败:', error);
            this.handleConnectionError(error);
        }
    }

    /**
     * 获取服务器URL
     */
    getServerUrl() {
        // 根据当前环境选择合适的服务器
        const host = window.location.host;
        
        // 如果是本地开发，使用本地服务器
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
            return 'http://localhost:3000';
        }
        
        // 生产环境使用当前域名
        return window.location.origin;
    }

    /**
     * 设置Socket.IO事件处理
     */
    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Socket.IO连接已建立，socket ID:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connect', { socketId: this.socket.id });
            
            // 更新连接状态显示
            this.updateConnectionStatus(true);
            
            // 如果已有房间ID，重新加入房间
            if (this.roomId && this.playerName) {
                this.joinRoom(this.roomId, this.playerName);
            }
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Socket.IO连接错误:', error);
            this.handleConnectionError(error);
        });
        
        this.socket.on('connect_timeout', () => {
            console.error('Socket.IO连接超时');
            this.handleConnectionError(new Error('连接超时'));
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket.IO连接已断开:', reason);
            this.isConnected = false;
            this.emit('disconnect', { reason });
            this.updateConnectionStatus(false);
            
            // 尝试重连
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => {
                    this.reconnectAttempts++;
                    console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    this.connect();
                }, this.reconnectDelay * this.reconnectAttempts);
            }
        });

        this.socket.on('roomCreated', (data) => {
            console.log('房间创建成功:', data);
            this.roomId = data.roomId;
            this.emit('roomCreated', data);
        });

        this.socket.on('playerJoined', (roomInfo) => {
            console.log('玩家加入房间:', roomInfo);
            this.emit('playerJoined', roomInfo);
        });

        this.socket.on('playerLeft', (roomInfo) => {
            console.log('玩家离开房间:', roomInfo);
            this.emit('playerLeft', roomInfo);
        });

        this.socket.on('gameStart', (roomInfo) => {
            console.log('服务器通知游戏开始:', roomInfo);
            this.emit('gameStart', roomInfo);
        });

        this.socket.on('gameRestarted', (roomInfo) => {
            console.log('服务器通知游戏已重置:', roomInfo);
            this.emit('gameRestarted', roomInfo);
        });

        this.socket.on('moveMade', (roomInfo) => {
            console.log('棋子移动:', roomInfo);
            this.emit('moveMade', roomInfo);
        });

        this.socket.on('chatMessage', (chatMessage) => {
            console.log('聊天消息:', chatMessage);
            this.emit('chatMessage', chatMessage);
        });

        this.socket.on('joinRoomError', (error) => {
            console.error('加入房间错误:', error);
            this.emit('error', { type: 'joinRoom', message: error.error });
        });

        this.socket.on('connect_error', (error) => {
            console.error('连接错误:', error);
            this.handleConnectionError(error);
        });
    }

    /**
     * 创建房间
     */
    createRoom() {
        console.log('开始创建房间，连接状态:', this.isConnected);
        
        if (!this.isConnected) {
            console.warn('未连接到服务器，无法创建房间');
            return false;
        }
        
        if (!this.socket) {
            console.error('Socket对象不存在');
            return false;
        }
        
        console.log('发送创建房间请求');
        this.socket.emit('createRoom');
        return true;
    }

    /**
     * 加入房间
     */
    joinRoom(roomId, playerName) {
        this.roomId = roomId;
        this.playerName = playerName;
        this.playerId = this.generatePlayerId();
        
        if (!this.isConnected) {
            console.warn('未连接到服务器，无法加入房间');
            return false;
        }
        
        this.socket.emit('joinRoom', {
            roomId,
            playerName,
            playerId: this.playerId
        });
        
        return true;
    }

    /**
     * 发送落子
     */
    makeMove(row, col) {
        if (!this.isConnected || !this.roomId) {
            console.warn('未连接或未加入房间，无法下棋');
            return false;
        }
        
        this.socket.emit('makeMove', {
            row,
            col,
            playerId: this.playerId
        });
        
        return true;
    }

    /**
     * 发送聊天消息
     */
    sendChatMessage(message) {
        if (!this.isConnected || !this.roomId) {
            console.warn('未连接或未加入房间，无法发送消息');
            return false;
        }
        
        this.socket.emit('sendMessage', {
            message
        });
        
        return true;
    }

    restartGame() {
        if (!this.isConnected || !this.roomId) {
            console.warn('未连接或未加入房间，无法重新开始');
            return false;
        }
        this.socket.emit('restartGame');
        return true;
    }

    /**
     * 更新连接状态显示
     */
    updateConnectionStatus(connected) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        const connectBtn = document.getElementById('connectBtn');
        
        if (statusDot && statusText) {
            if (connected) {
                statusDot.className = 'status-dot connected';
                statusText.textContent = '已连接';
                if (connectBtn) {
                    connectBtn.style.display = 'none';
                }
            } else {
                statusDot.className = 'status-dot disconnected';
                statusText.textContent = '未连接';
                if (connectBtn) {
                    connectBtn.style.display = 'inline-block';
                }
            }
        }
    }

    /**
     * 处理连接错误
     */
    handleConnectionError(error) {
        this.updateConnectionStatus(false);
        this.emit('error', { 
            type: 'connection', 
            message: '连接服务器失败，请检查网络连接' 
        });
    }

    /**
     * 生成玩家ID
     */
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 获取当前房间ID
     */
    getRoomId() {
        return this.roomId;
    }

    /**
     * 获取当前玩家ID
     */
    getPlayerId() {
        return this.playerId;
    }

    /**
     * 获取连接状态
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            roomId: this.roomId,
            playerId: this.playerId,
            playerName: this.playerName,
            socketId: this.socket?.id
        };
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.roomId = null;
        this.playerId = null;
        this.updateConnectionStatus(false);
    }

    /**
     * 事件监听
     */
    on(event, callback) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(callback);
    }

    /**
     * 触发事件
     */
    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件 ${event} 处理错误:`, error);
                }
            });
        }
    }

    /**
     * 移除事件监听
     */
    off(event, callback) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event] = this.eventHandlers[event].filter(cb => cb !== callback);
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkManager;
} else {
    window.NetworkManager = NetworkManager;
}