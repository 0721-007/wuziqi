/** 首页逻辑 */
const { getGameStats, getGameSettings, getLocalGameRecords } = require('../../utils/storage');
const { formatTime, formatDuration, calculateWinRate, calculateLevel } = require('../../utils/common');

Page({
  data: {
    userInfo: null,
    userLevel: 1,
    winRate: '0.0%',
    currentStreak: 0,
    difficultyIndex: 1,
    difficultyOptions: ['简单', '中等', '困难'],
    currentDifficulty: '中等',
    onlineUsers: 128,
    lastGameTime: '未开始',
    recentGames: [],
    achievements: []
  },

  onLoad() {
    this.loadUserData();
    this.loadGameData();
    this.updateOnlineUsers();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadUserData();
    this.loadGameData();
  },

  /**
   * 加载用户数据
   */
  loadUserData() {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    if (userInfo) {
      this.setData({ userInfo });
    } else {
      // 尝试获取用户信息
      wx.getUserInfo({
        success: (res) => {
          app.globalData.userInfo = res.userInfo;
          this.setData({ userInfo: res.userInfo });
        },
        fail: () => {
          // 用户未授权，使用默认信息
          this.setData({
            userInfo: {
              nickName: '游客',
              avatarUrl: '/assets/icons/default-avatar.png'
            }
          });
        }
      });
    }
  },

  /**
   * 加载游戏数据
   */
  loadGameData() {
    const gameStats = getGameStats();
    const gameSettings = getGameSettings();
    const recentGames = this.getRecentGames();
    const achievements = this.getRecentAchievements();

    const winRate = calculateWinRate(gameStats.winGames, gameStats.totalGames);
    const userLevel = calculateLevel(gameStats.totalGames, parseFloat(winRate));

    this.setData({
      userLevel,
      winRate,
      currentStreak: gameStats.currentWinStreak,
      difficultyIndex: this.getDifficultyIndex(gameSettings.aiDifficulty),
      currentDifficulty: this.getDifficultyText(gameSettings.aiDifficulty),
      recentGames,
      achievements
    });

    this.updateLastGameTime(gameStats.lastGameDate);
  },

  /**
   * 获取最近游戏记录
   */
  getRecentGames() {
    const records = getLocalGameRecords();
    return records.slice(0, 3).map(record => ({
      id: record.id || Date.now(),
      result: record.result,
      opponent: record.opponent || '未知对手',
      date: this.formatGameDate(record.timestamp || record.date),
      duration: formatDuration(record.duration || 0)
    }));
  },

  /**
   * 获取最近成就
   */
  getRecentAchievements() {
    const gameStats = getGameStats();
    const achievements = [];

    // 根据统计数据生成成就
    if (gameStats.totalGames >= 10) {
      achievements.push({
        id: 'first_10_games',
        name: '初出茅庐',
        description: '完成10局游戏',
        icon: '🎯',
        rarity: 'common'
      });
    }

    if (gameStats.maxWinStreak >= 5) {
      achievements.push({
        id: 'win_streak_5',
        name: '连胜高手',
        description: '获得5连胜',
        icon: '🔥',
        rarity: 'rare'
      });
    }

    if (gameStats.winGames >= 50) {
      achievements.push({
        id: 'win_50_games',
        name: '胜利之师',
        description: '获得50场胜利',
        icon: '👑',
        rarity: 'epic'
      });
    }

    return achievements.slice(0, 2); // 只显示最近的2个成就
  },

  /**
   * 格式化游戏日期
   */
  formatGameDate(dateStr) {
    if (!dateStr) return '刚刚';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    
    return formatTime(date.getTime(), 'MM-DD');
  },

  /**
   * 更新最后游戏时间
   */
  updateLastGameTime(lastGameDate) {
    if (!lastGameDate) {
      this.setData({ lastGameTime: '未开始' });
      return;
    }
    
    const text = this.formatGameDate(lastGameDate);
    this.setData({ lastGameTime: text });
  },

  /**
   * 获取难度索引
   */
  getDifficultyIndex(difficulty) {
    const map = { easy: 0, medium: 1, hard: 2 };
    return map[difficulty] || 1;
  },

  /**
   * 获取难度文本
   */
  getDifficultyText(difficulty) {
    const map = { easy: '简单', medium: '中等', hard: '困难' };
    return map[difficulty] || '中等';
  },

  /**
   * 更新在线用户数（模拟）
   */
  updateOnlineUsers() {
    // 这里应该调用真实的API获取在线用户数
    const baseUsers = 100;
    const variation = Math.floor(Math.random() * 50) - 25;
    this.setData({
      onlineUsers: baseUsers + variation
    });
    
    // 每30秒更新一次
    setTimeout(() => {
      this.updateOnlineUsers();
    }, 30000);
  },

  /**
   * 难度选择变化
   */
  onDifficultyChange(e) {
    const index = parseInt(e.detail.value);
    const difficulties = ['easy', 'medium', 'hard'];
    const difficulty = difficulties[index];
    
    this.setData({
      difficultyIndex: index,
      currentDifficulty: this.getDifficultyText(difficulty)
    });
    
    // 保存到设置
    const gameSettings = getGameSettings();
    gameSettings.aiDifficulty = difficulty;
    getApp().globalData.gameConfig.aiDifficulty = difficulty;
  },

  /**
   * 开始AI游戏
   */
  startAIGame() {
    wx.navigateTo({
      url: '/pages/game/game?mode=ai'
    });
  },

  /**
   * 前往多人游戏
   */
  goToMultiplayer() {
    wx.navigateTo({
      url: '/pages/multiplayer/multiplayer'
    });
  },

  /**
   * 快速开始
   */
  startQuickGame() {
    const gameSettings = getGameSettings();
    const mode = gameSettings.quickGameMode || 'ai';
    
    if (mode === 'ai') {
      this.startAIGame();
    } else {
      this.goToMultiplayer();
    }
  },

  /**
   * 前往排行榜
   */
  goToRank() {
    wx.switchTab({
      url: '/pages/rank/rank'
    });
  },

  /**
   * 前往历史记录
   */
  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  /**
   * 前往教程
   */
  goToTutorial() {
    wx.navigateTo({
      url: '/pages/tutorial/tutorial'
    });
  },

  /**
   * 前往设置
   */
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  /**
   * 复盘游戏
   */
  reviewGame(e) {
    const game = e.currentTarget.dataset.game;
    // 这里应该实现复盘功能
    wx.showToast({
      title: '复盘功能开发中',
      icon: 'none'
    });
  },

  /**
   * 分享功能
   */
  onShareAppMessage() {
    return {
      title: '来挑战五子棋吧！',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-image.png'
    };
  }
});