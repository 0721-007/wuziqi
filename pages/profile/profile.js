const app = getApp();
const storage = require('../../utils/storage.js');

Page({
  data: {
    loading: true,
    isLoggedIn: false,
    userInfo: {
      nickName: '',
      avatarUrl: '',
      userId: ''
    },
    userStats: {
      totalGames: 0,
      winRate: 0,
      currentScore: 0,
      maxWinStreak: 0
    },
    gameStats: {
      ai: { games: 0, wins: 0, winRate: 0 },
      online: { games: 0, wins: 0, winRate: 0 },
      friend: { games: 0, wins: 0, winRate: 0 }
    }
  },

  onLoad() {
    this.loadUserData();
  },

  onShow() {
    this.loadUserData();
  },

  // 加载用户数据
  loadUserData() {
    this.setData({ loading: true });
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    const isLoggedIn = !!(userInfo.nickName && userInfo.userId);
    
    // 获取游戏统计数据
    const gameStats = storage.getGameStats();
    const userStats = this.calculateUserStats(gameStats);
    
    this.setData({
      isLoggedIn,
      userInfo,
      userStats,
      gameStats,
      loading: false
    });
  },

  // 计算用户统计数据
  calculateUserStats(gameStats) {
    const totalGames = gameStats.ai.games + gameStats.online.games + gameStats.friend.games;
    const totalWins = gameStats.ai.wins + gameStats.online.wins + gameStats.friend.wins;
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    
    // 获取历史最高分等数据
    const historyData = wx.getStorageSync('gameHistory') || [];
    let maxWinStreak = 0;
    let currentStreak = 0;
    
    historyData.forEach(game => {
      if (game.result === 'win') {
        currentStreak++;
        maxWinStreak = Math.max(maxWinStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    
    return {
      totalGames,
      winRate,
      currentScore: gameStats.totalScore || 0,
      maxWinStreak
    };
  },

  // 编辑头像
  editAvatar() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        
        // 更新用户头像
        const userInfo = { ...this.data.userInfo, avatarUrl: tempFilePath };
        wx.setStorageSync('userInfo', userInfo);
        
        this.setData({
          userInfo
        });
        
        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '头像更新失败',
          icon: 'none'
        });
      }
    });
  },

  // 跳转到设置页面
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 跳转到对局记录
  goToGameHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  // 跳转到成就系统
  goToAchievements() {
    wx.navigateTo({
      url: '/pages/achievements/achievements'
    });
  },

  // 跳转到游戏教程
  goToTutorial() {
    wx.navigateTo({
      url: '/pages/tutorial/tutorial'
    });
  },

  // 分享战绩
  shareProfile() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  // 联系客服
  contactSupport() {
    wx.showModal({
      title: '联系客服',
      content: '如有问题，请发送邮件至：support@gobang.com\n我们将在24小时内回复您。',
      showCancel: false
    });
  },

  // 关于我们
  aboutApp() {
    wx.showModal({
      title: '关于五子棋',
      content: '版本：v1.0.0\n开发者：五子棋开发团队\n\n一款经典的五子棋游戏，支持人机对战、在线对战和好友对战。',
      showCancel: false
    });
  },

  // 登录
  login() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = {
          ...res.userInfo,
          userId: 'user_' + Date.now()
        };
        
        wx.setStorageSync('userInfo', userInfo);
        
        this.setData({
          isLoggedIn: true,
          userInfo
        });
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          
          this.setData({
            isLoggedIn: false,
            userInfo: {
              nickName: '',
              avatarUrl: '',
              userId: ''
            }
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 页面分享设置
  onShareAppMessage() {
    const { userInfo, userStats } = this.data;
    const title = userInfo.nickName 
      ? `${userInfo.nickName}的五子棋战绩：胜率${userStats.winRate}%，积分${userStats.currentScore}`
      : '来挑战我的五子棋战绩吧！';
    
    return {
      title,
      path: '/pages/profile/profile',
      imageUrl: '/images/share-profile.jpg'
    };
  },

  onShareTimeline() {
    const { userInfo, userStats } = this.data;
    
    return {
      title: userInfo.nickName 
        ? `${userInfo.nickName}的五子棋战绩：胜率${userStats.winRate}%，积分${userStats.currentScore}`
        : '来挑战我的五子棋战绩吧！',
      query: 'from=timeline'
    };
  }
});