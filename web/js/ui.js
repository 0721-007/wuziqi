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
        // 落子延迟定时器
        this.moveTimer = null;
        // 当前玩家的编号（1=黑，2=白），用于在线模式身份校验
        this.myPlayerNumber = null;
        
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
     * 播放胜利音效 (C大调琶音: C4 E4 G4 C5)
     */
    playWinSound() {
        if (!this.audioCtx) return;
        
        const now = this.audioCtx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        
        notes.forEach((freq, i) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            osc.type = 'triangle'; // 三角波，声音比较明亮
            osc.frequency.value = freq;
            
            // 琶音效果：每个音符间隔 0.1s
            const startTime = now + i * 0.1;
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });
    }

    /**
     * 绘制获胜特效
     */
    drawWinningEffects(winningLine) {
        this.ctx.save();
        
        // 金色发光设定
        this.ctx.shadowColor = '#FFD700'; // 金色
        this.ctx.shadowBlur = 20;
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        
        winningLine.forEach(([row, col]) => {
            const x = this.boardPadding + col * this.cellSize;
            const y = this.boardPadding + row * this.cellSize;
            
            // 1. 画一个金色圆环
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.cellSize * 0.45, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // 2. 画一个中心高亮点
            this.ctx.beginPath();
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
            this.ctx.arc(x, y, this.cellSize * 0.2, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // 3. 画连线贯穿
        if (winningLine.length > 1) {
            this.ctx.beginPath();
            this.ctx.lineWidth = 4;
            this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
            
            const start = winningLine[0];
            const end = winningLine[winningLine.length - 1];
            
            this.ctx.moveTo(
                this.boardPadding + start[1] * this.cellSize, 
                this.boardPadding + start[0] * this.cellSize
            );
            this.ctx.lineTo(
                this.boardPadding + end[1] * this.cellSize, 
                this.boardPadding + end[0] * this.cellSize
            );
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    /**
     * 设置画布
     */
    setupCanvas() {
        const parent = this.canvas.parentElement;
        // 获取父容器的实际宽度（CSS像素）
        const parentWidth = parent ? parent.clientWidth : (window.innerWidth - 40);
        
        // 计算理想的格子大小，确保能放下
        // boardPadding 设为较小值，适应手机屏幕
        this.boardPadding = 15;
        const idealCell = Math.floor((parentWidth - this.boardPadding * 2) / this.boardSize);
        
        // 限制格子大小范围
        this.cellSize = Math.max(20, Math.min(45, idealCell));
        
        // 计算 Canvas 的逻辑宽高 (CSS像素)
        const logicWidth = this.boardSize * this.cellSize + this.boardPadding * 2;
        const logicHeight = logicWidth; // 正方形

        // Retina 屏幕适配
        const dpr = window.devicePixelRatio || 1;
        
        // 设置 Canvas 的物理像素尺寸 (更清晰)
        this.canvas.width = logicWidth * dpr;
        this.canvas.height = logicHeight * dpr;
        
        // 设置 Canvas 的 CSS 尺寸 (逻辑尺寸)
        this.canvas.style.width = `${logicWidth}px`;
        this.canvas.style.height = `${logicHeight}px`;
        
        // 重置变换矩阵，确保 scale 不会叠加
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        // 应用缩放，让后续绘图指令直接使用逻辑坐标
        this.ctx.scale(dpr, dpr);
        
        this.drawBoard();
        
        // 监听窗口大小改变，重新调整
        // 移除旧的监听器（防止重复添加暂不处理，简单通过覆盖）
        window.onresize = () => {
            this.setupCanvas();
            this.updateBoard();
        };
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 通用点击处理函数
        const handleInput = (clientX, clientY) => {
            if (!this.network.isConnected || this.game.getState() !== 'playing') {
                return;
            }
            
            const rect = this.canvas.getBoundingClientRect();
            
            // 获取相对于 Canvas 左上角的 CSS 像素坐标
            // 关键修复：这里不需要乘 dpr，因为我们所有的逻辑计算（cellSize等）都是基于 CSS 像素的
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            
            // 计算行列
            // 加上 0.5 是为了四舍五入更自然
            let col = Math.round((x - this.boardPadding) / this.cellSize);
            let row = Math.round((y - this.boardPadding) / this.cellSize);
            
            // 边界检查
            if (col >= 0 && col < this.boardSize && row >= 0 && row < this.boardSize) {
                // 增加点击范围容错：检查点击点是否真的在交叉点附近
                // 比如点击范围在交叉点半径 40% 以内才算有效，防止误触
                const centerX = this.boardPadding + col * this.cellSize;
                const centerY = this.boardPadding + row * this.cellSize;
                const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                
                if (dist < this.cellSize * 0.6) { // 稍微宽松一点，60%
                    this.handleCellClick(row, col);
                }
            }
        };

        this.canvas.addEventListener('click', (e) => {
            // PC端点击
            // 如果最近有过 touch 事件，忽略 click 防止双重触发
            if (this.lastTouchTime && Date.now() - this.lastTouchTime < 500) return;
            handleInput(e.clientX, e.clientY);
        });

        // 触摸事件处理
        this.canvas.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            this.touchStartX = t.clientX;
            this.touchStartY = t.clientY;
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (!this.network.isConnected || this.game.getState() !== 'playing') return;
            
            const t = e.changedTouches[0];
            const dx = t.clientX - this.touchStartX;
            const dy = t.clientY - this.touchStartY;
            
            // 判断是否是点击（位移很小）
            if (Math.sqrt(dx*dx + dy*dy) < 10) {
                this.lastTouchTime = Date.now();
                if (e.cancelable) e.preventDefault();
                handleInput(t.clientX, t.clientY);
            }
        }, { passive: false });
        
        // 鼠标悬停效果
        if (window.matchMedia('(hover: hover)').matches) {
            this.canvas.addEventListener('mousemove', (e) => {
                // 简单判断是否在范围内，改变光标
                this.canvas.style.cursor = 'pointer';
            });
        }
    }
    
    /**
     * 处理格子点击
     */
    handleCellClick(row, col) {
        // 如果游戏没开始，或者不是你的回合，直接忽略
        if (this.game.getState() !== 'playing') return;

        // 检查是否轮到当前客户端对应的玩家操作
        // 在线模式下，需要校验 network.playerId 是否对应当前回合
        const inOnlineRoom =
            this.network &&
            this.network.isConnected &&
            typeof this.network.getRoomId === 'function' &&
            this.network.getRoomId();

        if (inOnlineRoom) {
            // 必须已确定身份
            if (this.myPlayerNumber === null) {
                console.warn('尚未确定玩家身份，禁止操作');
                return;
            }
            // 必须轮到自己
            if (this.myPlayerNumber !== this.game.getCurrentPlayer()) {
                return;
            }
        }

        if (!this.game.canMakeMove(row, col)) return;

        // 1. 清除之前的定时器（如果有），这就实现了“后悔”机制
        if (this.moveTimer) {
            clearTimeout(this.moveTimer);
            this.moveTimer = null;
        }

        // 2. 更新虚影位置
        this.pendingMove = { row, col };
        this.playMoveSound(); // 播放选点音效
        this.updateBoard(); // 重绘以显示虚影

        // 3. 启动延迟落子定时器 (600ms)
        this.moveTimer = setTimeout(() => {
            // 再次检查是否还能落子（防止这几百毫秒内游戏状态变了）
            if (this.game.getState() === 'playing' && this.game.canMakeMove(row, col)) {
                this.executeMove(row, col);
                // 落子后清除虚影和定时器引用
                this.pendingMove = null;
                this.moveTimer = null; // 注意：这里不需要 clearTimeout，因为是定时器内部执行的
                this.updateBoard();
            }
        }, 600);
    }

    /**
     * 执行真正的落子逻辑
     */
    executeMove(row, col) {
        // 判断当前是否处于“在线房间模式”
        const inOnlineRoom =
            this.network &&
            this.network.isConnected &&
            typeof this.network.getRoomId === 'function' &&
            this.network.getRoomId();

        const current = this.game.getCurrentPlayer();

        if (inOnlineRoom) {
            // 乐观更新策略 (Optimistic Update)：
            // 1. 先在本地假装落子成功，让用户感觉"零延迟"
            const localResult = this.game.makeMove(row, col, current);
            if (localResult && localResult.success) {
                this.drawPiece(row, col, current);
                this.highlightLastMove(row, col);
                this.playMoveSound();
                this.updateTurnIndicator();
                
                // 记录这一步是乐观更新的，用于后续校对
                this.lastOptimisticMove = { row, col, player: current };
            }

            // 2. 再发送给服务器
            this.network.makeMove(row, col);
        } else {
            // 本地模式：直接落子
            const result = this.game.makeMove(row, col, current);

            if (result && result.success) {
                this.drawPiece(row, col, current);
                this.highlightLastMove(row, col);
                this.playMoveSound();
                this.updateTurnIndicator();

                if (result.gameOver) {
                    if (result.winner) {
                        const winnerPlayer = result.winner;
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
        
        // 确定我自己的身份
        const myId = this.network.getPlayerId();
        if (myId) {
            const me = players.find(p => p.playerId === myId);
            if (me) {
                this.myPlayerNumber = me.playerNumber;
            }
        }
        
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
     * 显示开局提示 Toast
     */
    showGameStartModal(message) {
        // 移除旧的提示（如果有）
        const oldToast = document.querySelector('.game-start-toast');
        if (oldToast) {
            oldToast.remove();
        }

        // 创建新 Toast
        const toast = document.createElement('div');
        toast.className = 'game-start-toast';
        toast.innerHTML = `<i class="fas fa-chess-board"></i> <span>${message}</span>`;
        document.body.appendChild(toast);

        // 强制重绘，触发动画
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // 3秒后自动消失
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 500);
        }, 3000);
    }

    /**
     * 显示游戏结束弹窗
     */
    showGameOver(winner) {
        console.log('显示游戏结束弹窗, winner:', winner);
        
        // 尝试补全 winningLine (兜底逻辑)
        if (winner && !winner.winningLine) {
            const lastMove = this.game.getLastMove();
            if (lastMove) {
                // 手动计算获胜连线
                const line = this.game.getWinningLine(lastMove.row, lastMove.col, winner.player);
                if (line && line.length >= 5) {
                    console.log('前端手动计算获胜连线成功:', line);
                    winner.winningLine = line;
                }
            }
        }

        // 播放胜利音效
        if (winner) {
            this.playWinSound();
            // 保存获胜连线，供重绘使用
            if (winner.winningLine) {
                console.log('获胜连线:', winner.winningLine);
                this.winningLine = winner.winningLine;
                this.updateBoard(); // 立即重绘以显示金光特效
            }
        }

        const modal = document.getElementById('gameOverModal');
        const gameResult = document.getElementById('gameResult');
        const gameResultDetail = document.getElementById('gameResultDetail');
        
        if (winner) {
            gameResult.textContent = 'VICTORY!';
            gameResult.style.color = '#D2691E'; // 金棕色
            gameResultDetail.textContent = `${winner.playerName} 获胜！`;
        } else {
            gameResult.textContent = '平局！';
            gameResult.style.color = '#666';
            gameResultDetail.textContent = '双方势均力敌';
        }
        
        modal.style.display = 'flex'; // 强制显示
        // 稍微延迟一点加show类，以触发transition动画
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
    
    /**
     * 隐藏游戏结束弹窗
     */
    hideGameOverModal() {
        const modal = document.getElementById('gameOverModal');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
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
        this.winningLine = null; // 清除获胜特效
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
