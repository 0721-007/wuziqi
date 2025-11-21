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
        // 本地对战模式下使用的简单计分板（1=黑,2=白）
        this.localScores = { 1: 0, 2: 0 };
        // 在线模式下用于记录“待确认”的预落子高亮
        this.pendingMove = null;
        
        this.setupCanvas();
        this.setupEventListeners();
        this.updateTurnIndicator();
        
        // 初始化音频上下文
        this.audioCtx = null;
    }

    /**
     * 播放落子音效
     */
    playMoveSound() {
        try {
            // 懒加载音频上下文（浏览器要求必须在用户交互后才能通过代码播放声音）
            if (!this.audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.audioCtx = new AudioContext();
                }
            }

            if (!this.audioCtx) return;
            
            // 恢复上下文（如果被挂起）
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const t = this.audioCtx.currentTime;
            
            // 创建振荡器（模拟声音源）
            const oscillator = this.audioCtx.createOscillator();
            const gainNode = this.audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            
            // 模拟敲击声：频率快速衰减的正弦波
            oscillator.type = 'sine';
            // 从 600Hz 快速降到 100Hz
            oscillator.frequency.setValueAtTime(600, t);
            oscillator.frequency.exponentialRampToValueAtTime(100, t + 0.15);
            
            // 音量包络：快速冲击后衰减
            gainNode.gain.setValueAtTime(0, t);
            gainNode.gain.linearRampToValueAtTime(0.3, t + 0.02); // 冲击
            gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.15); // 衰减
            
            oscillator.start(t);
            oscillator.stop(t + 0.15);
        } catch (e) {
            console.error('播放音效失败:', e);
        }
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
        const radius = this.cellSize * 0.42; // 稍微调大一点点，更饱满

        this.ctx.save();
        
        // 1. 绘制阴影 (Shadow)
        this.ctx.beginPath();
        this.ctx.arc(x + 2, y + 2, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fill();

        // 2. 绘制棋子主体 (Body)
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);

        // 设置径向渐变，模拟光照 (光源设定在左上偏上)
        // 参数: x0, y0, r0, x1, y1, r1
        // 光源点在棋子的左上方 (x - radius/3, y - radius/3)
        const gradient = this.ctx.createRadialGradient(
            x - radius / 3, y - radius / 3, radius / 10, // 内圆（高光中心）
            x, y, radius                                 // 外圆（棋子边缘）
        );

        if (player === 1) {
            // 黑子：模拟黑玉/玛瑙质感
            // 中心是深灰色反光，边缘是纯黑
            gradient.addColorStop(0, '#666666');
            gradient.addColorStop(0.3, '#222222');
            gradient.addColorStop(1, '#000000');
            this.ctx.fillStyle = gradient;
        } else {
            // 白子：模拟云子/贝壳质感
            // 中心是亮白，边缘是暖白/浅灰
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(0.3, '#F0F0F0');
            gradient.addColorStop(1, '#D0D0D0');
            this.ctx.fillStyle = gradient;
        }

        this.ctx.fill();

        // 3. 移除之前的描边逻辑，因为渐变已经自带立体感，描边会破坏真实感
        // 仅给白子加极淡的边缘线防止与背景混淆（如果背景太浅）
        if (player === 2) {
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    /**
     * 高亮最后一步
     */
    highlightLastMove(row, col) {
        const x = this.boardPadding + col * this.cellSize;
        const y = this.boardPadding + row * this.cellSize;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#ff3333'; // 更鲜艳的红
        this.ctx.lineWidth = 2;
        
        // 绘制一个小十字符号，而不是圆圈，这样更现代且不遮挡棋子质感
        const size = this.cellSize * 0.15;
        
        this.ctx.beginPath();
        // 横线
        this.ctx.moveTo(x - size, y);
        this.ctx.lineTo(x + size, y);
        // 竖线
        this.ctx.moveTo(x, y - size);
        this.ctx.lineTo(x, y + size);
        
        this.ctx.stroke();
        
        // 再加一个小圆点在中心，颜色反转
        this.ctx.fillStyle = '#ff3333';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
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

        // 服务器状态已同步，清除本地预落子
        this.pendingMove = null;
    }

    /**
     * 绘制在线模式下的预落子效果（轻量高亮）
     */
    drawPendingMove(row, col) {
        const x = this.boardPadding + col * this.cellSize;
        const y = this.boardPadding + row * this.cellSize;

        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.cellSize * 0.35, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            // 这是一个备用方案，主要用于PC端鼠标点击
            // 移动端由于会有300ms延迟，主要依靠 touchend 处理
            // 这里我们可以通过检测最近是否有 touch 事件来避免重复触发
            if (this.lastTouchTime && Date.now() - this.lastTouchTime < 500) {
                return;
            }
            
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

        // 触摸开始：记录坐标
        this.canvas.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            this.touchStartX = t.clientX;
            this.touchStartY = t.clientY;
            // 注意：这里不再调用 preventDefault()，允许用户滑动页面
        }, { passive: true });

        // 触摸结束：判断是点击还是滑动
        this.canvas.addEventListener('touchend', (e) => {
            if (!this.network.isConnected || this.game.getState() !== 'playing') {
                return;
            }
            
            const t = e.changedTouches[0];
            const touchEndX = t.clientX;
            const touchEndY = t.clientY;
            
            // 计算移动距离
            const dx = touchEndX - this.touchStartX;
            const dy = touchEndY - this.touchStartY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 如果移动距离小于 10px，视为点击
            if (distance < 10) {
                this.lastTouchTime = Date.now();
                
                // 阻止默认事件（如鼠标模拟点击），防止点透
                if (e.cancelable) {
                    e.preventDefault();
                }
                
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                const x = (touchEndX - rect.left) * scaleX;
                const y = (touchEndY - rect.top) * scaleY;
                let col = Math.round((x - this.boardPadding) / this.cellSize);
                let row = Math.round((y - this.boardPadding) / this.cellSize);
                col = Math.max(0, Math.min(this.boardSize - 1, col));
                row = Math.max(0, Math.min(this.boardSize - 1, row));
                this.handleCellClick(row, col);
            }
        }, { passive: false });
        
        // 仅在支持鼠标的设备上监听 mousemove，避免移动端性能损耗
        if (window.matchMedia('(hover: hover)').matches) {
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
    }
    
    /**
     * 处理格子点击
     */
    handleCellClick(row, col) {
        // 先判断当前是否处于“在线房间模式”
        const inOnlineRoom =
            this.network &&
            this.network.isConnected &&
            typeof this.network.getRoomId === 'function' &&
            this.network.getRoomId();

        if (inOnlineRoom) {
            // 在线模式：完全由服务器裁决是否能落子以及轮到谁
            // 避免连续快速点击产生多个“待确认”高亮
            if (!this.pendingMove) {
                this.pendingMove = { row, col };
                this.drawPendingMove(row, col);
            }
            this.network.makeMove(row, col);
            return;
        }

        // 本地/离线模式：使用前端 GobangGame 进行完整落子和判定
        if (!this.game.canMakeMove(row, col)) {
            return;
        }

        const current = this.game.getCurrentPlayer();
        const result = this.game.makeMove(row, col, current);

        if (result && result.success) {
            this.drawPiece(row, col, current);
            this.highlightLastMove(row, col);
            this.playMoveSound();
            this.updateTurnIndicator();

            if (result.gameOver) {
                if (result.winner) {
                    const winnerPlayer = result.winner; // 1=黑,2=白
                    if (this.localScores[winnerPlayer] !== undefined) {
                        this.localScores[winnerPlayer] += 1;
                    }
                    this.updateScores(this.localScores);

                    const winnerInfo = {
                        player: winnerPlayer,
                        playerName: winnerPlayer === 1 ? '黑方' : '白方',
                        winningLine: []
                    };
                    this.showGameOver(winnerInfo);
                } else {
                    this.showGameOver(null);
                }
            }
        }
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
