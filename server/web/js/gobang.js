/** 五子棋游戏逻辑 - gobang.js **/

// 游戏状态常量
const GAME_STATE = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    PAUSED: 'paused',
    FINISHED: 'finished'
};

// 玩家类型
const PLAYER_TYPE = {
    BLACK: 1,
    WHITE: 2
};

// 游戏模式
const GAME_MODE = {
    LOCAL: 'local',
    ONLINE: 'online'
};

/**
 * 五子棋游戏类
 */
class GobangGame {
    constructor() {
        this.board = [];
        this.currentPlayer = PLAYER_TYPE.BLACK;
        this.gameState = GAME_STATE.WAITING;
        this.winner = null;
        this.moveHistory = [];
        this.boardSize = 15;
        this.lastMove = null;
        this.gameStartTime = null;
        this.mode = GAME_MODE.ONLINE;
        
        this.initializeBoard();
    }

    /**
     * 开始游戏
     */
    startGame() {
        this.gameState = GAME_STATE.PLAYING;
        this.currentPlayer = PLAYER_TYPE.BLACK;
        this.gameStartTime = Date.now();
    }

    /**
     * 结束游戏
     */
    endGame(winner) {
        this.gameState = GAME_STATE.FINISHED;
        this.winner = winner;
    }

    /**
     * 是否可在指定位置落子
     */
    canMakeMove(row, col) {
        if (this.gameState !== GAME_STATE.PLAYING) return false;
        if (this.winner) return false;
        if (!this.isValidPosition(row, col)) return false;
        return this.board[row][col] === 0;
    }

    /**
     * 初始化棋盘
     */
    initializeBoard() {
        this.board = Array(this.boardSize).fill(null).map(() => 
            Array(this.boardSize).fill(0)
        );
    }

    /**
     * 开始新游戏
     */
    startNewGame() {
        this.initializeBoard();
        this.currentPlayer = PLAYER_TYPE.BLACK;
        this.gameState = GAME_STATE.PLAYING;
        this.winner = null;
        this.moveHistory = [];
        this.lastMove = null;
        this.gameStartTime = Date.now();
    }

    /**
     * 落子
     */
    makeMove(row, col, player) {
        if (this.gameState !== GAME_STATE.PLAYING) {
            return { success: false, message: '游戏未开始' };
        }

        if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
            return { success: false, message: '坐标超出棋盘范围' };
        }

        if (this.board[row][col] !== 0) {
            return { success: false, message: '该位置已有棋子' };
        }

        if (player && player !== this.currentPlayer) {
            return { success: false, message: '不是你的回合' };
        }

        // 落子
        this.board[row][col] = this.currentPlayer;
        this.lastMove = { row, col, player: this.currentPlayer, timestamp: Date.now() };
        this.moveHistory.push(this.lastMove);

        // 检查获胜
        if (this.checkWin(row, col, this.currentPlayer)) {
            this.winner = this.currentPlayer;
            this.gameState = GAME_STATE.FINISHED;
            return { 
                success: true, 
                gameOver: true, 
                winner: this.currentPlayer,
                winningLine: this.getWinningLine(row, col, this.currentPlayer)
            };
        }

        // 检查平局
        if (this.checkDraw()) {
            this.gameState = GAME_STATE.FINISHED;
            return { success: true, gameOver: true, draw: true };
        }

        // 切换玩家
        this.currentPlayer = this.currentPlayer === PLAYER_TYPE.BLACK ? 
            PLAYER_TYPE.WHITE : PLAYER_TYPE.BLACK;

        return { success: true, nextPlayer: this.currentPlayer };
    }

    /**
     * 检查获胜
     */
    checkWin(row, col, player) {
        const directions = [
            [0, 1],   // 水平
            [1, 0],   // 垂直
            [1, 1],   // 对角线
            [1, -1]   // 反对角线
        ];

        for (let [dx, dy] of directions) {
            let count = 1;
            
            // 正方向计数
            for (let i = 1; i < 5; i++) {
                const newRow = row + dx * i;
                const newCol = col + dy * i;
                if (this.isValidPosition(newRow, newCol) && 
                    this.board[newRow][newCol] === player) {
                    count++;
                } else {
                    break;
                }
            }
            
            // 反方向计数
            for (let i = 1; i < 5; i++) {
                const newRow = row - dx * i;
                const newCol = col - dy * i;
                if (this.isValidPosition(newRow, newCol) && 
                    this.board[newRow][newCol] === player) {
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
     * 获取获胜连线
     */
    getWinningLine(row, col, player) {
        const directions = [
            [0, 1],   // 水平
            [1, 0],   // 垂直
            [1, 1],   // 对角线
            [1, -1]   // 反对角线
        ];

        for (let [dx, dy] of directions) {
            let line = [[row, col]];
            
            // 正方向
            for (let i = 1; i < 5; i++) {
                const newRow = row + dx * i;
                const newCol = col + dy * i;
                if (this.isValidPosition(newRow, newCol) && 
                    this.board[newRow][newCol] === player) {
                    line.push([newRow, newCol]);
                } else {
                    break;
                }
            }
            
            // 反方向
            for (let i = 1; i < 5; i++) {
                const newRow = row - dx * i;
                const newCol = col - dy * i;
                if (this.isValidPosition(newRow, newCol) && 
                    this.board[newRow][newCol] === player) {
                    line.unshift([newRow, newCol]);
                } else {
                    break;
                }
            }
            
            if (line.length >= 5) {
                return line;
            }
        }
        
        return [];
    }

    /**
     * 检查平局
     */
    checkDraw() {
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (this.board[i][j] === 0) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 悔棋
     */
    undoMove() {
        if (this.moveHistory.length === 0) {
            return { success: false, message: '没有可悔棋的步骤' };
        }

        const lastMove = this.moveHistory.pop();
        this.board[lastMove.row][lastMove.col] = 0;
        this.lastMove = this.moveHistory.length > 0 ? 
            this.moveHistory[this.moveHistory.length - 1] : null;

        // 切换回上一个玩家
        this.currentPlayer = this.currentPlayer === PLAYER_TYPE.BLACK ? 
            PLAYER_TYPE.WHITE : PLAYER_TYPE.BLACK;

        // 如果游戏已结束，重新设置为进行中
        if (this.gameState === GAME_STATE.FINISHED) {
            this.gameState = GAME_STATE.PLAYING;
            this.winner = null;
        }

        return { 
            success: true, 
            lastMove: lastMove,
            nextPlayer: this.currentPlayer 
        };
    }

    /**
     * 获取游戏状态
     */
    getGameState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            gameState: this.gameState,
            winner: this.winner,
            lastMove: this.lastMove,
            moveHistory: this.moveHistory,
            gameStartTime: this.gameStartTime,
            mode: this.mode
        };
    }

    /**
     * 设置游戏状态
     */
    setGameState(state) {
        this.board = state.board;
        this.currentPlayer = state.currentPlayer;
        this.gameState = state.gameState;
        this.winner = state.winner;
        this.lastMove = state.lastMove;
        this.moveHistory = state.moveHistory;
        this.gameStartTime = state.gameStartTime;
        this.mode = state.mode;
    }

    /**
     * 检查位置是否有效
     */
    isValidPosition(row, col) {
        return row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize;
    }

    /**
     * 获取当前玩家
     */
    getCurrentPlayer() {
        return this.currentPlayer;
    }

    /**
     * 获取棋盘大小
     */
    getBoardSize() {
        return this.boardSize;
    }

    /**
     * 获取游戏状态
     */
    getState() {
        return this.gameState;
    }

    /**
     * 获取获胜者
     */
    getWinner() {
        return this.winner;
    }

    /**
     * 获取指定位置的棋子
     */
    getPiece(row, col) {
        if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
            return 0;
        }
        return this.board[row][col];
    }

    /**
     * 获取最后一步
     */
    getLastMove() {
        return this.lastMove;
    }

    /**
     * 获取游戏时长
     */
    getGameDuration() {
        if (!this.gameStartTime) return 0;
        return Date.now() - this.gameStartTime;
    }

    /**
     * 重置游戏
     */
    resetGame() {
        this.initializeBoard();
        this.currentPlayer = PLAYER_TYPE.BLACK;
        this.gameState = GAME_STATE.WAITING;
        this.winner = null;
        this.moveHistory = [];
        this.lastMove = null;
        this.gameStartTime = null;
    }
}

// 导出游戏类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GobangGame, PLAYER_TYPE, GAME_STATE, GAME_MODE };
} else {
    window.GobangGame = GobangGame;
    window.PLAYER_TYPE = PLAYER_TYPE;
    window.GAME_STATE = GAME_STATE;
    window.GAME_MODE = GAME_MODE;
}