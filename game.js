// game.js 游戏入口文件
const { GobangGame } = require('./utils/gobang.js');
const { GobangAI } = require('./utils/ai.js');
const soundManager = require('./utils/sound.js');
const { gameConfig } = require('./mini-game-config.js');

// 游戏主函数
function main() {
  console.log('五子棋游戏启动');
  console.log('游戏配置:', gameConfig);
  
  // 根据配置决定是否启用高级功能
  if (gameConfig.performance.enableWorker) {
    console.warn('Web Worker已启用，注意跨域隔离问题');
  }
  
  // 初始化游戏
  const game = new GobangGame();
  const ai = new GobangAI();
  const sound = soundManager;  // 使用已创建的实例
  
  // 微信小游戏环境使用 GameGlobal 而不是 global
  if (typeof GameGlobal !== 'undefined') {
    GameGlobal.game = game;
    GameGlobal.ai = ai;
    GameGlobal.sound = sound;
  } else if (typeof global !== 'undefined') {
    // Node.js环境
    global.game = game;
    global.ai = ai;
    global.sound = sound;
  } else {
    // 浏览器环境或其他环境
    window.game = game;
    window.ai = ai;
    window.sound = sound;
  }
  
  console.log('游戏初始化完成');
}

// 启动游戏
main();

// 导出游戏对象
// 获取全局对象（兼容不同环境）
function getGlobalObject() {
  if (typeof GameGlobal !== 'undefined') {
    return GameGlobal;
  } else if (typeof global !== 'undefined') {
    return global;
  } else if (typeof window !== 'undefined') {
    return window;
  }
  return {};
}

const globalObj = getGlobalObject();

module.exports = {
  main,
  game: globalObj.game,
  ai: globalObj.ai,
  sound: globalObj.sound
};