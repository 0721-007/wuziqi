/**
 * 五子棋AI算法模块
 * 包含Minimax算法、Alpha-Beta剪枝、棋盘评估等功能
 */

const { GobangGame } = require('./gobang');

class GobangAI {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty; // easy, medium, hard
    this.depth = this.getSearchDepth();
    this.transpositionTable = new Map(); // 置换表用于缓存
  }

  /**
   * 根据难度获取搜索深度
   */
  getSearchDepth() {
    switch(this.difficulty) {
      case 'easy': return 2;
      case 'medium': return 4;
      case 'hard': return 6;
      default: return 4;
    }
  }

  /**
   * 获取最佳落子位置
   * @param {Array} board - 当前棋盘状态
   * @param {number} player - AI玩家 (1: 黑子, 2: 白子)
   * @returns {Array|null} - [row, col] 最佳落子位置
   */
  getBestMove(board, player) {
    const opponent = player === 1 ? 2 : 1;
    let bestScore = -Infinity;
    let bestMove = null;
    
    // 获取所有可能的落子位置（启发式搜索）
    const possibleMoves = this.getPossibleMoves(board, player);
    
    // 如果棋盘为空，下在中心位置
    if (possibleMoves.length === 0) {
      return [7, 7];
    }

    for (let move of possibleMoves) {
      const [row, col] = move;
      board[row][col] = player;
      
      // 使用Alpha-Beta剪枝的Minimax算法
      const score = this.alphaBeta(board, this.depth - 1, -Infinity, Infinity, false, player, opponent);
      
      board[row][col] = 0; // 回溯
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }

  /**
   * Alpha-Beta剪枝算法
   */
  alphaBeta(board, depth, alpha, beta, isMaximizing, player, opponent) {
    // 生成棋盘状态键用于缓存
    const boardKey = this.generateBoardKey(board);
    const cacheKey = `${boardKey}_${depth}_${isMaximizing}`;
    
    // 检查缓存
    if (this.transpositionTable.has(cacheKey)) {
      return this.transpositionTable.get(cacheKey);
    }

    // 检查游戏结束状态
    const winner = this.checkWinner(board);
    if (winner === player) {
      this.transpositionTable.set(cacheKey, 1000000);
      return 1000000;
    }
    if (winner === opponent) {
      this.transpositionTable.set(cacheKey, -1000000);
      return -1000000;
    }
    if (this.isBoardFull(board) || depth === 0) {
      const score = this.evaluateBoard(board, player);
      this.transpositionTable.set(cacheKey, score);
      return score;
    }

    if (isMaximizing) {
      let maxScore = -Infinity;
      const moves = this.getPossibleMoves(board, player);
      
      for (let move of moves) {
        const [row, col] = move;
        board[row][col] = player;
        const score = this.alphaBeta(board, depth - 1, alpha, beta, false, player, opponent);
        board[row][col] = 0;
        
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        
        if (beta <= alpha) {
          break; // Beta剪枝
        }
      }
      
      this.transpositionTable.set(cacheKey, maxScore);
      return maxScore;
    } else {
      let minScore = Infinity;
      const moves = this.getPossibleMoves(board, opponent);
      
      for (let move of moves) {
        const [row, col] = move;
        board[row][col] = opponent;
        const score = this.alphaBeta(board, depth - 1, alpha, beta, true, player, opponent);
        board[row][col] = 0;
        
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        
        if (beta <= alpha) {
          break; // Alpha剪枝
        }
      }
      
      this.transpositionTable.set(cacheKey, minScore);
      return minScore;
    }
  }

  /**
   * 获取可能的落子位置（启发式搜索）
   */
  getPossibleMoves(board, player) {
    const moves = [];
    const moveScores = new Map();
    
    // 扫描整个棋盘
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        if (board[i][j] === 0 && this.hasNeighbor(board, i, j, 2)) {
          // 评估每个空位的价值
          const score = this.evaluatePosition(board, i, j, player);
          moves.push({ row: i, col: j, score });
        }
      }
    }
    
    // 按分数排序，优先搜索高分位置
    moves.sort((a, b) => b.score - a.score);
    
    // 限制搜索范围，提高性能
    const maxMoves = this.difficulty === 'easy' ? 10 : this.difficulty === 'medium' ? 20 : 30;
    return moves.slice(0, maxMoves).map(move => [move.row, move.col]);
  }

  /**
   * 检查位置周围是否有邻居
   */
  hasNeighbor(board, row, col, radius) {
    for (let i = Math.max(0, row - radius); i <= Math.min(14, row + radius); i++) {
      for (let j = Math.max(0, col - radius); j <= Math.min(14, col + radius); j++) {
        if (board[i][j] !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 评估棋盘局势
   */
  evaluateBoard(board, player) {
    const opponent = player === 1 ? 2 : 1;
    let score = 0;
    
    // 评估进攻和防守
    score += this.evaluatePatterns(board, player) * 10;
    score -= this.evaluatePatterns(board, opponent) * 10;
    
    return score;
  }

  /**
   * 评估棋盘上的模式
   */
  evaluatePatterns(board, player) {
    let score = 0;
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1]
    ];
    
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        if (board[i][j] === player) {
          for (let [dx, dy] of directions) {
            score += this.evaluateLine(board, i, j, dx, dy, player);
          }
        }
      }
    }
    
    return score;
  }

  /**
   * 评估一条线上的棋子组合
   */
  evaluateLine(board, row, col, dx, dy, player) {
    let score = 0;
    let count = 1;
    let blocked = 0;
    
    // 向一个方向计数
    for (let i = 1; i < 5; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      if (!this.isValidPosition(newRow, newCol)) {
        blocked++;
        break;
      }
      if (board[newRow][newCol] === player) {
        count++;
      } else if (board[newRow][newCol] === 0) {
        break;
      } else {
        blocked++;
        break;
      }
    }
    
    // 向相反方向计数
    for (let i = 1; i < 5; i++) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;
      if (!this.isValidPosition(newRow, newCol)) {
        blocked++;
        break;
      }
      if (board[newRow][newCol] === player) {
        count++;
      } else if (board[newRow][newCol] === 0) {
        break;
      } else {
        blocked++;
        break;
      }
    }
    
    // 根据连子数和阻挡情况评分
    if (count >= 5) {
      score += 10000; // 五连
    } else if (count === 4 && blocked === 0) {
      score += 1000; // 活四
    } else if (count === 4 && blocked === 1) {
      score += 500; // 冲四
    } else if (count === 3 && blocked === 0) {
      score += 200; // 活三
    } else if (count === 3 && blocked === 1) {
      score += 100; // 眠三
    } else if (count === 2 && blocked === 0) {
      score += 50; // 活二
    } else if (count === 2 && blocked === 1) {
      score += 20; // 眠二
    }
    
    return score;
  }

  /**
   * 评估特定位置的价值
   */
  evaluatePosition(board, row, col, player) {
    const opponent = player === 1 ? 2 : 1;
    let score = 0;
    
    // 模拟落子后评估
    board[row][col] = player;
    score += this.evaluatePatterns(board, player) * 2;
    board[row][col] = 0;
    
    // 模拟对手落子后评估（防守价值）
    board[row][col] = opponent;
    score += this.evaluatePatterns(board, opponent) * 1.5;
    board[row][col] = 0;
    
    return score;
  }

  /**
   * 生成棋盘状态键用于缓存
   */
  generateBoardKey(board) {
    return board.map(row => row.join('')).join('');
  }

  /**
   * 检查获胜者
   */
  checkWinner(board) {
    // 简化的获胜检查，实际使用时可以复用GobangGame中的逻辑
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        if (board[i][j] !== 0) {
          const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
          for (let [dx, dy] of directions) {
            let count = 1;
            // 正方向
            for (let k = 1; k < 5; k++) {
              const newRow = i + dx * k;
              const newCol = j + dy * k;
              if (this.isValidPosition(newRow, newCol) && board[newRow][newCol] === board[i][j]) {
                count++;
              } else {
                break;
              }
            }
            // 反方向
            for (let k = 1; k < 5; k++) {
              const newRow = i - dx * k;
              const newCol = j - dy * k;
              if (this.isValidPosition(newRow, newCol) && board[newRow][newCol] === board[i][j]) {
                count++;
              } else {
                break;
              }
            }
            if (count >= 5) {
              return board[i][j];
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * 检查棋盘是否已满
   */
  isBoardFull(board) {
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        if (board[i][j] === 0) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 检查位置是否有效
   */
  isValidPosition(row, col) {
    return row >= 0 && row < 15 && col >= 0 && col < 15;
  }

  /**
   * 清空缓存
   */
  clearCache() {
    this.transpositionTable.clear();
  }
}

// 导出AI模块
module.exports = {
  GobangAI
};