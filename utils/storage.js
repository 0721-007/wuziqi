/**
 * 本地存储封装模块
 * 提供统一的本地存储接口，支持游戏数据、用户设置等
 */

/**
 * 本地存储键值定义
 */
const STORAGE_KEYS = {
  USER_INFO: 'gobang_user_info',           // 用户信息
  GAME_SETTINGS: 'gobang_game_settings',   // 游戏设置
  LOCAL_GAME_RECORD: 'gobang_local_record', // 本地游戏记录
  AI_DIFFICULTY: 'gobang_ai_difficulty',   // AI难度设置
  SOUND_ENABLED: 'gobang_sound_enabled',   // 音效开关
  ANIMATION_ENABLED: 'gobang_animation_enabled', // 动画开关
  BOARD_THEME: 'gobang_board_theme',       // 棋盘主题
  GAME_STATS: 'gobang_game_stats',         // 游戏统计
  LAST_GAME_STATE: 'gobang_last_game_state' // 最后的游戏状态
};

/**
 * 默认游戏设置
 */
const DEFAULT_SETTINGS = {
  aiDifficulty: 'medium',      // AI难度: easy, medium, hard
  soundEnabled: true,          // 音效开关
  animationEnabled: true,      // 动画效果
  boardTheme: 'classic',       // 棋盘主题: classic, modern, dark
  autoSave: true,             // 自动保存
  vibrationEnabled: true,      // 震动反馈
  showCoordinates: false,    // 显示坐标
  allowUndo: true              // 允许悔棋
};

/**
 * 默认游戏统计
 */
const DEFAULT_STATS = {
  totalGames: 0,              // 总局数
  winGames: 0,                // 胜局数
  loseGames: 0,               // 负局数
  drawGames: 0,               // 平局数
  maxWinStreak: 0,            // 最高连胜
  currentWinStreak: 0,        // 当前连胜
  totalGameTime: 0,           // 总游戏时间(毫秒)
  lastGameDate: null,         // 最后游戏时间
  achievements: []             // 成就列表
};

/**
 * 设置本地存储数据
 * @param {string} key - 存储键
 * @param {any} data - 要存储的数据
 * @returns {boolean} 是否成功
 */
function setStorage(key, data) {
  try {
    const dataStr = JSON.stringify(data);
    wx.setStorageSync(key, dataStr);
    return true;
  } catch (error) {
    console.error('设置本地存储失败:', error);
    return false;
  }
}

/**
 * 获取本地存储数据
 * @param {string} key - 存储键
 * @param {any} defaultValue - 默认值
 * @returns {any} 存储的数据或默认值
 */
function getStorage(key, defaultValue = null) {
  try {
    const dataStr = wx.getStorageSync(key);
    if (dataStr) {
      return JSON.parse(dataStr);
    }
  } catch (error) {
    console.error('获取本地存储失败:', error);
  }
  return defaultValue;
}

/**
 * 删除本地存储数据
 * @param {string} key - 存储键
 * @returns {boolean} 是否成功
 */
function removeStorage(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (error) {
    console.error('删除本地存储失败:', error);
    return false;
  }
}

/**
 * 清空所有本地存储
 * @returns {boolean} 是否成功
 */
function clearAllStorage() {
  try {
    wx.clearStorageSync();
    return true;
  } catch (error) {
    console.error('清空本地存储失败:', error);
    return false;
  }
}

/**
 * 获取用户信息
 * @returns {Object|null} 用户信息
 */
function getUserInfo() {
  return getStorage(STORAGE_KEYS.USER_INFO, null);
}

/**
 * 保存用户信息
 * @param {Object} userInfo - 用户信息
 * @returns {boolean} 是否成功
 */
function saveUserInfo(userInfo) {
  return setStorage(STORAGE_KEYS.USER_INFO, userInfo);
}

/**
 * 获取游戏设置
 * @returns {Object} 游戏设置
 */
function getGameSettings() {
  const settings = getStorage(STORAGE_KEYS.GAME_SETTINGS, DEFAULT_SETTINGS);
  // 合并默认设置，确保新添加的设置项有默认值
  return { ...DEFAULT_SETTINGS, ...settings };
}

/**
 * 保存游戏设置
 * @param {Object} settings - 游戏设置
 * @returns {boolean} 是否成功
 */
function saveGameSettings(settings) {
  return setStorage(STORAGE_KEYS.GAME_SETTINGS, settings);
}

/**
 * 更新单个设置项
 * @param {string} key - 设置项键
 * @param {any} value - 设置项值
 * @returns {boolean} 是否成功
 */
function updateGameSetting(key, value) {
  const settings = getGameSettings();
  settings[key] = value;
  return saveGameSettings(settings);
}

/**
 * 获取游戏统计
 * @returns {Object} 游戏统计
 */
function getGameStats() {
  return getStorage(STORAGE_KEYS.GAME_STATS, DEFAULT_STATS);
}

/**
 * 保存游戏统计
 * @param {Object} stats - 游戏统计
 * @returns {boolean} 是否成功
 */
function saveGameStats(stats) {
  return setStorage(STORAGE_KEYS.GAME_STATS, stats);
}

/**
 * 更新游戏统计（用于游戏结束后更新）
 * @param {string} result - 游戏结果: 'win', 'lose', 'draw'
 * @param {number} duration - 游戏时长(毫秒)
 * @returns {boolean} 是否成功
 */
function updateGameStats(result, duration = 0) {
  const stats = getGameStats();
  
  stats.totalGames++;
  stats.totalGameTime += duration;
  stats.lastGameDate = new Date().toISOString();
  
  switch (result) {
    case 'win':
      stats.winGames++;
      stats.currentWinStreak++;
      stats.loseGames = Math.max(0, stats.loseGames); // 重置连败
      stats.maxWinStreak = Math.max(stats.maxWinStreak, stats.currentWinStreak);
      break;
    case 'lose':
      stats.loseGames++;
      stats.currentWinStreak = 0;
      break;
    case 'draw':
      stats.drawGames++;
      stats.currentWinStreak = 0;
      break;
  }
  
  return saveGameStats(stats);
}

/**
 * 获取AI难度
 * @returns {string} AI难度
 */
function getAiDifficulty() {
  return getStorage(STORAGE_KEYS.AI_DIFFICULTY, 'medium');
}

/**
 * 保存AI难度
 * @param {string} difficulty - AI难度
 * @returns {boolean} 是否成功
 */
function saveAiDifficulty(difficulty) {
  return setStorage(STORAGE_KEYS.AI_DIFFICULTY, difficulty);
}

/**
 * 获取音效设置
 * @returns {boolean} 音效是否开启
 */
function getSoundEnabled() {
  return getStorage(STORAGE_KEYS.SOUND_ENABLED, true);
}

/**
 * 保存音效设置
 * @param {boolean} enabled - 音效是否开启
 * @returns {boolean} 是否成功
 */
function saveSoundEnabled(enabled) {
  return setStorage(STORAGE_KEYS.SOUND_ENABLED, enabled);
}

/**
 * 获取最后的游戏状态
 * @returns {Object|null} 游戏状态
 */
function getLastGameState() {
  return getStorage(STORAGE_KEYS.LAST_GAME_STATE, null);
}

/**
 * 保存最后的游戏状态
 * @param {Object} gameState - 游戏状态
 * @returns {boolean} 是否成功
 */
function saveLastGameState(gameState) {
  return setStorage(STORAGE_KEYS.LAST_GAME_STATE, gameState);
}

/**
 * 获取本地游戏记录
 * @returns {Array} 游戏记录列表
 */
function getLocalGameRecords() {
  return getStorage(STORAGE_KEYS.LOCAL_GAME_RECORD, []);
}

/**
 * 添加本地游戏记录
 * @param {Object} record - 游戏记录
 * @returns {boolean} 是否成功
 */
function addLocalGameRecord(record) {
  const records = getLocalGameRecords();
  records.unshift(record); // 添加到开头
  
  // 限制记录数量，最多保留100条
  if (records.length > 100) {
    records.splice(100);
  }
  
  return setStorage(STORAGE_KEYS.LOCAL_GAME_RECORD, records);
}

/**
 * 清空本地游戏记录
 * @returns {boolean} 是否成功
 */
function clearLocalGameRecords() {
  return removeStorage(STORAGE_KEYS.LOCAL_GAME_RECORD);
}

/**
 * 导出所有数据（用于备份）
 * @returns {Object} 所有本地数据
 */
function exportAllData() {
  const data = {};
  
  Object.values(STORAGE_KEYS).forEach(key => {
    const value = getStorage(key, null);
    if (value !== null) {
      data[key] = value;
    }
  });
  
  return data;
}

/**
 * 导入数据（用于恢复）
 * @param {Object} data - 要导入的数据
 * @returns {boolean} 是否成功
 */
function importData(data) {
  try {
    Object.entries(data).forEach(([key, value]) => {
      setStorage(key, value);
    });
    return true;
  } catch (error) {
    console.error('导入数据失败:', error);
    return false;
  }
}

// 导出存储模块
module.exports = {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  setStorage,
  getStorage,
  removeStorage,
  clearAllStorage,
  getUserInfo,
  saveUserInfo,
  getGameSettings,
  saveGameSettings,
  updateGameSetting,
  getGameStats,
  saveGameStats,
  updateGameStats,
  getAiDifficulty,
  saveAiDifficulty,
  getSoundEnabled,
  saveSoundEnabled,
  getLastGameState,
  saveLastGameState,
  getLocalGameRecords,
  addLocalGameRecord,
  clearLocalGameRecords,
  exportAllData,
  importData
};