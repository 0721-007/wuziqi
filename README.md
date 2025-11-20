# 五子棋在线对战游戏

支持实时对战的五子棋游戏，可以和朋友远程联机对战！

## 🎮 游戏特色

- **实时对战**: 使用WebSocket技术，支持两人实时对战
- **远程联机**: 不需要局域网，支持互联网远程对战
- **聊天功能**: 内置聊天系统，可以边下棋边聊天
- **响应式设计**: 支持手机、平板、电脑等各种设备
- **现代UI**: 美观的界面设计，支持深色模式

## 🚀 快速开始

### 本地运行

1. **启动后端服务器**:
```bash
cd server
npm install
npm start
```

2. **打开前端页面**:
```bash
# 在浏览器中打开
open web/index.html
```

### 在线部署

本项目使用 WebSocket，**不支持 Vercel** 等 Serverless 平台。建议部署到支持长连接的云平台，如：

- **Render** (推荐)
- **Railway**
- **Heroku**
- **DigitalOcean App Platform**
- **自建 VPS**

#### 部署步骤（通用）

1. 确保项目根目录有 `Dockerfile` 和 `package.json`
2. 将代码推送到 GitHub/GitLab
3. 在云平台连接仓库
4. 设置环境变量（可选）：
   - `PORT`: 3000 (默认)
5. 部署启动命令: `npm start`

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **后端**: Node.js, Express, Socket.IO
- **实时通信**: WebSocket
- **UI框架**: 原生CSS，支持响应式设计

## 📱 使用方法

1. **创建房间**: 打开网页后点击"新建房间"
2. **分享房间**: 复制房间链接发送给朋友
3. **加入房间**: 朋友打开链接即可加入游戏
4. **开始对战**: 双方准备好后即可开始对弈

## 🔧 API接口

### WebSocket事件

#### 客户端发送
- `createRoom` - 创建房间
- `joinRoom` - 加入房间  
- `makeMove` - 下棋
- `sendMessage` - 发送聊天消息

#### 服务端响应
- `roomCreated` - 房间创建成功
- `playerJoined` - 玩家加入房间
- `moveMade` - 棋子移动
- `chatMessage` - 聊天消息
- `gameOver` - 游戏结束

## 🎯 游戏规则

- 黑子先行，双方轮流下棋
- 在棋盘上连成5个同色棋子即获胜
- 支持悔棋和重新开始功能
- 游戏结束后可以立即开始新局

## 🌟 功能特点

- ✅ 实时对战
- ✅ 远程联机
- ✅ 聊天功能
- ✅ 响应式设计
- ✅ 深色模式
- ✅ 游戏回放
- ✅ 房间管理
- ✅ 自动重连
- ✅ 错误处理

## 📞 联系我们

如有问题或建议，欢迎反馈！

## 📄 许可证

MIT License - 详见LICENSE文件