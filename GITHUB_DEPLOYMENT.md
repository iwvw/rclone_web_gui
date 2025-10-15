# 🚀 GitHub Actions 自动部署指南

本指南将帮助你使用 GitHub Actions 自动构建 Docker 镜像，并在服务器上实现一键部署。

## 📋 目录

- [准备工作](#准备工作)
- [GitHub 仓库设置](#github-仓库设置)
- [Actions 工作流](#actions-工作流)
- [服务器部署](#服务器部署)
- [自动化更新](#自动化更新)
- [故障排除](#故障排除)

## 🛠️ 准备工作

### 1. Fork 或创建仓库

```bash
# 如果还没有仓库，先创建
git init
git add .
git commit -m "Initial commit"

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/yourusername/rclone-web-gui.git
git push -u origin main
```

### 2. 启用 GitHub Container Registry

1. 进入你的 GitHub 仓库
2. 点击 `Settings` 标签
3. 在左侧菜单中找到 `Actions`
4. 确保 `Actions` 已启用
5. 在 `General` > `Actions permissions` 中：
   - 选择 `Allow all actions and reusable workflows`
   - 勾选 `Allow GitHub Actions to create and approve pull requests`

## 🔄 GitHub Actions 工作流

项目已配置完整的 GitHub Actions 工作流，位于 `.github/workflows/docker.yml`。

### 工作流特性

- ✅ **多平台构建**：支持 linux/amd64 和 linux/arm64
- ✅ **自动标签**：基于分支和版本自动生成标签
- ✅ **缓存优化**：使用 GitHub Actions 缓存加速构建
- ✅ **安全扫描**：集成容器安全扫描
- ✅ **自动部署脚本**：生成服务器部署脚本

### 触发条件

工作流在以下情况自动触发：

- 推送到 `main` 或 `master` 分支
- 创建版本标签（如 `v1.0.0`）
- 创建 Pull Request

### 镜像标签规则

| 触发条件 | 生成的标签 |
|---------|-----------|
| 推送到 main | `latest`, `main` |
| 版本标签 v1.0.0 | `v1.0.0`, `v1.0`, `v1` |
| Pull Request | `pr-123` |

## 🐳 镜像拉取地址

```bash
# 替换为你的 GitHub 用户名和仓库名
ghcr.io/yourusername/rclone-web-gui:latest
```

## 🖥️ 服务器部署

### 方法一：一键部署脚本

```bash
# 下载并运行部署脚本
curl -fsSL https://raw.githubusercontent.com/yourusername/rclone-web-gui/main/scripts/server-deploy.sh | bash

# 或者指定参数
curl -fsSL https://raw.githubusercontent.com/yourusername/rclone-web-gui/main/scripts/server-deploy.sh | bash -s -- --port 8080 --tag v1.0.0
```

### 方法二：手动部署

```bash
# 1. 下载部署脚本
wget https://raw.githubusercontent.com/yourusername/rclone-web-gui/main/scripts/server-deploy.sh
chmod +x server-deploy.sh

# 2. 运行部署
sudo ./server-deploy.sh

# 3. 或指定参数
sudo ./server-deploy.sh --port 8080 --tag v1.0.0 --data-dir /opt/my-rclone-gui
```

### 部署脚本参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--image` | `ghcr.io/yourusername/rclone-web-gui` | Docker 镜像名称 |
| `--tag` | `latest` | 镜像标签 |
| `--port` | `3000` | 服务端口 |
| `--data-dir` | `/opt/rclone-web-gui` | 数据目录 |
| `--help` | - | 显示帮助信息 |

## 🔄 自动化更新

### 设置定时更新

创建 cron 任务实现自动更新：

```bash
# 编辑 crontab
sudo crontab -e

# 添加以下行（每天凌晨 2 点更新）
0 2 * * * /opt/rclone-web-gui/update.sh >> /opt/rclone-web-gui/logs/update.log 2>&1
```

### 手动更新命令

```bash
# 进入数据目录
cd /opt/rclone-web-gui

# 运行更新脚本
./update.sh

# 或者使用 docker-compose
docker-compose pull && docker-compose up -d
```

## 📊 监控和管理

### 查看服务状态

```bash
# systemd 服务状态
sudo systemctl status rclone-web-gui

# Docker 容器状态
cd /opt/rclone-web-gui && docker-compose ps

# 查看日志
cd /opt/rclone-web-gui && ./logs.sh
```

### 管理命令

```bash
# 启动服务
sudo systemctl start rclone-web-gui
# 或
cd /opt/rclone-web-gui && ./start.sh

# 停止服务
sudo systemctl stop rclone-web-gui
# 或
cd /opt/rclone-web-gui && ./stop.sh

# 重启服务
sudo systemctl restart rclone-web-gui
# 或
cd /opt/rclone-web-gui && docker-compose restart
```

## 🔧 高级配置

### 环境变量配置

编辑 `/opt/rclone-web-gui/.env` 文件：

```bash
# 基础配置
IMAGE_NAME=ghcr.io/yourusername/rclone-web-gui
TAG=latest
PORT=3000

# 可选配置
PUID=1000          # 用户 ID
PGID=1000          # 组 ID
TZ=Asia/Shanghai   # 时区
```

### 反向代理配置

#### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### SSL 配置（Let's Encrypt）

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔒 安全配置

### 防火墙设置

```bash
# Ubuntu/Debian
sudo ufw allow 3000
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 访问控制

```bash
# 限制 IP 访问（Nginx）
location / {
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    proxy_pass http://localhost:3000;
}
```

## 🐛 故障排除

### 常见问题

#### 1. 容器无法启动

```bash
# 查看容器日志
docker logs rclone-web-gui

# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查 Docker 服务
sudo systemctl status docker
```

#### 2. 镜像拉取失败

```bash
# 检查网络连接
ping ghcr.io

# 登录 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u yourusername --password-stdin

# 手动拉取镜像
docker pull ghcr.io/yourusername/rclone-web-gui:latest
```

#### 3. 权限问题

```bash
# 检查目录权限
ls -la /opt/rclone-web-gui

# 修复权限
sudo chown -R 1000:1000 /opt/rclone-web-gui/data
sudo chown -R 1000:1000 /opt/rclone-web-gui/config
```

#### 4. 服务无法访问

```bash
# 检查服务状态
sudo systemctl status rclone-web-gui

# 检查端口监听
sudo netstat -tlnp | grep :3000

# 检查防火墙
sudo ufw status
```

### 日志分析

```bash
# 应用日志
cd /opt/rclone-web-gui && docker-compose logs -f

# 系统日志
sudo journalctl -u rclone-web-gui -f

# Docker 日志
sudo journalctl -u docker -f
```

## 📈 性能优化

### 资源限制

编辑 `docker-compose.yml` 添加资源限制：

```yaml
services:
  rclone-web-gui:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 数据备份

```bash
# 创建备份脚本
cat > /opt/rclone-web-gui/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/rclone-web-gui"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据
tar -czf $BACKUP_DIR/data_$DATE.tar.gz -C /opt/rclone-web-gui data config

# 清理旧备份（保留 7 天）
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR/data_$DATE.tar.gz"
EOF

chmod +x /opt/rclone-web-gui/backup.sh

# 设置定时备份
echo "0 3 * * * /opt/rclone-web-gui/backup.sh" | sudo crontab -
```

## 🎯 下一步

部署完成后，你可以：

1. **配置反向代理**：使用 Nginx 或 Apache 设置域名访问
2. **启用 SSL**：配置 HTTPS 证书
3. **设置监控**：集成 Prometheus/Grafana 监控
4. **备份策略**：配置自动化备份
5. **负载均衡**：多实例部署提高可用性

## 📞 支持

如果遇到问题：

1. 查看 [GitHub Issues](https://github.com/yourusername/rclone-web-gui/issues)
2. 检查 [Actions 日志](https://github.com/yourusername/rclone-web-gui/actions)
3. 提交新的 Issue 或 Pull Request

---

**🎉 恭喜！你已经成功配置了完整的 CI/CD 流程，实现了从代码提交到生产部署的自动化！**