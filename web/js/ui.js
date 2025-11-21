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
        const parentWidth = parent ? parent.clientWidth : (window.innerWidth - 40);
        const idealCell = Math.floor((parentWidth - this.boardPadding * 2) / this.boardSize);
        this.cellSize = Math.max(24, Math.min(40, idealCell));
        const width = this.boardSize * this.cellSize + this.boardPadding * 2;
        const height = this.boardSize * this.cellSize + this.boardPadding * 2;
        
        // Retina 屏幕适配 (DPI 缩放)
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        
        // 保持 CSS 尺寸不变
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        
        this.ctx.scale(dpr, dpr);
        
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
        // 注意：fillRect 的参数是逻辑像素，scale 会自动处理
        this.ctx.fillRect(0, 0, this.boardSize * this.cellSize + this.boardPadding * 2, this.boardSize * this.cellSize + this.boardPadding * 2);
        
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 1;
        
        // 绘制网格线
        for (let i = 0; i < this.boardSize; i++) {
            const x = this.boardPadding + i * this.cellSize;
            const y = this.boardPadding + i * this.cellSize;
            
            // 横线
            this.ctx.beginPath();
            this.ctx.moveTo(this.boardPadding, y);
            this.ctx.lineTo(this.boardSize * this.cellSize + this.boardPadding, y); // 修正为实际棋盘宽度
            this.ctx.stroke();
            
            // 竖线
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.boardPadding);
            this.ctx.lineTo(x, this.boardSize * this.cellSize + this.boardPadding); // 修正为实际棋盘高度
            this.ctx.stroke();
        }

        // 外边框
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.strokeRect(
            this.boardPadding,
            this.boardPadding,
            this.boardSize * this.cellSize, // 修正：不需要减 padding * 2，因为起点是 padding
            this.boardSize * this.cellSize
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
            // 黑子：模拟黑曜石/玻璃质感
            // 调整：高光点更亮（模拟反光），但过渡更快（主体纯黑）
            // 这样会看起来更有光泽，而不是灰蒙蒙的塑料感
            gradient.addColorStop(0, '#AAAAAA');  // 亮灰高光
            gradient.addColorStop(0.2, '#111111'); // 迅速变黑
            gradient.addColorStop(1, '#000000');   // 边缘纯黑
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
        
        // 高亮获胜连线（如果有）
        const winner = this.game.getWinner(); // 获取获胜方
        const gameState = this.game.getGameState(); // 为了获取 winningLine
        // 注意：game.getWinner() 返回的是数字(1或2)，server发来的 winner info 才有 winningLine
        // 我们需要从最近一次的 gameOver 结果或者 gameState 中找 winningLine
        // 这里的 gameState 是本地的，可能不全。
        // 实际上我们在 showGameOver 时接收了 winningLine，最好存在 this 上
        if (this.winningLine && this.winningLine.length > 0) {
            this.drawWinningEffects(this.winningLine);
        }
        
        // 高亮最后一步
        const lastMove = this.game.getLastMove();
        if (lastMove) {
            this.highlightLastMove(lastMove.row, lastMove.col);
        }

        // 绘制预落子（虚影）
        if (this.pendingMove) {
            this.drawPendingMove(this.pendingMove.row, this.pendingMove.col);
        }
    }

    /**
     * 绘制在线模式下的预落子效果（轻量高亮）
     */
    drawPendingMove(row, col) {
        const x = this.boardPadding + col * this.cellSize;
        const y = this.boardPadding + row * this.cellSize;
        
        // 1. 绘制半透明棋子虚影
        this.ctx.save();
        this.ctx.globalAlpha = 0.6; // 半透明
        const currentPlayer = this.game.getCurrentPlayer();
        this.drawPiece(row, col, currentPlayer);
        this.ctx.restore();

        // 2. 绘制虚线框，表示"待确认"
        this.ctx.save();
        this.ctx.strokeStyle = '#ff3333'; // 红色虚线框，醒目
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.cellSize * 0.45, 0, Math.PI * 2); // 比棋子稍大一圈
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
