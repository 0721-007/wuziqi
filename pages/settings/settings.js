const app = getApp();

Page({
  data: {
    // 音效设置
    soundEnabled: true,
    musicEnabled: false,
    volume: 70,
    
    // 游戏设置
    aiDifficulties: [
      { name: '简单', value: 'easy' },
      { name: '中等', value: 'medium' },
      { name: '困难', value: 'hard' },
      { name: '专家', value: 'expert' }
    ],
    aiDifficultyIndex: 1,
    
    boardThemes: [
      { name: '经典', value: 'classic' },
      { name: '木质', value: 'wood' },
      { name: '大理石', value: 'marble' },
      { name: '现代', value: 'modern' }
    ],
    boardThemeIndex: 0,
    
    autoSave: true,
    showHints: true,
    animationEnabled: true,
    
    // 网络设置
    dataSavingMode: false,
    autoUpdate: true,
    
    // 隐私设置
    allowProfileView: true,
    receiveInvites: true,
    
    // 其他
    cacheSize: '0 KB',
    showToast: false,
    toastText: ''
  },

  onLoad() {
    this.loadSettings();
    this.calculateCacheSize();
  },

  // 加载设置
  loadSettings() {
    const settings = wx.getStorageSync('gameSettings') || {};
    
    this.setData({
      soundEnabled: settings.soundEnabled !== undefined ? settings.soundEnabled : true,
      musicEnabled: settings.musicEnabled !== undefined ? settings.musicEnabled : false,
      volume: settings.volume !== undefined ? settings.volume : 70,
      aiDifficultyIndex: settings.aiDifficultyIndex !== undefined ? settings.aiDifficultyIndex : 1,
      boardThemeIndex: settings.boardThemeIndex !== undefined ? settings.boardThemeIndex : 0,
      autoSave: settings.autoSave !== undefined ? settings.autoSave : true,
      showHints: settings.showHints !== undefined ? settings.showHints : true,
      animationEnabled: settings.animationEnabled !== undefined ? settings.animationEnabled : true,
      dataSavingMode: settings.dataSavingMode !== undefined ? settings.dataSavingMode : false,
      autoUpdate: settings.autoUpdate !== undefined ? settings.autoUpdate : true,
      allowProfileView: settings.allowProfileView !== undefined ? settings.allowProfileView : true,
      receiveInvites: settings.receiveInvites !== undefined ? settings.receiveInvites : true
    });
  },

  // 保存设置
  saveSettings() {
    const settings = {
      soundEnabled: this.data.soundEnabled,
      musicEnabled: this.data.musicEnabled,
      volume: this.data.volume,
      aiDifficultyIndex: this.data.aiDifficultyIndex,
      boardThemeIndex: this.data.boardThemeIndex,
      autoSave: this.data.autoSave,
      showHints: this.data.showHints,
      animationEnabled: this.data.animationEnabled,
      dataSavingMode: this.data.dataSavingMode,
      autoUpdate: this.data.autoUpdate,
      allowProfileView: this.data.allowProfileView,
      receiveInvites: this.data.receiveInvites
    };
    
    wx.setStorageSync('gameSettings', settings);
    
    // 更新全局配置
    if (app.globalData) {
      app.globalData.gameConfig = {
        aiDifficulty: this.data.aiDifficulties[this.data.aiDifficultyIndex].value,
        soundEnabled: this.data.soundEnabled,
        musicEnabled: this.data.musicEnabled,
        volume: this.data.volume,
        boardTheme: this.data.boardThemes[this.data.boardThemeIndex].value,
        autoSave: this.data.autoSave,
        showHints: this.data.showHints,
        animationEnabled: this.data.animationEnabled,
        dataSavingMode: this.data.dataSavingMode,
        autoUpdate: this.data.autoUpdate,
        allowProfileView: this.data.allowProfileView,
        receiveInvites: this.data.receiveInvites
      };
    }
    
    this.showToast('设置已保存');
    
    // 返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 音效设置
  toggleSound(e) {
    this.setData({ soundEnabled: e.detail.value });
  },

  toggleMusic(e) {
    this.setData({ musicEnabled: e.detail.value });
  },

  changeVolume(e) {
    this.setData({ volume: e.detail.value });
  },

  // 游戏设置
  changeAIDifficulty(e) {
    this.setData({ aiDifficultyIndex: parseInt(e.detail.value) });
  },

  changeBoardTheme(e) {
    this.setData({ boardThemeIndex: parseInt(e.detail.value) });
  },

  toggleAutoSave(e) {
    this.setData({ autoSave: e.detail.value });
  },

  toggleShowHints(e) {
    this.setData({ showHints: e.detail.value });
  },

  toggleAnimation(e) {
    this.setData({ animationEnabled: e.detail.value });
  },

  // 网络设置
  toggleDataSaving(e) {
    this.setData({ dataSavingMode: e.detail.value });
  },

  toggleAutoUpdate(e) {
    this.setData({ autoUpdate: e.detail.value });
  },

  // 隐私设置
  toggleProfileView(e) {
    this.setData({ allowProfileView: e.detail.value });
  },

  toggleInvites(e) {
    this.setData({ receiveInvites: e.detail.value });
  },

  // 其他功能
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？这将删除临时文件和本地设置。',
      success: (res) => {
        if (res.confirm) {
          // 清除缓存
          wx.clearStorageSync();
          
          // 重新初始化必要的数据
          this.initializeDefaultData();
          
          this.calculateCacheSize();
          this.showToast('缓存已清除');
          
          // 重新加载设置
          this.loadSettings();
        }
      }
    });
  },

  exportData() {
    wx.showModal({
      title: '导出数据',
      content: '将导出您的游戏数据和设置到本地文件。',
      success: (res) => {
        if (res.confirm) {
          // 获取所有数据
          const data = {
            userInfo: wx.getStorageSync('userInfo') || {},
            gameStats: wx.getStorageSync('gameStats') || {},
            gameHistory: wx.getStorageSync('gameHistory') || [],
            gameSettings: wx.getStorageSync('gameSettings') || {},
            exportTime: new Date().toISOString()
          };
          
          // 转换为JSON字符串
          const dataStr = JSON.stringify(data, null, 2);
          
          // 保存到文件
          const filePath = `${wx.env.USER_DATA_PATH}/gobang_data_export.json`;
          
          wx.getFileSystemManager().writeFile({
            filePath,
            data: dataStr,
            encoding: 'utf8',
            success: () => {
              // 打开文档
              wx.openDocument({
                filePath,
                fileType: 'json',
                success: () => {
                  this.showToast('数据导出成功');
                },
                fail: () => {
                  this.showToast('导出失败');
                }
              });
            },
            fail: () => {
              this.showToast('导出失败');
            }
          });
        }
      }
    });
  },

  resetSettings() {
    wx.showModal({
      title: '重置设置',
      content: '确定要重置所有设置为默认值吗？',
      success: (res) => {
        if (res.confirm) {
          // 重置为默认设置
          this.setData({
            soundEnabled: true,
            musicEnabled: false,
            volume: 70,
            aiDifficultyIndex: 1,
            boardThemeIndex: 0,
            autoSave: true,
            showHints: true,
            animationEnabled: true,
            dataSavingMode: false,
            autoUpdate: true,
            allowProfileView: true,
            receiveInvites: true
          });
          
          this.showToast('设置已重置');
        }
      }
    });
  },

  aboutApp() {
    wx.showModal({
      title: '关于应用',
      content: '五子棋小程序 v1.0.0\n\n一款经典的五子棋游戏，支持人机对战、在线对战和好友对战。\n\n开发者：五子棋开发团队',
      showCancel: false
    });
  },

  // 计算缓存大小
  calculateCacheSize() {
    try {
      const info = wx.getStorageInfoSync();
      const sizeInKB = info.currentSize;
      
      let sizeText;
      if (sizeInKB < 1024) {
        sizeText = `${sizeInKB} KB`;
      } else {
        sizeText = `${(sizeInKB / 1024).toFixed(1)} MB`;
      }
      
      this.setData({ cacheSize: sizeText });
    } catch (error) {
      this.setData({ cacheSize: '未知' });
    }
  },

  // 初始化默认数据
  initializeDefaultData() {
    // 设置默认设置
    const defaultSettings = {
      soundEnabled: true,
      musicEnabled: false,
      volume: 70,
      aiDifficultyIndex: 1,
      boardThemeIndex: 0,
      autoSave: true,
      showHints: true,
      animationEnabled: true,
      dataSavingMode: false,
      autoUpdate: true,
      allowProfileView: true,
      receiveInvites: true
    };
    
    wx.setStorageSync('gameSettings', defaultSettings);
    
    // 设置默认游戏统计
    const defaultGameStats = {
      ai: { games: 0, wins: 0, winRate: 0 },
      online: { games: 0, wins: 0, winRate: 0 },
      friend: { games: 0, wins: 0, winRate: 0 },
      totalScore: 0
    };
    
    wx.setStorageSync('gameStats', defaultGameStats);
  },

  // 显示提示
  showToast(text) {
    this.setData({
      showToast: true,
      toastText: text
    });
    
    setTimeout(() => {
      this.setData({ showToast: false });
    }, 2000);
  }
});