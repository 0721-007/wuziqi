/**
 * 通用工具函数模块
 * 包含日期格式化、数据验证、常用工具函数等
 */

/**
 * 格式化时间戳
 * @param {number} timestamp - 时间戳
 * @param {string} format - 格式字符串
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(timestamp, format = 'YYYY-MM-DD hh:mm:ss') {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('hh', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * 格式化游戏时长
 * @param {number} duration - 时长（毫秒）
 * @returns {string} 格式化后的时长字符串
 */
function formatDuration(duration) {
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    return `${remainingSeconds}秒`;
  }
}

/**
 * 验证坐标是否有效
 * @param {number} row - 行坐标
 * @param {number} col - 列坐标
 * @returns {boolean} 是否有效
 */
function isValidPosition(row, col) {
  return row >= 0 && row < 15 && col >= 0 && col < 15;
}

/**
 * 深拷贝对象
 * @param {Object} obj - 要拷贝的对象
 * @returns {Object} 拷贝后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  const clonedObj = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }

  return clonedObj;
}

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

/**
 * 生成随机字符串
 * @param {number} length - 字符串长度
 * @returns {string} 随机字符串
 */
function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成房间号
 * @returns {string} 6位房间号
 */
function generateRoomNumber() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 计算胜率
 * @param {number} wins - 胜场数
 * @param {number} total - 总场数
 * @returns {string} 胜率百分比
 */
function calculateWinRate(wins, total) {
  if (total === 0) return '0.0%';
  return ((wins / total) * 100).toFixed(1) + '%';
}

/**
 * 计算等级
 * @param {number} totalGames - 总游戏数
 * @param {number} winRate - 胜率
 * @returns {number} 等级
 */
function calculateLevel(totalGames, winRate) {
  const baseLevel = Math.floor(totalGames / 10) + 1;
  const winRateBonus = Math.floor(winRate * 0.5);
  return Math.min(baseLevel + winRateBonus, 99);
}

/**
   * 显示提示消息
   * @param {string} title - 标题
   * @param {string} content - 内容
   * @param {string} icon - 图标类型
   */
function showToast(title, content = '', icon = 'none') {
  wx.showToast({
    title: title,
    content: content,
    icon: icon,
    duration: 2000
  });
}

/**
 * 显示模态对话框
 * @param {string} title - 标题
 * @param {string} content - 内容
 * @returns {Promise} 用户选择结果
 */
function showModal(title, content) {
  return new Promise((resolve) => {
    wx.showModal({
      title: title,
      content: content,
      success: (res) => {
        resolve(res.confirm);
      },
      fail: () => {
        resolve(false);
      }
    });
  });
}

/**
 * 显示加载中
 * @param {string} title - 加载提示文字
   */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title: title,
    mask: true
  });
}

/**
 * 隐藏加载中
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 安全地执行异步操作
 * @param {Function} asyncFunc - 异步函数
 * @param {string} errorMessage - 错误消息
 * @returns {Promise} 执行结果
 */
async function safeExecute(asyncFunc, errorMessage = '操作失败') {
  try {
    return await asyncFunc();
  } catch (error) {
    console.error(errorMessage, error);
    showToast(errorMessage);
    return null;
  }
}

/**
 * 比较版本号
 * @param {string} v1 - 版本号1
 * @param {string} v2 - 版本号2
 * @returns {number} -1: v1 < v2, 0: v1 = v2, 1: v1 > v2
 */
function compareVersion(v1, v2) {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);
  
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

// 导出工具函数
module.exports = {
  formatTime,
  formatDuration,
  isValidPosition,
  deepClone,
  debounce,
  throttle,
  generateRandomString,
  generateRoomNumber,
  calculateWinRate,
  calculateLevel,
  showToast,
  showModal,
  showLoading,
  hideLoading,
  safeExecute,
  compareVersion
};