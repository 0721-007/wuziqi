/** 棋盘组件逻辑 */
const { GobangGame } = require('../../utils/gobang');

Component({
  properties: {
    // 棋盘大小（像素）
    boardSize: {
      type: Number,
      value: 300
    },
    // 是否显示坐标
    showCoordinates: {
      type: Boolean,
      value: false
    },
    // 是否显示当前落子提示
    showCurrentMove: {
      type: Boolean,
      value: true
    },
    // 是否显示最后落子高亮
    showHighlight: {
      type: Boolean,
      value: true
    },
    // 是否启用点击
    enableClick: {
      type: Boolean,
      value: true
    },
    // 棋盘主题
    theme: {
      type: String,
      value: 'classic' // classic, modern, dark
    }
  },

  data: {
    canvasId: 'chessboard-canvas',
    board: Array(15).fill().map(() => Array(15).fill(0)),
    cellSize: 20,
    pieceSize: 16,
    currentMove: { row: -1, col: -1 },
    lastMove: null,
    winningLine: [],
    pieceAnimations: [],
    ctx: null
  },

  lifetimes: {
    attached() {
      this.initBoard();
    },

    ready() {
      this.drawBoard();
    }
  },

  methods: {
    /**
     * 初始化棋盘
     */
    initBoard() {
      const cellSize = Math.floor(this.data.boardSize / 15);
      const pieceSize = Math.floor(cellSize * 0.8);
      
      this.setData({
        cellSize,
        pieceSize,
        board: Array(15).fill().map(() => Array(15).fill(0))
      });
    },

    /**
     * 绘制棋盘
     */
    drawBoard() {
      const ctx = wx.createCanvasContext(this.data.canvasId, this);
      const { cellSize, boardSize, theme } = this.data;
      
      // 设置画布大小
      ctx.width = boardSize;
      ctx.height = boardSize;
      
      // 清空画布
      ctx.clearRect(0, 0, boardSize, boardSize);
      
      // 绘制棋盘背景
      this.drawBoardBackground(ctx);
      
      // 绘制网格线
      this.drawGrid(ctx);
      
      // 绘制星位点
      this.drawStarPoints(ctx);
      
      // 执行绘制
      ctx.draw();
    },

    /**
     * 绘制棋盘背景
     */
    drawBoardBackground(ctx) {
      const { boardSize, theme } = this.data;
      
      let bgColor;
      switch (theme) {
        case 'modern':
          bgColor = '#F8F8F8';
          break;
        case 'dark':
          bgColor = '#2C2C2C';
          break;
        default: // classic
          bgColor = '#DEB887';
      }
      
      ctx.setFillStyle(bgColor);
      ctx.fillRect(0, 0, boardSize, boardSize);
    },

    /**
     * 绘制网格线
     */
    drawGrid(ctx) {
      const { cellSize, boardSize, theme } = this.data;
      const gridColor = theme === 'dark' ? '#666666' : '#8B4513';
      
      ctx.setStrokeStyle(gridColor);
      ctx.setLineWidth(1);
      
      // 绘制横线
      for (let i = 0; i < 15; i++) {
        const y = cellSize * i + cellSize / 2;
        ctx.beginPath();
        ctx.moveTo(cellSize / 2, y);
        ctx.lineTo(boardSize - cellSize / 2, y);
        ctx.stroke();
      }
      
      // 绘制竖线
      for (let j = 0; j < 15; j++) {
        const x = cellSize * j + cellSize / 2;
        ctx.beginPath();
        ctx.moveTo(x, cellSize / 2);
        ctx.lineTo(x, boardSize - cellSize / 2);
        ctx.stroke();
      }
    },

    /**
     * 绘制星位点
     */
    drawStarPoints(ctx) {
      const { cellSize, theme } = this.data;
      const starPoints = [
        [3, 3], [3, 11], [11, 3], [11, 11], [7, 7]
      ];
      const starColor = theme === 'dark' ? '#999999' : '#654321';
      
      ctx.setFillStyle(starColor);
      
      starPoints.forEach(([row, col]) => {
        const x = cellSize * col + cellSize / 2;
        const y = cellSize * row + cellSize / 2;
        const radius = 3;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
      });
    },

    /**
     * 更新棋盘状态
     */
    updateBoard(board, lastMove = null, winningLine = []) {
      this.setData({
        board: board.map(row => [...row]),
        lastMove: lastMove,
        winningLine: winningLine
      });
      
      // 添加棋子动画
      if (lastMove) {
        this.addPieceAnimation(lastMove.row, lastMove.col);
      }
    },

    /**
     * 添加棋子动画
     */
    addPieceAnimation(row, col) {
      const animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease-out'
      });
      
      animation.scale(0).step()
                .scale(1.2).step()
                .scale(1).step();
      
      const animations = this.data.pieceAnimations;
      animations[row * 15 + col] = animation.export();
      
      this.setData({
        pieceAnimations: animations
      });
    },

    /**
     * 触摸开始事件
     */
    onTouchStart(e) {
      if (!this.data.enableClick) return;
      
      const { x, y } = e.touches[0];
      this.handleBoardClick(x, y);
    },

    /**
     * 触摸移动事件
     */
    onTouchMove(e) {
      if (!this.data.enableClick) return;
      
      const { x, y } = e.touches[0];
      const position = this.getBoardPosition(x, y);
      
      if (position) {
        this.setData({
          currentMove: position
        });
      }
    },

    /**
     * 触摸结束事件
     */
    onTouchEnd(e) {
      // 重置当前落子提示
      this.setData({
        currentMove: { row: -1, col: -1 }
      });
    },

    /**
     * 棋子点击事件
     */
    onPieceTap(e) {
      const { row, col } = e.currentTarget.dataset;
      this.triggerEvent('piececlick', { row, col });
    },

    /**
     * 处理棋盘点击
     */
    handleBoardClick(x, y) {
      const position = this.getBoardPosition(x, y);
      if (position) {
        this.triggerEvent('boardclick', position);
      }
    },

    /**
     * 获取棋盘位置
     */
    getBoardPosition(x, y) {
      const { cellSize } = this.data;
      const rect = this.getBoundingClientRect();
      
      if (!rect) return null;
      
      const relativeX = x - rect.left;
      const relativeY = y - rect.top;
      
      // 检查是否在棋盘范围内
      if (relativeX < 0 || relativeY < 0 || 
          relativeX > this.data.boardSize || relativeY > this.data.boardSize) {
        return null;
      }
      
      // 计算棋盘坐标
      const col = Math.round((relativeX - cellSize / 2) / cellSize);
      const row = Math.round((relativeY - cellSize / 2) / cellSize);
      
      // 验证坐标有效性
      if (row >= 0 && row < 15 && col >= 0 && col < 15) {
        return { row, col };
      }
      
      return null;
    },

    /**
     * 获取获胜连线样式
     */
    getWinningLineStyle(winningLine) {
      if (!winningLine || winningLine.length < 2) return '';
      
      const { cellSize } = this.data;
      const start = winningLine[0];
      const end = winningLine[winningLine.length - 1];
      
      const startX = start.col * cellSize + cellSize / 2;
      const startY = start.row * cellSize + cellSize / 2;
      const endX = end.col * cellSize + cellSize / 2;
      const endY = end.row * cellSize + cellSize / 2;
      
      const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
      
      return `
        left: ${startX}px;
        top: ${startY}px;
        width: ${length}px;
        transform: rotate(${angle}deg);
        transform-origin: 0 50%;
      `;
    },

    /**
     * 重置棋盘
     */
    resetBoard() {
      this.setData({
        board: Array(15).fill().map(() => Array(15).fill(0)),
        lastMove: null,
        winningLine: [],
        currentMove: { row: -1, col: -1 }
      });
      this.drawBoard();
    },

    /**
     * 设置主题
     */
    setTheme(theme) {
      this.setData({ theme });
      this.drawBoard();
    }
  }
});