// 微信小游戏配置文件
// 用于处理跨域隔离和SharedArrayBuffer相关问题

// 启用跨域隔离（如果需要使用SharedArrayBuffer）
if (typeof wx !== 'undefined' && wx.setEnableDebug) {
  wx.setEnableDebug({
    enableDebug: false
  });
}

// 处理SharedArrayBuffer警告
if (typeof SharedArrayBuffer !== 'undefined') {
  // 微信小游戏环境通常不需要担心这个问题
  console.log('SharedArrayBuffer is available in mini-game environment');
}

// 导出配置
module.exports = {
  // 游戏配置
  gameConfig: {
    // 是否启用高级功能（可能需要SharedArrayBuffer）
    enableAdvancedFeatures: false,
    // 音频配置
    audio: {
      enableWebAudio: true,
      enableSoundEffects: true
    },
    // 性能配置
    performance: {
      enableWorker: false,  // 禁用Web Worker避免跨域问题
      enableSharedMemory: false  // 禁用共享内存
    }
  }
};