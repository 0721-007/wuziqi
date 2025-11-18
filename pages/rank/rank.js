const app = getApp();
const storage = require('../../utils/storage.js');
const common = require('../../utils/common.js');

Page({
  data: {
    rankType: 'ai', // ai, online, friend
    rankList: [],
    loading: true,
    currentUser: null
  },

  onLoad() {
    this.loadRankData();
    this.loadCurrentUser();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadRankData();
  },

  // 加载当前用户信息
  loadCurrentUser() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        currentUser: userInfo
      });
    }
  },

  // 加载排行榜数据
  loadRankData() {
    this.setData({ loading: true });
    
    setTimeout(() => {
      const rankData = this.generateMockRankData();
      this.setData({
        rankList: rankData,
        loading: false
      });
    }, 500);
  },

  // 生成模拟排行榜数据
  generateMockRankData() {
    const mockUsers = [
      { name: '棋圣', avatar: '/images/avatar1.png', score: 2850, winRate: 78 },
      { name: '五子棋大师', avatar: '/images/avatar2.png', score: 2720, winRate: 75 },
      { name: '围棋少年', avatar: '/images/avatar3.png', score: 2680, winRate: 72 },
      { name: '棋艺超群', avatar: '/images/avatar4.png', score: 2650, winRate: 70 },
      { name: '黑白世界', avatar: '/images/avatar5.png', score: 2620, winRate: 68 },
      { name: '棋子飞舞', avatar: '/images/avatar6.png', score: 2580, winRate: 66 },
      { name: '棋高一着', avatar: '/images/avatar7.png', score: 2550, winRate: 65 },
      { name: '棋逢对手', avatar: '/images/avatar8.png', score: 2520, winRate: 64 },
      { name: '妙手回春', avatar: '/images/avatar9.png', score: 2500, winRate: 63 },
      { name: '棋开得胜', avatar: '/images/avatar10.png', score: 2480, winRate: 62 }
    ];

    return mockUsers.map((user, index) => ({
      ...user,
      rank: index + 1,
      games: Math.floor(Math.random() * 200) + 50,
      wins: Math.floor(Math.random() * 150) + 30
    }));
  },

  // 切换排行榜类型
  switchRankType(e) {
    const type = e.currentTarget.dataset.type;
    if (type === this.data.rankType) return;
    
    this.setData({
      rankType: type
    });
    this.loadRankData();
  },

  // 刷新排行榜
  onRefresh() {
    this.loadRankData();
  },

  // 查看用户详情
  viewUserDetail(e) {
    const userId = e.currentTarget.dataset.userid;
    const user = this.data.rankList.find(u => u.id === userId);
    
    if (user) {
      wx.showModal({
        title: user.name,
        content: `积分: ${user.score}\n胜率: ${user.winRate}%\n总局数: ${user.games}\n胜局: ${user.wins}`,
        showCancel: false
      });
    }
  },

  // 分享排行榜
  onShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  // 页面分享设置
  onShareAppMessage() {
    return {
      title: '五子棋排行榜 - 看看你的棋艺排名',
      path: '/pages/rank/rank',
      imageUrl: '/images/share-rank.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: '五子棋排行榜 - 看看你的棋艺排名',
      query: 'from=timeline'
    };
  }
});