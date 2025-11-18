const express = require('express');
const path = require('path');
const app = express();

// 提供静态文件服务
app.use(express.static(path.join(__dirname, '../web')));

// 处理所有路由，返回index.html（用于客户端路由）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

module.exports = app;