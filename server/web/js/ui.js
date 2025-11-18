/** UI管理模块 - ui.js **/

/**
 * 游戏UI管理器
 */
class GameUI {
    constructor(game, networkManager) {
        this.game = game;
        this.network = networkManager;
        this.canvas = document.getElementById('chessboard');
        this.ctx = this.canvas.getContext('2d');
        this.boardSize = 15;
        this.cellSize = 40;
        this.boardPadding = 20;
        
        this.setupCanvas();
        this.setupEventListeners();
        this.updateTurnIndicator();
    }
    
    /**
     * 设置画布
     */
    setupCanvas() {
        const parent = this.canvas.parentElement;
        const parentWidth = parent ? parent.clientWidth : (window.innerWidth - 40);
        const idealCell = Math.floor((parentWidth - this.boardPadding * 2) / this.boardSize);
        this.cellSize = Math.max(24, Math.min(40, idealCell));
        const width = this.boardSize * this.cellSize + this.boardPadding * 2;
        const height = this.boardSize * this.cellSize + this.boardPadding * 2;
        this.canvas.width = width;
        this.canvas.height = height;
        this.drawBoard();
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.updateBoard();
        });
    }
    
    /**
     * 绘制棋盘
     */
    drawBoard() {
        this.ctx.fillStyle = '#DEB887';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 1;
        
        // 绘制网格线
        for (let i = 0; i < this.boardSize; i++) {
            const x = this.boardPadding + i * this.cellSize;
            const y = this.boardPadding + i * this.cellSize;
            
            // 横线
            this.ctx.beginPath();
            this.ctx.moveTo(this.boardPadding, y);
            this.ctx.lineTo(this.canvas.width - this.boardPadding, y);
            this.ctx.stroke();
            
            // 竖线
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.boardPadding);
            this.ctx.lineTo(x, this.canvas.height - this.boardPadding);
            this.ctx.stroke();
        }

        // 外边框
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.strokeRect(
            this.boardPadding,
            this.boardPadding,
            this.canvas.width - this.boardPadding * 2,
            this.canvas.height - this.boardPadding * 2
        );
        
        // 绘制星位
        const starPoints = [
            [3, 3], [3, 11], [11, 3], [11, 11], [7, 7]
        ];
        
        this.ctx.fillStyle = '#8B4513';
        starPoints.forEach(([row, col]) => {
            const x = this.boardPadding + col * this.cellSize;
            const y = this.boardPadding + row * this.cellSize;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }
    
    /**
     * 绘制棋子
     */
    drawPiece(row, col, player) {
        const x = this.boardPadding + col * this.cellSize;
        const y = this.boardPadding + row * this.cellSize;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.cellSize * 0.4, 0, 2 * Math.PI);
        
        if (player === 1) {
            // 黑子
            this.ctx.fillStyle = '#000000';
            this.ctx.strokeStyle = '#333333';
        } else {
            // 白子
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.strokeStyle = '#CCCCCC';
        }
        
        this.ctx.fill();
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // 添加阴影效果
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // 重置阴影
        this.ctx.shadowColor = '透明';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }
    
    /**
     * 高亮最后一步
     */
    highlightLastMove(row, col) {
        const x = this.boardPadding + col * this.cellSize;
        const y = this.boardPadding + row * this.cellSize;
        
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.cellSize * 0.45, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
    
    /**
     * 更新棋盘
     */
    updateBoard() {
        this.drawBoard();
        
        // 绘制所有棋子
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const player = this.game.getPiece(row, col);
                if (player !== 0) {
                    this.drawPiece(row, col, player);
                }
            }
        }
        
        // 高亮最后一步
        const lastMove = this.game.getLastMove();
        if (lastMove) {
            this.highlightLastMove(lastMove.row, lastMove.col);
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            if (!this.network.isConnected || this.game.getState() !== 'playing') {
                return;
            }
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            let col = Math.round((x - this.boardPadding) / this.cellSize);
            let row = Math.round((y - this.boardPadding) / this.cellSize);
            col = Math.max(0, Math.min(this.boardSize - 1, col));
            row = Math.max(0, Math.min(this.boardSize - 1, row));
            this.handleCellClick(row, col);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.network.isConnected || this.game.getState() !== 'playing') {
                return;
            }
            const t = e.touches && e.touches[0];
            if (!t) return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const x = (t.clientX - rect.left) * scaleX;
            const y = (t.clientY - rect.top) * scaleY;
            let col = Math.round((x - this.boardPadding) / this.cellSize);
            let row = Math.round((y - this.boardPadding) / this.cellSize);
            col = Math.max(0, Math.min(this.boardSize - 1, col));
            row = Math.max(0, Math.min(this.boardSize - 1, row));
            this.handleCellClick(row, col);
            e.preventDefault();
        }, { passive: false });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const col = Math.round((x - this.boardPadding) / this.cellSize);
            const row = Math.round((y - this.boardPadding) / this.cellSize);
            
            if (row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize) {
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'default';
            }
        });
    }
    
    /**
     * 处理格子点击
     */
    handleCellClick(row, col) {
        if (!this.game.canMakeMove(row, col)) {
            return;
        }
        const current = this.game.getCurrentPlayer();
        const result = this.game.makeMove(row, col, current);
        if (result && result.success) {
            this.drawPiece(row, col, current);
            this.highlightLastMove(row, col);
            this.updateTurnIndicator();
        }
        this.network.makeMove(row, col);
    }
    
    /**
     * 更新回合指示器
     */
    updateTurnIndicator() {
        const turnIndicator = document.getElementById('turnIndicator');
        const gameState = this.game.getState();
        
        if (gameState === 'waiting') {
            turnIndicator.textContent = '等待玩家';
        } else if (gameState === 'playing') {
            const currentPlayer = this.game.getCurrentPlayer();
            turnIndicator.textContent = currentPlayer === 1 ? '黑方回合' : '白方回合';
            
            // 更新玩家状态
            const playerBlack = document.getElementById('playerBlack');
            const playerWhite = document.getElementById('playerWhite');
            
            if (currentPlayer === 1) {
                playerBlack.classList.add('active');
                playerWhite.classList.remove('active');
            } else {
                playerBlack.classList.remove('active');
                playerWhite.classList.add('active');
            }
        } else if (gameState === 'finished') {
            const winner = this.game.getWinner();
            const text = winner === 1 ? '黑方获胜！' : winner === 2 ? '白方获胜！' : '平局！';
            turnIndicator.textContent = text;
        }
    }
    
    /**
     * 更新玩家信息
     */
    updatePlayers(players) {
        const blackPlayer = players.find(p => p.playerNumber === 1);
        const whitePlayer = players.find(p => p.playerNumber === 2);
        
        if (blackPlayer) {
            document.querySelector('#playerBlack .player-name').textContent = blackPlayer.name;
            document.querySelector('#playerBlack .player-status').textContent = '已连接';
        }
        
        if (whitePlayer) {
            document.querySelector('#playerWhite .player-name').textContent = whitePlayer.name;
            document.querySelector('#playerWhite .player-status').textContent = '已连接';
        }
    }
    
    updateScores(scores) {
        const blackScoreEl = document.getElementById('blackScore');
        const whiteScoreEl = document.getElementById('whiteScore');
        if (blackScoreEl) blackScoreEl.textContent = (scores && scores[1]) || 0;
        if (whiteScoreEl) whiteScoreEl.textContent = (scores && scores[2]) || 0;
    }
    
    /**
     * 更新房间号
     */
    updateRoomId(roomId) {
        const roomIdEl = document.getElementById('roomId');
        const waitingTitle = document.querySelector('.waiting-message h3');
        const shareBtn = document.getElementById('shareRoom');
        
        if (roomIdEl) {
            roomIdEl.textContent = roomId;
        }
        
        if (waitingTitle) {
            waitingTitle.textContent = '等待其他玩家加入...';
        }
        
        if (shareBtn) {
            shareBtn.disabled = false;
        }
    }
    
    /**
     * 显示等待覆盖层
     */
    showWaitingOverlay() {
        const overlay = document.getElementById('boardOverlay');
        const shareBtn = document.getElementById('shareRoom');
        
        if (overlay) {
            overlay.classList.remove('hidden');
        }
        
        if (shareBtn) {
            try {
                const hasRoom = this.network && typeof this.network.getRoomId === 'function' && this.network.getRoomId();
                shareBtn.disabled = !hasRoom;
            } catch (_) {
                shareBtn.disabled = true;
            }
        }
    }
    
    /**
     * 隐藏等待覆盖层
     */
    hideWaitingOverlay() {
        const overlay = document.getElementById('boardOverlay');
        
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
    
    /**
     * 显示游戏结束弹窗
     */
    showGameOver(winner) {
        const modal = document.getElementById('gameOverModal');
        const gameResult = document.getElementById('gameResult');
        const gameResultDetail = document.getElementById('gameResultDetail');
        
        if (winner) {
            gameResult.textContent = '游戏结束';
            gameResultDetail.textContent = `${winner.playerName} 获胜！`;
        } else {
            gameResult.textContent = '平局！';
            gameResultDetail.textContent = '双方势均力敌';
        }
        
        modal.classList.add('show');
    }
    
    /**
     * 隐藏游戏结束弹窗
     */
    hideGameOverModal() {
        const modal = document.getElementById('gameOverModal');
        modal.classList.remove('show');
    }
    
    /**
     * 显示分享弹窗
     */
    showShareModal(shareUrl) {
        const modal = document.getElementById('shareModal');
        const shareLink = document.getElementById('shareLink');
        
        if (shareLink) {
            shareLink.value = shareUrl;
        }
        
        modal.classList.add('show');
    }
    
    /**
     * 隐藏分享弹窗
     */
    hideShareModal() {
        const modal = document.getElementById('shareModal');
        modal.classList.remove('show');
    }
    
    /**
     * 重置UI
     */
    resetUI() {
        this.game.resetGame();
        this.updateBoard();
        this.updateTurnIndicator();
        this.showWaitingOverlay();
        
        // 重置玩家状态
        document.querySelector('#playerBlack .player-status').textContent = '等待连接';
        document.querySelector('#playerWhite .player-status').textContent = '等待连接';
        
        // 清除玩家名称
        document.querySelector('#playerBlack .player-name').textContent = '玩家1 (黑子)';
        document.querySelector('#playerWhite .player-name').textContent = '玩家2 (白子)';
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameUI;
} else {
    window.GameUI = GameUI;
}