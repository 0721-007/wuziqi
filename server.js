const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// 静态文件服务配置
// 优先查找环境变量指定的目录，其次查找当前目录下的web文件夹
const envStatic = process.env.STATIC_DIR;
const candidates = [
  envStatic ? (path.isAbsolute(envStatic) ? envStatic : path.join(__dirname, envStatic)) : null,
  path.join(__dirname, 'web')
].filter(Boolean);

const staticDir = candidates.find(p => {
  try { return fs.existsSync(p); } catch (_) { return false; }
});

if (staticDir) {
  console.log('Static directory:', staticDir);
  app.use(express.static(staticDir));
  app.use('/css', express.static(path.join(staticDir, 'css')));
  app.use('/js', express.static(path.join(staticDir, 'js')));
} else {
  console.error('Error: Could not find web directory. Please ensure "web" folder exists.');
}

app.get('/', (req, res) => {
  const indexPath = staticDir ? path.join(staticDir, 'index.html') : null;
  if (indexPath && fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Web application not found. Please ensure the web directory is correctly deployed.');
  }
});

class GameRoom {
  constructor(roomId) {
    this.id = roomId;
    this.players = [];
    this.gameState = {
      board: Array(15).fill(null).map(() => Array(15).fill(0)),
      currentPlayer: 1,
      gameStarted: false,
      winner: null,
      moveHistory: []
    };
    this.chatHistory = [];
    this.createdAt = new Date();
    this.lastActivity = new Date();
    this.scores = { 1: 0, 2: 0 };
  }

  addPlayer(playerId, playerName, socket) {
    if (this.players.length >= 2) {
      return false;
    }

    const playerNumber = this.players.length + 1;
    const player = {
      id: playerId,
      name: playerName,
      socketId: socket.id,
      playerNumber: playerNumber,
      color: playerNumber === 1 ? 'black' : 'white',
      ready: false,
      joinedAt: new Date()
    };

    this.players.push(player);
    this.lastActivity = new Date();
    return player;
  }

  removePlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      this.players.splice(playerIndex, 1);
      this.lastActivity = new Date();
      
      if (this.players.length === 0) {
        return true;
      }
      
      this.resetGame();
    }
    return false;
  }

  resetGame() {
    this.gameState = {
      board: Array(15).fill(null).map(() => Array(15).fill(0)),
      currentPlayer: 1,
      gameStarted: false,
      winner: null,
      moveHistory: []
    };
    this.players.forEach(player => player.ready = false);
  }

  makeMove(playerId, row, col) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !this.gameState.gameStarted || this.gameState.winner) {
      return false;
    }

    if (player.playerNumber !== this.gameState.currentPlayer) {
      return false;
    }

    if (this.gameState.board[row][col] !== 0) {
      return false;
    }

    this.gameState.board[row][col] = player.playerNumber;
    this.gameState.moveHistory.push({ row, col, player: player.playerNumber });
    this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
    this.lastActivity = new Date();

    const winner = this.checkWinner(row, col, player.playerNumber);
    if (winner) {
      this.gameState.winner = winner;
      const playerKey = winner.player;
      if (this.scores[playerKey] !== undefined) {
        this.scores[playerKey] += 1;
      }
      console.log('房间', this.id, '更新分数:', this.scores);
    }

    return true;
  }

  checkWinner(row, col, playerNumber) {
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1]
    ];

    for (const [dx, dy] of directions) {
      let count = 1;
      
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && 
            this.gameState.board[newRow][newCol] === playerNumber) {
          count++;
        } else {
          break;
        }
      }
      
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && 
            this.gameState.board[newRow][newCol] === playerNumber) {
          count++;
        } else {
          break;
        }
      }
      
      if (count >= 5) {
        return {
          player: playerNumber,
          playerName: this.players.find(p => p.playerNumber === playerNumber)?.name,
          winningLine: this.getWinningLine(row, col, dx, dy)
        };
      }
    }
    
    return null;
  }

  getWinningLine(row, col, dx, dy) {
    const line = [[row, col]];
    
    for (let i = 1; i < 5; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15) {
        line.push([newRow, newCol]);
      }
    }
    
    for (let i = 1; i < 5; i++) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;
      if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15) {
        line.unshift([newRow, newCol]);
      }
    }
    
    return line;
  }

  addChatMessage(playerId, message) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;

    const chatMessage = {
      id: uuidv4(),
      playerId: playerId,
      playerName: player.name,
      playerNumber: player.playerNumber,
      message: message,
      timestamp: new Date()
    };

    this.chatHistory.push(chatMessage);
    if (this.chatHistory.length > 100) {
      this.chatHistory.shift();
    }

    this.lastActivity = new Date();
    return chatMessage;
  }

  getRoomInfo() {
    return {
      id: this.id,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        playerNumber: p.playerNumber,
        color: p.color,
        ready: p.ready
      })),
      gameState: {
        ...this.gameState,
        board: this.gameState.board
      },
      scores: { ...this.scores },
      chatHistory: this.chatHistory.slice(-20),
      createdAt: this.createdAt,
      lastActivity: this.lastActivity
    };
  }
}

class GameServer {
  constructor() {
    this.rooms = new Map();
    this.players = new Map();
    this.playerRooms = new Map();
  }

  createRoom() {
    const roomId = uuidv4().substring(0, 8);
    const room = new GameRoom(roomId);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  joinRoom(roomId, playerId, playerName, socket) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: '房间不存在' };
    }

    const player = room.addPlayer(playerId, playerName, socket);
    if (!player) {
      return { success: false, error: '房间已满' };
    }

    this.players.set(playerId, player);
    this.playerRooms.set(playerId, roomId);
    
    return { success: true, player, room };
  }

  leaveRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room) return false;

    const shouldDeleteRoom = room.removePlayer(playerId);
    
    this.players.delete(playerId);
    this.playerRooms.delete(playerId);

    if (shouldDeleteRoom) {
      this.rooms.delete(roomId);
    }

    return { roomId, shouldDeleteRoom };
  }

  makeMove(playerId, row, col) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room) return false;

    return room.makeMove(playerId, row, col);
  }

  addChatMessage(playerId, message) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room) return false;

    return room.addChatMessage(playerId, message);
  }

  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.getRoomInfo() : null;
  }

  cleanupInactiveRooms() {
    const now = new Date();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    for (const [roomId, room] of this.rooms) {
      if (now - room.lastActivity > maxInactiveTime) {
        this.rooms.delete(roomId);
        console.log(`清理了不活跃的房间: ${roomId}`);
      }
    }
  }
}

const gameServer = new GameServer();

io.on('connection', (socket) => {
  console.log('玩家连接:', socket.id);

  socket.on('createRoom', (data) => {
    const room = gameServer.createRoom();
    socket.emit('roomCreated', { roomId: room.id });
    console.log(`创建房间: ${room.id}`);
  });

  socket.on('joinRoom', (data) => {
    const { roomId, playerId, playerName } = data;
    const result = gameServer.joinRoom(roomId, playerId, playerName, socket);
    
    if (result.success) {
      socket.join(roomId);
      socket.playerId = playerId;
      socket.roomId = roomId;
      
      const roomInfo = gameServer.getRoomInfo(roomId);
      io.to(roomId).emit('playerJoined', roomInfo);
      
      // 两位玩家到齐则开始游戏
      const room = gameServer.getRoom(roomId);
      if (room && Array.isArray(room.players) && room.players.length >= 2) {
        room.gameState.gameStarted = true;
        io.to(roomId).emit('gameStart', gameServer.getRoomInfo(roomId));
        console.log(`房间 ${roomId} 游戏开始`);
      }
      
      console.log(`玩家 ${playerName} 加入房间: ${roomId}`);
    } else {
      socket.emit('joinRoomError', { error: result.error });
    }
  });

  socket.on('makeMove', (data) => {
    const { row, col } = data;
    const success = gameServer.makeMove(socket.playerId, row, col);
    
    if (success) {
      const roomId = socket.roomId;
      const roomInfo = gameServer.getRoomInfo(roomId);
      io.to(roomId).emit('moveMade', roomInfo);
      
      console.log(`玩家在房间 ${roomId} 下棋: (${row}, ${col})`);
    }
  });

  socket.on('sendMessage', (data) => {
    const { message } = data;
    const chatMessage = gameServer.addChatMessage(socket.playerId, message);
    
    if (chatMessage) {
      const roomId = socket.roomId;
      io.to(roomId).emit('chatMessage', chatMessage);
      
      console.log(`房间 ${roomId} 收到消息: ${message}`);
    }
  });

  socket.on('restartGame', () => {
    const roomId = socket.roomId;
    const room = roomId ? gameServer.getRoom(roomId) : null;
    if (!room) return;
    room.resetGame();
    room.gameState.gameStarted = true;
    room.gameState.currentPlayer = 1;
    const roomInfo = gameServer.getRoomInfo(roomId);
    io.to(roomId).emit('gameRestarted', roomInfo);
    io.to(roomId).emit('gameStart', roomInfo);
    console.log(`房间 ${roomId} 重新开始一局`);
  });

  socket.on('disconnect', () => {
    console.log('玩家断开连接:', socket.id);
    
    if (socket.playerId) {
      const result = gameServer.leaveRoom(socket.playerId);
      if (result) {
        const { roomId, shouldDeleteRoom } = result;
        
        if (!shouldDeleteRoom) {
          const roomInfo = gameServer.getRoomInfo(roomId);
          io.to(roomId).emit('playerLeft', roomInfo);
        }
        
        console.log(`玩家离开房间: ${roomId}`);
      }
    }
  });
});

setInterval(() => {
  gameServer.cleanupInactiveRooms();
}, 5 * 60 * 1000); // 每5分钟清理一次

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`五子棋服务器运行在端口: ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
});
