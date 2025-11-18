# 五子棋游戏服务器

支持实时对战的五子棋游戏服务器。

## 功能特点

- 实时WebSocket通信
- 房间管理系统
- 多人在线对战
- 聊天记录保存
- 自动清理不活跃房间

## 安装和运行

### 安装依赖
```bash
cd server
npm install
```

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
npm start
```

## API接口

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
- `playerLeft` - 玩家离开房间

## 部署说明

服务器默认运行在3000端口，可以通过环境变量PORT修改。