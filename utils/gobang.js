/**
 * 五子棋核心算法模块
 * 包含棋盘状态管理、胜负判断、游戏逻辑等核心功能
 */

class GobangGame {
  constructor() {
    this.board = Array(15).fill().map(() => Array(15).fill(0)); // 0: 空, 1: 黑子, 2: 白子
    this.currentPlayer = 1; // 黑子先行
    this.gameStatus = 'playing'; // playing, finished
    this.winner = null;
    this.moveHistory = []; // 棋谱记录
    this.gameStartTime = null;
    this.gameEndTime = null;
  }

  /**
   * 初始化新游戏
   */
  initGame() {
    this.board = Array(15).fill().map(() => Array(15).fill(0));
    this.currentPlayer = 1;
    this.gameStatus = 'playing';
    this.winner = null;
    this.moveHistory = [];
    this.gameStartTime = Date.now();
    this.gameEndTime = null;
  }

  /**
   * 落子逻辑
   * @param {number} row - 行坐标 (0-14)
   * @param {number} col - 列坐标 (0-14)
   * @param {number} player - 玩家 (1: 黑子, 2: 白子)
   * @returns {boolean|string} - true: 成功, 'win': 获胜, 'draw': 平局, false: 失败
   */
  makeMove(row, col, player) {
    // 验证输入参数
    if (!this.isValidPosition(row, col)) {
      console.error('Invalid position:', row, col);
      return false;
    }

    if (this.board[row][col] !== 0 || this.gameStatus !== 'playing') {
      return false;
    }

    if (player !== this.currentPlayer) {
      console.error('Not your turn');
      return false;
    }

    // 执行落子
    this.board[row][col] = player;
    this.moveHistory.push({ row, col, player, timestamp: Date.now() });

    // 检查胜负
    if (this.checkWin(row, col, player)) {
      this.gameStatus = 'finished';
      this.winner = player;
      this.gameEndTime = Date.now();
      return 'win';
    }

    // 检查平局
    if (this.isBoardFull()) {
      this.gameStatus = 'finished';
      this.gameEndTime = Date.now();
      return 'draw';
    }

    // 切换玩家
    this.currentPlayer = player === 1 ? 2 : 1;
    return true;
  }

  /**
   * 悔棋功能
   */
  undoMove() {
    if (this.moveHistory.length === 0) {
      return false;
    }

    const lastMove = this.moveHistory.pop();
    this.board[lastMove.row][lastMove.col] = 0;
    this.currentPlayer = lastMove.player;
    this.gameStatus = 'playing';
    this.winner = null;
    
    return true;
  }

  /**
   * 胜负判断算法
   * @param {number} row - 最后落子的行
   * @param {number} col - 最后落子的列
   * @param {number} player - 玩家
   * @returns {boolean} - 是否获胜
   */
  checkWin(row, col, player) {
    const directions = [
      [0, 1],   // 横向
      [1, 0],   // 纵向
      [1, 1],   // 主对角线
      [1, -1]   // 副对角线
    ];

    for (let [dx, dy] of directions) {
      let count = 1;

      // 向一个方向计数
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (this.isValidPosition(newRow, newCol) && this.board[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }

      // 向相反方向计数
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (this.isValidPosition(newRow, newCol) && this.board[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 5) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查位置是否有效
   */
  isValidPosition(row, col) {
    return row >= 0 && row < 15 && col >= 0 && col < 15;
  }

  /**
   * 检查棋盘是否已满
   */
  isBoardFull() {
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        if (this.board[i][j] === 0) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 获取游戏统计信息
   */
  getGameStats() {
    const duration = this.gameEndTime ? this.gameEndTime - this.gameStartTime : Date.now() - this.gameStartTime;
    return {
      totalMoves: this.moveHistory.length,
      duration: duration,
      winner: this.winner,
      gameStatus: this.gameStatus,
      moveHistory: this.moveHistory
    };
  }

  /**
   * 获取当前棋盘状态
   */
  getBoardState() {
    return {
      board: this.board.map(row => [...row]), // 深拷贝
      currentPlayer: this.currentPlayer,
      gameStatus: this.gameStatus,
      winner: this.winner,
      moveHistory: [...this.moveHistory]
    };
  }

  /**
   * 从状态恢复游戏
   */
  restoreFromState(state) {
    this.board = state.board.map(row => [...row]);
    this.currentPlayer = state.currentPlayer;
    this.gameStatus = state.gameStatus;
    this.winner = state.winner;
    this.moveHistory = [...state.moveHistory];
    if (this.moveHistory.length > 0) {
      this.gameStartTime = this.moveHistory[0].timestamp;
    }
  }
}

/**
 * 五子棋游戏管理器
 * 负责管理多个游戏实例和全局游戏状态
 */
class GameManager {
  constructor() {
    this.currentGame = null;
    this.gameHistory = [];
  }

  /**
   * 创建新游戏
   */
  createNewGame() {
    this.currentGame = new GobangGame();
    this.currentGame.initGame();
    return this.currentGame;
  }

  /**
   * 获取当前游戏
   */
  getCurrentGame() {
    if (!this.currentGame) {
      this.createNewGame();
    }
    return this.currentGame;
  }

  /**
   * 结束当前游戏
   */
  endCurrentGame() {
    if (this.currentGame) {
      const gameStats = this.currentGame.getGameStats();
      this.gameHistory.push(gameStats);
      this.currentGame = null;
      return gameStats;
    }
    return null;
  }

  /**
   * 获取游戏历史
   */
  getGameHistory() {
    return this.gameHistory;
  }

  /**
   * 清空游戏历史
   */
  clearGameHistory() {
    this.gameHistory = [];
  }
}

// 导出模块
module.exports = {
  GobangGame,
  GameManager
};