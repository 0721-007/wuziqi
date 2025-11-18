/** 聊天管理模块 - chat.js **/

/**
 * 聊天管理器
 */
class ChatManager {
    constructor(networkManager) {
        this.network = networkManager;
        this.messages = [];
        this.maxMessages = 100;
        this.chatMessagesEl = document.getElementById('chatMessages');
        this.chatInputEl = document.getElementById('chatInput');
        
        this.setupEventListeners();
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听网络聊天消息
        this.network.on('chatMessage', (chatMessage) => {
            this.addMessage(chatMessage);
        });
    }
    
    /**
     * 添加消息
     */
    addMessage(messageData) {
        const message = {
            id: messageData.id || Date.now(),
            playerId: messageData.playerId,
            playerName: messageData.playerName,
            playerNumber: messageData.playerNumber,
            message: messageData.message,
            timestamp: messageData.timestamp || new Date(),
            isOwn: messageData.playerId === this.network.getPlayerId()
        };
        
        this.messages.push(message);
        
        // 限制消息数量
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
        
        this.renderMessage(message);
        this.scrollToBottom();
    }
    
    /**
     * 添加系统消息
     */
    addSystemMessage(message) {
        const systemMessage = {
            id: Date.now(),
            playerName: '系统',
            message: message,
            timestamp: new Date(),
            isSystem: true
        };
        
        this.messages.push(systemMessage);
        
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
        
        this.renderMessage(systemMessage);
        this.scrollToBottom();
    }
    
    /**
     * 渲染消息
     */
    renderMessage(message) {
        if (!this.chatMessagesEl) {
            return;
        }
        
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        
        if (message.isOwn) {
            messageEl.classList.add('own');
        } else if (message.isSystem) {
            messageEl.classList.add('system');
        }
        
        const time = new Date(message.timestamp).toLocaleTimeString();
        
        if (message.isSystem) {
            messageEl.innerHTML = `
                <div class="message-content">${this.escapeHtml(message.message)}</div>
            `;
        } else {
            messageEl.innerHTML = `
                <div class="message-header">
                    <span class="player-name">${this.escapeHtml(message.playerName)}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${this.escapeHtml(message.message)}</div>
            `;
        }
        
        this.chatMessagesEl.appendChild(messageEl);
    }
    
    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 滚动到底部
     */
    scrollToBottom() {
        if (this.chatMessagesEl) {
            this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
        }
    }
    
    /**
     * 清空聊天记录
     */
    clearMessages() {
        this.messages = [];
        if (this.chatMessagesEl) {
            this.chatMessagesEl.innerHTML = '';
        }
    }
    
    /**
     * 获取消息历史
     */
    getMessageHistory() {
        return this.messages;
    }
    
    /**
     * 发送消息
     */
    sendMessage(message) {
        if (!message || !message.trim()) {
            return false;
        }
        
        if (!this.network.isConnected || !this.network.getRoomId()) {
            this.addSystemMessage('请先加入房间再发送消息');
            return false;
        }
        
        return this.network.sendChatMessage(message);
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatManager;
} else {
    window.ChatManager = ChatManager;
}