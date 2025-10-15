# 🚀 超快速部署指南

## ⚡ 一键部署到服务器

### 方法 1：直接运行（推荐）

```bash
# 一条命令部署到服务器
curl -fsSL https://raw.githubusercontent.com/yourusername/rclone-web-gui/main/scripts/server-deploy.sh | sudo bash
```

### 方法 2：指定参数

```bash
# 自定义端口和版本
curl -fsSL https://raw.githubusercontent.com/yourusername/rclone-web-gui/main/scripts/server-deploy.sh | sudo bash -s -- --port 8080 --tag v1.0.0
```

### 方法 3：下载后运行

```bash
# 下载脚本
wget https://raw.githubusercontent.com/yourusername/rclone-web-gui/main/scripts/server-deploy.sh
chmod +x server-deploy.sh

# 运行部署
sudo ./server-deploy.sh
```

## 🐳 Docker 快速部署

```bash
# 直接运行
docker run -d \
  --name rclone-web-gui \
  -p 3000:3000 \
  -v rclone-data:/app/data \
  --restart unless-stopped \
  ghcr.io/yourusername/rclone-web-gui:latest
```

## 📦 部署后访问

部署完成后，访问：`http://你的服务器IP:3000`

## 🔧 常用管理命令

```bash
# 查看状态
cd /opt/rclone-web-gui && docker-compose ps

# 查看日志
cd /opt/rclone-web-gui && ./logs.sh

# 更新应用
cd /opt/rclone-web-gui && ./update.sh

# 重启应用
cd /opt/rclone-web-gui && docker-compose restart
```

## ❓ 遇到问题？

1. 检查防火墙：`sudo ufw status`
2. 检查端口：`sudo netstat -tlnp | grep :3000`
3. 查看日志：`cd /opt/rclone-web-gui && ./logs.sh`

详细文档请查看：[GitHub Actions 部署指南](./GITHUB_DEPLOYMENT.md)