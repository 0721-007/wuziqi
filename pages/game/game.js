const app = getApp();
const gobang = require('../../utils/gobang.js');
const ai = require('../../utils/ai.js');
const sound = require('../../utils/sound.js');
const storage = require('../../utils/storage.js');

Page({
  data: {
    game: null,
    ai: null,
    gameMode: 'ai', // ai, online, friend
    aiDifficulty: 'medium',
    currentPlayer: 1,
    gameStatus: 'playing', // playing, paused, finished
    winner: null,
    isThinking: false,
    showResult: false,
    showMenu: false,
    moveHistory: [],
    capturedPieces: { black: 0, white: 0 },
    timer: { black: 0, white: 0 },
    currentTimer: 'black',
    gameStartTime: null,
    lastMove: null,
    isPlayerTurn: true
  },

  onLoad(options) {
    const gameMode = options.mode || 'ai';
    const difficulty = options.difficulty || 'medium';
    
    this.setData({
      gameMode,
      aiDifficulty: difficulty
    });
    
    this.initGame();
    this.startTimer();
  },

  onUnload() {
    this.stopTimer();
    sound.stopBackgroundMusic();
  },

  onHide() {
    this.stopTimer();
    sound.pauseBackgroundMusic();
  },

  onShow() {
    if (this.data.gameStatus === 'playing') {
      this.startTimer();
      sound.resumeBackgroundMusic();
    }
  },

  // 初始化游戏
  initGame() {
    const game = new gobang.GobangGame();
    const aiPlayer = new ai.GobangAI(this.data.aiDifficulty);
    
    this.setData({
      game,
      ai: aiPlayer,
      currentPlayer: game.currentPlayer,
      gameStatus: 'playing',
      winner: null,
      moveHistory: [],
      capturedPieces: { black: 0, white: 0 },
      gameStartTime: Date.now(),
      lastMove: null,
      isPlayerTurn: true
    });
    
    // 播放背景音乐
    sound.playBackgroundMusic();
  },

  // 处理棋盘点击
  onBoardTap(e) {
    if (this.data.gameStatus !== 'playing' || this.data.isThinking || !this.data.isPlayerTurn) {
      return;
    }
    
    const { row, col } = e.detail;
    this.makeMove(row, col);
  },

  // 下棋
  makeMove(row, col) {
    const game = this.data.game;
    
    if (!game.isValidMove(row, col)) {
      sound.playSound('alert');
      sound.vibrate('light');
      return;
    }
    
    // 播放落子音效
    sound.playSound('place');
    sound.vibrate('light');
    
    // 执行移动
    game.makeMove(row, col);
    
    // 更新移动历史
    const moveHistory = [...this.data.moveHistory, { row, col, player: game.currentPlayer === 1 ? 2 : 1 }];
    
    // 检查胜利
    const winner = game.checkWinner();
    
    this.setData({
      currentPlayer: game.currentPlayer,
      moveHistory,
      lastMove: { row, col },
      isPlayerTurn: this.data.gameMode === 'ai' ? false : true
    });
    
    // 检查游戏结束
    if (winner !== 0) {
      this.endGame(winner);
      return;
    }
    
    // AI对战模式
    if (this.data.gameMode === 'ai' && game.currentPlayer === 2) {
      this.makeAIMove();
    }
  },

  // AI下棋
  makeAIMove() {
    this.setData({ isThinking: true });
    
    // 模拟思考时间
    setTimeout(() => {
      const game = this.data.game;
      const ai = this.data.ai;
      
      const move = ai.getBestMove(game.board, 2);
      
      if (move) {
        game.makeMove(move.row, move.col);
        
        const moveHistory = [...this.data.moveHistory, { row: move.row, col: move.col, player: 2 }];
        const winner = game.checkWinner();
        
        this.setData({
          currentPlayer: game.currentPlayer,
          moveHistory,
          lastMove: { row: move.row, col: move.col },
          isThinking: false,
          isPlayerTurn: true
        });
        
        // 播放AI落子音效
        sound.playSound('place');
        
        if (winner !== 0) {
          this.endGame(winner);
        }
      } else {
        this.setData({ isThinking: false });
      }
    }, 800 + Math.random() * 1200); // 0.8-2秒随机思考时间
  },

  // 结束游戏
  endGame(winner) {
    this.stopTimer();
    
    const gameResult = winner === 1 ? 'win' : 'lose';
    const gameDuration = Math.floor((Date.now() - this.data.gameStartTime) / 1000);
    
    // 播放胜利/失败音效
    if (winner === 1) {
      sound.playSound('win');
      sound.playSequence([
        { type: 'win', delay: 0 },
        { type: 'win', delay: 200 }
      ]);
    } else {
      sound.playSound('lose');
    }
    
    // 保存游戏记录
    this.saveGameRecord(gameResult, gameDuration);
    
    this.setData({
      gameStatus: 'finished',
      winner,
      showResult: true
    });
    
    sound.stopBackgroundMusic();
  },

  // 保存游戏记录
  saveGameRecord(result, duration) {
    const gameRecord = {
      id: Date.now(),
      mode: this.data.gameMode,
      result,
      duration,
      moveCount: this.data.moveHistory.length,
      timestamp: new Date().toISOString(),
      difficulty: this.data.aiDifficulty,
      moves: this.data.moveHistory
    };
    
    // 保存到本地存储
    storage.saveGameRecord(gameRecord);
    
    // 更新统计数据
    storage.updateGameStats(this.data.gameMode, result);
  },

  // 计时器
  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.data.gameStatus === 'playing') {
        const timer = { ...this.data.timer };
        const currentTimer = this.data.currentPlayer === 1 ? 'black' : 'white';
        
        timer[currentTimer]++;
        
        this.setData({
          timer,
          currentTimer
        });
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  // 格式化时间
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  // 游戏控制
  onPause() {
    if (this.data.gameStatus === 'playing') {
      this.setData({ gameStatus: 'paused' });
      this.stopTimer();
      sound.pauseBackgroundMusic();
    }
  },

  onResume() {
    if (this.data.gameStatus === 'paused') {
      this.setData({ gameStatus: 'playing' });
      this.startTimer();
      sound.resumeBackgroundMusic();
    }
  },

  onSurrender() {
    wx.showModal({
      title: '提示',
      content: '确定要认输吗？',
      success: (res) => {
        if (res.confirm) {
          this.endGame(2); // AI获胜
        }
      }
    });
  },

  onUndo() {
    if (this.data.gameStatus !== 'playing' || this.data.moveHistory.length === 0) {
      return;
    }
    
    // 在人机对战中，悔棋需要撤销两步
    const undoSteps = this.data.gameMode === 'ai' ? 2 : 1;
    
    if (this.data.moveHistory.length >= undoSteps) {
      const game = this.data.game;
      const newHistory = [...this.data.moveHistory];
      
      // 撤销指定步数
      for (let i = 0; i < undoSteps; i++) {
        const lastMove = newHistory.pop();
        game.board[lastMove.row][lastMove.col] = 0;
        game.currentPlayer = lastMove.player;
      }
      
      game.gameStatus = 'playing';
      game.winner = null;
      
      this.setData({
        moveHistory: newHistory,
        currentPlayer: game.currentPlayer,
        isPlayerTurn: this.data.gameMode === 'ai' ? game.currentPlayer === 1 : true,
        lastMove: newHistory.length > 0 ? newHistory[newHistory.length - 1] : null
      });
      
      sound.playSound('button');
    }
  },

  onHint() {
    if (this.data.gameStatus !== 'playing' || this.data.isThinking) {
      return;
    }
    
    const game = this.data.game;
    const ai = this.data.ai;
    
    // 获取提示位置
    const hintMove = ai.getBestMove(game.board, game.currentPlayer, 3); // 降低搜索深度
    
    if (hintMove) {
      // 在棋盘上显示提示
      this.setData({
        hintMove: { row: hintMove.row, col: hintMove.col }
      });
      
      // 3秒后清除提示
      setTimeout(() => {
        this.setData({ hintMove: null });
      }, 3000);
      
      sound.playSound('alert');
    }
  },

  // 重新开始
  onRestart() {
    wx.showModal({
      title: '提示',
      content: '确定要重新开始吗？',
      success: (res) => {
        if (res.confirm) {
          this.stopTimer();
          this.initGame();
          this.startTimer();
        }
      }
    });
  },

  // 返回主页
  onBackHome() {
    wx.navigateBack();
  },

  // 显示菜单
  onShowMenu() {
    this.setData({ showMenu: !this.data.showMenu });
  },

  // 分享游戏
  onShareGame() {
    const gameInfo = {
      moveCount: this.data.moveHistory.length,
      duration: this.formatTime(Math.floor((Date.now() - this.data.gameStartTime) / 1000)),
      mode: this.data.gameMode,
      result: this.data.winner === 1 ? '胜利' : '失败'
    };
    
    return {
      title: `五子棋对局：${gameInfo.result}，共${gameInfo.moveCount}手`,
      path: '/pages/index/index',
      imageUrl: '/images/share-game.jpg'
    };
  },

  // 页面分享设置
  onShareAppMessage() {
    return this.onShareGame();
  }
});