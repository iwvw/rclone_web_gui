# Rclone Web GUI 部署指南

## 📋 目录

1. [环境要求](#环境要求)
2. [本地部署](#本地部署)
3. [Docker 部署](#docker-部署)
4. [云服务器部署](#云服务器部署)
5. [生产环境配置](#生产环境配置)
6. [安全配置](#安全配置)
7. [监控和维护](#监控和维护)

## 🛠️ 环境要求

### 基础要求
- **Node.js**: 18.0+ 
- **npm**: 8.0+ 或 **yarn**: 1.22+
- **系统**: Linux (推荐 Ubuntu 20.04+) / macOS / Windows
- **内存**: 最少 512MB，推荐 2GB+
- **存储**: 最少 1GB 可用空间

### 依赖软件
- **rclone**: 最新版本 (可选，支持自动安装)
- **Git**: 用于代码管理
- **curl**: 用于网络请求

## 🏠 本地部署

### 1. 克隆项目
```bash
git clone <your-repository-url>
cd rclone-web-gui
```

### 2. 安装依赖
```bash
npm install
# 或
yarn install
```

### 3. 环境配置
创建 `.env.local` 文件：
```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑配置
nano .env.local
```

### 4. 启动开发服务器
```bash
npm run dev
# 或
yarn dev
```

访问 `http://localhost:3000` 查看应用。

### 5. 构建生产版本
```bash
npm run build
npm start
```

## 🐳 Docker 部署

### 1. 创建 Dockerfile
```dockerfile
# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产镜像
FROM node:18-alpine AS runner

WORKDIR /app

# 安装 rclone
RUN apk add --no-cache curl unzip && \
    curl -O https://downloads.rclone.org/rclone-current-linux-amd64.zip && \
    unzip rclone-current-linux-amd64.zip && \
    mv rclone-*-linux-amd64/rclone /usr/local/bin/ && \
    chmod +x /usr/local/bin/rclone && \
    rm -rf rclone-*-linux-amd64*

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 设置权限
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. 创建 docker-compose.yml
```yaml
version: '3.8'

services:
  rclone-gui:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    volumes:
      - rclone-config:/home/nextjs/.config/rclone
      - rclone-cache:/home/nextjs/.cache/rclone
      - /path/to/your/data:/data:ro  # 挂载数据目录
    restart: unless-stopped
    networks:
      - rclone-network

  # 可选：添加数据库
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: rclone_gui
      POSTGRES_USER: rclone
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - rclone-network
    restart: unless-stopped

volumes:
  rclone-config:
  rclone-cache:
  postgres-data:

networks:
  rclone-network:
    driver: bridge
```

### 3. 部署命令
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## ☁️ 云服务器部署

### 1. 服务器准备 (Ubuntu 示例)
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2 (进程管理器)
sudo npm install -g pm2

# 安装 Nginx (反向代理)
sudo apt install nginx -y

# 安装 Certbot (SSL 证书)
sudo apt install certbot python3-certbot-nginx -y
```

### 2. 部署应用
```bash
# 克隆代码
git clone <your-repository-url>
cd rclone-web-gui

# 安装依赖
npm install

# 构建应用
npm run build

# 使用 PM2 启动
pm2 start ecosystem.config.js
```

### 3. PM2 配置文件
创建 `ecosystem.config.js`：
```javascript
module.exports = {
  apps: [{
    name: 'rclone-gui',
    script: 'npm',
    args: 'start',
    cwd: './',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### 4. Nginx 配置
创建 `/etc/nginx/sites-available/rclone-gui`：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 反向代理配置
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 支持
    location /api/socketio {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5. 获取 SSL 证书
```bash
# 获取证书
sudo certbot --nginx -d your-domain.com

# 设置自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

## ⚙️ 生产环境配置

### 1. 环境变量配置
创建 `.env.production`：
```bash
# 应用配置
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# 安全配置
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=https://your-domain.com

# API 配置
NEXT_PUBLIC_API_URL=https://your-domain.com/api
RC_SERVER_HOST=localhost
RC_SERVER_PORT=5572

# 数据库配置 (如果使用)
DATABASE_URL=postgresql://username:password@localhost:5432/rclone_gui

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# 性能配置
ENABLE_COMPRESSION=true
ENABLE_CACHE=true
CACHE_TTL=3600
```

### 2. 性能优化
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用压缩
  compress: true,
  
  // 优化图片
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 启用实验性功能
  experimental: {
    serverComponentsExternalPackages: ['rclone'],
  },
  
  // 构建优化
  swcMinify: true,
  
  // 输出配置
  output: 'standalone',
  
  // 重定向配置
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
```

### 3. 监控配置
```javascript
// monitoring.js
const monitoring = {
  // 健康检查端点
  healthCheck: async (req, res) => {
    try {
      // 检查数据库连接
      await checkDatabase();
      
      // 检查 RC 服务器
      await checkRCServer();
      
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
      });
    }
  },
  
  // 性能监控
  performanceMonitor: (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
  },
};

module.exports = monitoring;
```

## 🔒 安全配置

### 1. 防火墙设置
```bash
# UFW 防火墙配置
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp  # 只允许内部访问
```

### 2. 应用安全
```javascript
// middleware/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 限制每个 IP 100 次请求
  message: 'Too many requests from this IP',
});

// 安全头
const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
  limiter,
];

module.exports = securityMiddleware;
```

### 3. 认证配置
```javascript
// auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
```

## 📊 监控和维护

### 1. 日志管理
```bash
# 创建日志目录
mkdir -p logs

# 配置日志轮转
sudo nano /etc/logrotate.d/rclone-gui
```

```
/path/to/rclone-web-gui/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload rclone-gui
    endscript
}
```

### 2. 备份脚本
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/rclone-gui"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份应用数据
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    /path/to/rclone-web-gui \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=logs

# 备份数据库 (如果使用)
pg_dump rclone_gui > $BACKUP_DIR/db_$DATE.sql

# 清理旧备份 (保留 30 天)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 3. 监控脚本
```bash
#!/bin/bash
# monitor.sh

# 检查服务状态
if ! pm2 list | grep -q "rclone-gui.*online"; then
    echo "Rclone GUI is down, restarting..."
    pm2 restart rclone-gui
fi

# 检查磁盘空间
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Warning: Disk usage is ${DISK_USAGE}%"
fi

# 检查内存使用
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 80 ]; then
    echo "Warning: Memory usage is ${MEMORY_USAGE}%"
fi
```

### 4. 自动化部署脚本
```bash
#!/bin/bash
# deploy.sh

set -e

echo "Starting deployment..."

# 拉取最新代码
git pull origin main

# 安装依赖
npm ci

# 运行测试
npm test

# 构建应用
npm run build

# 重启服务
pm2 reload rclone-gui

# 清理旧版本
npm prune --production

echo "Deployment completed successfully!"
```

## 🚀 快速部署命令

### 一键部署 (Ubuntu)
```bash
# 下载并运行部署脚本
curl -fsSL https://raw.githubusercontent.com/your-repo/deploy.sh | bash

# 或手动执行
wget https://raw.githubusercontent.com/your-repo/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

### Docker 快速部署
```bash
# 拉取镜像并运行
docker run -d \
  --name rclone-gui \
  -p 3000:3000 \
  -v rclone-config:/config \
  -v /path/to/data:/data \
  --restart unless-stopped \
  your-registry/rclone-gui:latest
```

## 📞 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

2. **权限问题**
   ```bash
   sudo chown -R $USER:$USER /path/to/rclone-web-gui
   ```

3. **内存不足**
   ```bash
   # 增加 swap 空间
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

4. **RC 服务器连接失败**
   ```bash
   # 检查防火墙设置
   sudo ufw status
   # 检查服务状态
   pm2 logs rclone-gui
   ```

### 日志查看
```bash
# PM2 日志
pm2 logs rclone-gui

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 系统日志
sudo journalctl -u nginx -f
```

这个部署指南涵盖了从本地开发到生产环境的完整部署流程，包括安全配置、监控和维护等关键方面。根据您的具体需求，可以选择适合的部署方式。