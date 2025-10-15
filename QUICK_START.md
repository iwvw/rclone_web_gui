# Rclone Web GUI 快速开始指南

## 🚀 一键部署

### 方式 1: 本地快速启动
```bash
# 克隆项目
git clone <your-repository-url>
cd rclone-web-gui

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000`

### 方式 2: Docker 快速部署
```bash
# 克隆项目
git clone <your-repository-url>
cd rclone-web-gui

# 运行 Docker 部署脚本
chmod +x scripts/docker-deploy.sh
./scripts/docker-deploy.sh
```

### 方式 3: 服务器自动部署
```bash
# 下载并运行部署脚本
curl -fsSL https://raw.githubusercontent.com/your-repo/scripts/deploy.sh | bash

# 或手动下载
wget https://raw.githubusercontent.com/your-repo/scripts/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

## 📋 系统要求

### 最低要求
- **Node.js**: 18.0+
- **内存**: 512MB
- **存储**: 1GB
- **系统**: Linux/macOS/Windows

### 推荐配置
- **CPU**: 2核心+
- **内存**: 2GB+
- **存储**: 10GB+
- **网络**: 稳定的互联网连接

## 🛠️ 手动部署步骤

### 1. 环境准备
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm git curl

# CentOS/RHEL
sudo yum install nodejs npm git curl

# macOS (使用 Homebrew)
brew install node git curl
```

### 2. 项目设置
```bash
# 克隆项目
git clone <your-repository-url>
cd rclone-web-gui

# 安装依赖
npm install

# 复制环境配置
cp .env.example .env.local
```

### 3. 配置 rclone
```bash
# 安装 rclone (如果未安装)
curl https://rclone.org/install.sh | sudo bash

# 配置 rclone
rclone config
```

### 4. 启动应用
```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 🐳 Docker 部署

### 1. 安装 Docker
```bash
# Ubuntu
sudo apt install docker.io docker-compose

# CentOS
sudo yum install docker docker-compose

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 使用 Docker Compose
```bash
# 构建并启动
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 3. 管理命令
```bash
# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新服务
git pull
docker-compose build --no-cache
docker-compose up -d
```

## ⚙️ 配置说明

### 环境变量配置
```bash
# .env.local
NODE_ENV=production
PORT=3000
NEXTAUTH_SECRET=your-secret-key
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### rclone 配置
```bash
# 创建配置文件
mkdir -p ~/.config/rclone
nano ~/.config/rclone/rclone.conf
```

示例配置：
```ini
[google-drive]
type = drive
scope = drive
token = {"access_token":"your_token"}

[dropbox]
type = dropbox
token = {"access_token":"your_token"}
```

## 🔧 常见问题

### Q: 端口被占用怎么办？
```bash
# 查看端口占用
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改端口
export PORT=3001
npm run dev
```

### Q: 权限问题
```bash
# 修改文件权限
sudo chown -R $USER:$USER /path/to/project

# 修改 npm 权限
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
```

### Q: 内存不足
```bash
# 增加 swap 空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Q: rclone 连接失败
```bash
# 检查 rclone 安装
rclone version

# 测试连接
rclone lsd remote:

# 查看配置
rclone config show
```

## 📊 监控和维护

### 查看应用状态
```bash
# PM2 状态
pm2 status

# 系统资源
htop
df -h
free -h
```

### 日志管理
```bash
# 应用日志
pm2 logs rclone-gui

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 系统日志
sudo journalctl -f
```

### 备份和恢复
```bash
# 备份配置
tar -czf backup-$(date +%Y%m%d).tar.gz \
    ~/.config/rclone \
    .env.local \
    nginx/

# 恢复配置
tar -xzf backup-20240115.tar.gz
```

## 🔒 安全配置

### 防火墙设置
```bash
# UFW 防火墙
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3000
```

### SSL 证书
```bash
# Let's Encrypt
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📞 技术支持

### 获取帮助
- **文档**: [项目文档](https://github.com/your-repo/rclone-web-gui)
- **问题反馈**: [GitHub Issues](https://github.com/your-repo/rclone-web-gui/issues)
- **社区讨论**: [GitHub Discussions](https://github.com/your-repo/rclone-web-gui/discussions)

### 调试模式
```bash
# 启用调试日志
export DEBUG=*
export LOG_LEVEL=debug

# 启动调试模式
npm run dev:debug
```

## 🚀 性能优化

### 生产环境优化
```bash
# 启用集群模式
pm2 start ecosystem.config.js

# 开启 gzip 压缩
# 在 nginx.conf 中添加 gzip 配置

# 启用缓存
# 配置 Redis 或内存缓存
```

### 监控指标
- CPU 使用率 < 80%
- 内存使用率 < 80%
- 磁盘使用率 < 90%
- 响应时间 < 2s
- 可用性 > 99%

---

🎉 **恭喜！** 您已经成功部署了 Rclone Web GUI。

现在可以通过浏览器访问您的 rclone 管理界面了！