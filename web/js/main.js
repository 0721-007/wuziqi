/** 主程序入口 - main.js **/

// 全局变量
let game;
let network;
let ui;
let chat;

/**
 * 页面加载完成后初始化游戏
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('正在初始化游戏...');
    
    // 检查Socket.IO是否加载成功
    if (typeof io === 'undefined') {
        console.error('Socket.IO库加载失败！');
        alert('网络连接库加载失败，请刷新页面重试');
        return;
    }
    
    initGame();
    setupEventListeners();
});

/**
 * 初始化游戏
 */
function initGame() {
    console.log('正在初始化游戏...');
    game = new GobangGame();
    network = new NetworkManager();
    ui = new GameUI(game, network);
    chat = new ChatManager(network);
    
    // 初始化UI状态
    ui.showWaitingOverlay();
    updateConnectionStatus(false);
    
    // 连接到服务器
    network.connect();
    
    console.log('游戏初始化完成');
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 网络事件监听
    network.on('connect', function(data) {
        console.log('连接成功:', data);
        updateConnectionStatus(true);
        
        // 连接成功后，等待用户手动创建或加入房间
        chat.addSystemMessage('已连接到服务器，请创建房间或加入房间');
    });
    
    network.on('disconnect', function(data) {
        console.log('连接断开:', data);
        updateConnectionStatus(false);
    });
    
    network.on('roomCreated', function(data) {
        console.log('房间创建成功:', data);
        ui.updateRoomId(data.roomId);
        chat.addSystemMessage(`房间创建成功，房间号: ${data.roomId}`);
        chat.addSystemMessage('等待其他玩家加入...');

        const playerName = prompt('请输入您的昵称:') || '玩家';
        network.joinRoom(data.roomId, playerName);
    });
    
    network.on('playerJoined', function(roomInfo) {
        console.log('玩家加入房间:', roomInfo);
        ui.updatePlayers(roomInfo.players);
        ui.updateScores(roomInfo.scores);
        chat.addSystemMessage('有玩家加入了房间');
    });

    // 服务器通知游戏开始（更稳妥）
    network.on('gameStart', function(roomInfo) {
        console.log('接收服务器游戏开始事件', roomInfo);
        ui.updatePlayers(roomInfo.players);
        ui.updateScores(roomInfo.scores);
        game.startGame();
        ui.hideWaitingOverlay();
        
        // 查找黑方名字
        const blackPlayer = roomInfo.players.find(p => p.playerNumber === 1);
        const blackName = blackPlayer ? blackPlayer.name : '黑方';
        ui.showGameStartModal(`游戏开始！${blackName} 先行`);
        
        chat.addSystemMessage('游戏开始！黑子先行');
    });

    network.on('gameRestarted', function(roomInfo) {
        console.log('接收服务器游戏重置事件', roomInfo);
        game.resetGame();
        ui.resetUI();
        ui.updateScores(roomInfo.scores);
        ui.hideWaitingOverlay();
        
        // 查找黑方名字
        const blackPlayer = roomInfo.players && roomInfo.players.find(p => p.playerNumber === 1);
        const blackName = blackPlayer ? blackPlayer.name : '黑方';
        ui.showGameStartModal(`新一局开始！${blackName} 先行`);
        
        chat.addSystemMessage('新一局开始，黑子先行');
    });
    
    network.on('playerLeft', function(roomInfo) {
        console.log('玩家离开房间:', roomInfo);
        ui.updatePlayers(roomInfo.players);
        ui.updateScores(roomInfo.scores);
        chat.addSystemMessage('有玩家离开了房间');
        ui.showWaitingOverlay();
        game.resetGame();
    });
    
    network.on('moveMade', function(roomInfo) {
        console.log('棋子移动:', roomInfo);
        console.log('当前比分（来自服务器）:', roomInfo.scores);
        
        // 采用服务器权威状态，避免重复应用本地乐观更新
        game.setGameState(roomInfo.gameState);
        ui.updateBoard();

        // 检查是否是刚才本地乐观更新的那一步
        const serverLastMove = roomInfo.gameState.moveHistory[roomInfo.gameState.moveHistory.length - 1];
        const isMyOptimisticMove = ui.lastOptimisticMove && 
            serverLastMove &&
            serverLastMove.row === ui.lastOptimisticMove.row && 
            serverLastMove.col === ui.lastOptimisticMove.col;

        // 如果不是我自己刚刚下的那一步（即对手下的，或者乐观更新失败回滚后的），才播放声音
        // 这样避免了自己下棋听到两声响
        if (!isMyOptimisticMove) {
            ui.playMoveSound();
        }

        // 清除乐观更新标记
        ui.lastOptimisticMove = null;

        // 已收到服务器权威落子结果，清除本地预落子状态（如果有）
        if (ui.pendingMove) {
            ui.pendingMove = null;
        }
        ui.updateTurnIndicator();
        ui.updateScores(roomInfo.scores);
        
        // 检查游戏是否结束
        const winnerInfo = roomInfo.gameState && roomInfo.gameState.winner;
        if (winnerInfo) {
            // winnerInfo 来自服务端：{ player, playerName, winningLine }
            game.endGame(winnerInfo.player);
            ui.showGameOver(winnerInfo);

            const sideText = winnerInfo.player === 1 ? '黑方' : '白方';
            const namePart = winnerInfo.playerName ? `（${winnerInfo.playerName}）` : '';
            chat.addSystemMessage(`游戏结束！${sideText}${namePart} 获胜！`);
        }
    });
    
    // 聊天消息渲染由 ChatManager 统一处理，避免重复渲染
    
    network.on('error', function(error) {
        console.error('网络错误:', error);
        chat.addSystemMessage(`错误: ${error.message}`);
        
        if (error.type === 'joinRoom') {
            alert('加入房间失败: ' + error.message);
        }
    });
    
    // UI事件监听
    document.getElementById('connectBtn').addEventListener('click', function() {
        console.log('手动重新连接...');
        network.connect();
    });
    
    document.getElementById('testBtn').addEventListener('click', function() {
        console.log('测试按钮点击');
        console.log('网络状态:', network.getConnectionStatus());
        console.log('Socket.IO状态:', typeof io);
        alert('网络状态已输出到控制台，请查看');
    });
    
    document.getElementById('shareRoom').addEventListener('click', function() {
        shareRoom();
    });
    
    document.getElementById('newRoomBtn').addEventListener('click', function() {
        console.log('新建房间按钮被点击');
        console.log('网络连接状态:', network.isConnected);
        console.log('网络对象:', network);
        createNewRoom();
    });
    
    document.getElementById('restartBtn').addEventListener('click', function() {
        restartGame();
    });
    
    document.getElementById('undoBtn').addEventListener('click', function() {
        undoMove();
    });
    
    document.getElementById('sendBtn').addEventListener('click', function() {
        sendChatMessage();
    });
    
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    document.getElementById('closeModal').addEventListener('click', function() {
        ui.hideGameOverModal();
    });
    
    document.getElementById('playAgainBtn').addEventListener('click', function() {
        restartGame();
        ui.hideGameOverModal();
    });
    
    document.getElementById('closeShareModal').addEventListener('click', function() {
        ui.hideShareModal();
    });
    
    document.getElementById('copyLink').addEventListener('click', function() {
        copyShareLink();
    });
}

/**
 * 更新连接状态
 */
function updateConnectionStatus(connected) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (statusDot && statusText) {
        if (connected) {
            statusDot.className = 'status-dot connected';
            statusText.textContent = '已连接';
        } else {
            statusDot.className = 'status-dot disconnected';
            statusText.textContent = '未连接';
        }
    }
}

/**
 * 创建新房间
 */
function createNewRoom() {
    console.log('创建新房间...');
    console.log('网络连接状态:', network.isConnected);
    
    if (!network.isConnected) {
        alert('请先连接到服务器');
        return;
    }
    
    // 重置游戏状态
    game.resetGame();
    ui.resetUI();
    ui.showWaitingOverlay();
    
    // 创建房间
    const result = network.createRoom();
    console.log('创建房间结果:', result);
    
    if (result) {
        chat.addSystemMessage('正在创建房间...');
    } else {
        chat.addSystemMessage('创建房间失败，请重试');
    }
}

/**
 * 分享房间
 */
function shareRoom() {
    const roomId = network.getRoomId();
    if (!roomId) {
        alert('请先创建房间');
        return;
    }
    
    const shareUrl = `${window.location.origin}?room=${roomId}`;
    ui.showShareModal(shareUrl);
}

/**
 * 复制分享链接
 */
function copyShareLink() {
    const shareLink = document.getElementById('shareLink');
    if (shareLink) {
        shareLink.select();
        document.execCommand('copy');
        
        // 显示复制成功提示
        const copyBtn = document.getElementById('copyLink');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '已复制!';
        copyBtn.style.background = '#4CAF50';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '';
        }, 2000);
    }
}

/**
 * 重新开始游戏
 */
function restartGame() {
    console.log('重新开始游戏');
    if (network.getRoomId()) {
        network.restartGame();
    } else {
        game.resetGame();
        ui.resetUI();
        chat.addSystemMessage('游戏重新开始');
    }
}

/**
 * 悔棋
 */
function undoMove() {
    console.log('悔棋功能');
    // 这里可以实现悔棋逻辑
    alert('悔棋功能开发中...');
}

/**
 * 发送聊天消息
 */
function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) {
        return;
    }
    
    if (!network.isConnected) {
        alert('请先连接到服务器');
        return;
    }
    
    if (!network.getRoomId()) {
        alert('请先创建房间');
        return;
    }
    
    network.sendChatMessage(message);
    chatInput.value = '';
}

/**
 * 处理URL参数（房间号）
 */
function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId) {
        console.log('检测到房间号:', roomId);
        
        // 延迟加入房间，等待连接建立
        setTimeout(() => {
            if (network.isConnected) {
                const playerName = prompt('请输入您的昵称:') || '玩家';
                network.joinRoom(roomId, playerName);
            }
        }, 2000);
    }
}

// 处理URL参数
handleUrlParams();
