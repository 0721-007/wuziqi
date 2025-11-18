/** 游戏状态栏组件逻辑 */

Component({
  properties: {
    // 当前玩家 (1: 黑子, 2: 白子)
    currentPlayer: {
      type: Number,
      value: 1
    },
    // 黑子玩家信息
    blackPlayer: {
      type: Object,
      value: {
        name: '玩家',
        avatar: '/assets/icons/black-piece.png'
      }
    },
    // 白子玩家信息
    whitePlayer: {
      type: Object,
      value: {
        name: '电脑',
        avatar: '/assets/icons/white-piece.png'
      }
    },
    // 游戏状态
    gameStatus: {
      type: String,
      value: 'playing' // playing, finished, paused
    },
    // 当前回合数
    currentRound: {
      type: Number,
      value: 1
    },
    // 游戏时间（秒）
    gameTime: {
      type: String,
      value: '00:00'
    },
    // AI难度
    aiDifficulty: {
      type: String,
      value: '' // easy, medium, hard
    },
    // 是否可以悔棋
    canUndo: {
      type: Boolean,
      value: false
    },
    // 是否可以提示
    canHint: {
      type: Boolean,
      value: false
    },
    // 状态消息
    statusMessage: {
      type: String,
      value: ''
    },
    // 状态消息类型
    statusMessageType: {
      type: String,
      value: 'info' // info, success, warning, error
    },
    // 状态操作按钮文本
    statusActionText: {
      type: String,
      value: '确定'
    }
  },

  data: {
    gameStatusText: '对局中',
    aiDifficultyText: '中等'
  },

  observers: {
    'gameStatus': function(status) {
      this.updateGameStatusText(status);
    },
    'aiDifficulty': function(difficulty) {
      this.updateAiDifficultyText(difficulty);
    }
  },

  methods: {
    /**
     * 更新游戏状态文本
     */
    updateGameStatusText(status) {
      let statusText = '对局中';
      switch (status) {
        case 'playing':
          statusText = '对局中';
          break;
        case 'finished':
          statusText = '游戏结束';
          break;
        case 'paused':
          statusText = '暂停中';
          break;
        case 'thinking':
          statusText = '思考中';
          break;
      }
      this.setData({ gameStatusText: statusText });
    },

    /**
     * 更新AI难度文本
     */
    updateAiDifficultyText(difficulty) {
      let difficultyText = '中等';
      switch (difficulty) {
        case 'easy':
          difficultyText = '简单';
          break;
        case 'medium':
          difficultyText = '中等';
          break;
        case 'hard':
          difficultyText = '困难';
          break;
      }
      this.setData({ aiDifficultyText: difficultyText });
    },

    /**
     * 悔棋按钮点击
     */
    onUndo() {
      if (this.data.canUndo) {
        this.triggerEvent('undo');
      }
    },

    /**
     * 提示按钮点击
     */
    onHint() {
      if (this.data.canHint) {
        this.triggerEvent('hint');
      }
    },

    /**
     * 设置按钮点击
     */
    onSettings() {
      this.triggerEvent('settings');
    },

    /**
     * 状态操作按钮点击
     */
    onStatusAction() {
      this.triggerEvent('statusaction');
    },

    /**
     * 显示状态消息
     */
    showStatusMessage(message, type = 'info', duration = 3000) {
      this.setData({
        statusMessage: message,
        statusMessageType: type,
        showStatusMessage: true
      });

      if (duration > 0) {
        setTimeout(() => {
          this.hideStatusMessage();
        }, duration);
      }
    },

    /**
     * 隐藏状态消息
     */
    hideStatusMessage() {
      this.setData({
        showStatusMessage: false,
        statusMessage: '',
        statusMessageType: 'info'
      });
    }
  }
});