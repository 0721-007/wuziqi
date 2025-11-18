// 音效管理器
class SoundManager {
  constructor() {
    this.audioContext = null;
    this.soundEnabled = true;
    this.musicEnabled = false;
    this.volume = 0.7;
    this.sounds = {};
    this.backgroundMusic = null;
    this.initAudioContext();
  }

  // 初始化音频上下文
  initAudioContext() {
    try {
      this.audioContext = wx.createInnerAudioContext();
      this.loadSettings();
    } catch (error) {
      console.warn('音频上下文初始化失败:', error);
    }
  }

  // 加载设置
  loadSettings() {
    const settings = wx.getStorageSync('gameSettings') || {};
    this.soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;
    this.musicEnabled = settings.musicEnabled !== undefined ? settings.musicEnabled : false;
    this.volume = settings.volume !== undefined ? settings.volume / 100 : 0.7;
  }

  // 播放音效
  playSound(type) {
    if (!this.soundEnabled || !this.audioContext) return;

    try {
      const audio = wx.createInnerAudioContext();
      audio.volume = this.volume;
      
      // 根据类型设置不同的音频参数
      switch (type) {
        case 'place':
          // 落子音效 - 使用Web Audio API生成
          this.generatePlaceSound(audio);
          break;
        case 'win':
          // 胜利音效
          this.generateWinSound(audio);
          break;
        case 'lose':
          // 失败音效
          this.generateLoseSound(audio);
          break;
        case 'capture':
          // 提子音效
          this.generateCaptureSound(audio);
          break;
        case 'button':
          // 按钮点击音效
          this.generateButtonSound(audio);
          break;
        case 'alert':
          // 警告音效
          this.generateAlertSound(audio);
          break;
        default:
          return;
      }
      
      audio.play();
    } catch (error) {
      console.warn('音效播放失败:', error);
    }
  }

  // 生成落子音效
  generatePlaceSound(audio) {
    // 模拟落子声音 - 短促的点击声
    const duration = 0.1;
    const frequency = 800;
    
    // 由于小程序限制，使用简单的音频文件或模拟
    // 这里使用一个简短的音频URL（实际项目中需要添加音频文件）
    audio.src = '/sounds/place.mp3'; // 需要添加实际音频文件
    audio.playbackRate = 1.0;
  }

  // 生成胜利音效
  generateWinSound(audio) {
    // 胜利音效 - 上升的音调
    audio.src = '/sounds/win.mp3'; // 需要添加实际音频文件
    audio.playbackRate = 1.0;
  }

  // 生成失败音效
  generateLoseSound(audio) {
    // 失败音效 - 下降的音调
    audio.src = '/sounds/lose.mp3'; // 需要添加实际音频文件
    audio.playbackRate = 0.8;
  }

  // 生成提子音效
  generateCaptureSound(audio) {
    // 提子音效 - 清脆的声音
    audio.src = '/sounds/capture.mp3'; // 需要添加实际音频文件
    audio.playbackRate = 1.2;
  }

  // 生成按钮音效
  generateButtonSound(audio) {
    // 按钮音效 - 轻微的点击声
    audio.src = '/sounds/button.mp3'; // 需要添加实际音频文件
    audio.playbackRate = 1.5;
  }

  // 生成警告音效
  generateAlertSound(audio) {
    // 警告音效 - 短促的高音
    audio.src = '/sounds/alert.mp3'; // 需要添加实际音频文件
    audio.playbackRate = 1.0;
  }

  // 播放背景音乐
  playBackgroundMusic() {
    if (!this.musicEnabled || !this.audioContext) return;

    try {
      if (this.backgroundMusic) {
        this.backgroundMusic.stop();
      }
      
      this.backgroundMusic = wx.createInnerAudioContext();
      this.backgroundMusic.volume = this.volume * 0.5; // 背景音乐音量较小
      this.backgroundMusic.loop = true;
      this.backgroundMusic.src = '/sounds/background.mp3'; // 需要添加实际音频文件
      this.backgroundMusic.play();
    } catch (error) {
      console.warn('背景音乐播放失败:', error);
    }
  }

  // 停止背景音乐
  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
      this.backgroundMusic = null;
    }
  }

  // 暂停背景音乐
  pauseBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
    }
  }

  // 恢复背景音乐
  resumeBackgroundMusic() {
    if (this.backgroundMusic && this.musicEnabled) {
      this.backgroundMusic.play();
    }
  }

  // 设置音效开关
  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
    if (!enabled) {
      this.stopAllSounds();
    }
  }

  // 设置音乐开关
  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.playBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
  }

  // 设置音量
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.volume * 0.5;
    }
  }

  // 停止所有音效
  stopAllSounds() {
    // 停止所有正在播放的音效
    Object.keys(this.sounds).forEach(key => {
      if (this.sounds[key]) {
        this.sounds[key].stop();
      }
    });
  }

  // 振动反馈
  vibrate(type = 'light') {
    if (!wx.vibrateShort) return;
    
    try {
      switch (type) {
        case 'light':
          wx.vibrateShort({ type: 'light' });
          break;
        case 'medium':
          wx.vibrateShort({ type: 'medium' });
          break;
        case 'heavy':
          wx.vibrateShort({ type: 'heavy' });
          break;
        default:
          wx.vibrateShort();
      }
    } catch (error) {
      console.warn('振动反馈失败:', error);
    }
  }

  // 播放组合音效（用于特殊效果）
  playSequence(sounds) {
    if (!this.soundEnabled) return;

    let delay = 0;
    sounds.forEach(sound => {
      setTimeout(() => {
        this.playSound(sound.type);
      }, delay);
      delay += sound.delay || 200;
    });
  }

  // 清理资源
  destroy() {
    this.stopAllSounds();
    this.stopBackgroundMusic();
    if (this.audioContext) {
      this.audioContext.destroy();
      this.audioContext = null;
    }
  }
}

// 创建全局音效管理器实例
const soundManager = new SoundManager();

module.exports = soundManager;