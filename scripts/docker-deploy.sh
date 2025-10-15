#!/bin/bash

# Rclone Web GUI Docker 部署脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_info "Docker 版本: $(docker --version)"
    log_info "Docker Compose 版本: $(docker-compose --version)"
}

# 创建必要的目录
create_directories() {
    log_step "创建必要的目录..."
    
    mkdir -p nginx/sites
    mkdir -p nginx/conf.d
    mkdir -p ssl
    mkdir -p logs
    mkdir -p postgres/init
    mkdir -p backup
    
    log_info "目录创建完成"
}

# 生成环境配置
generate_env() {
    log_step "生成环境配置..."
    
    if [[ ! -f .env ]]; then
        cp .env.example .env
        
        # 生成随机密钥
        NEXTAUTH_SECRET=$(openssl rand -base64 32)
        DB_PASSWORD=$(openssl rand -base64 16)
        REDIS_PASSWORD=$(openssl rand -base64 16)
        
        # 更新 .env 文件
        sed -i "s/your-super-secret-key-here-change-this-in-production/$NEXTAUTH_SECRET/" .env
        sed -i "s/rclone_password/$DB_PASSWORD/g" .env
        sed -i "s/redis_password/$REDIS_PASSWORD/g" .env
        
        log_info "环境配置文件已生成"
    else
        log_info "环境配置文件已存在"
    fi
}

# 生成 Nginx 配置
generate_nginx_config() {
    log_step "生成 Nginx 配置..."
    
    cat > nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # 基础配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 包含站点配置
    include /etc/nginx/conf.d/*.conf;
}
EOF

    # 获取域名或 IP
    read -p "请输入您的域名 (留空使用 IP): " DOMAIN
    if [[ -z "$DOMAIN" ]]; then
        DOMAIN=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
    fi

    cat > nginx/sites/rclone-gui.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # 反向代理到应用
    location / {
        proxy_pass http://rclone-gui:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 缓冲配置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # WebSocket 支持
    location /api/socketio {
        proxy_pass http://rclone-gui:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    log_info "Nginx 配置已生成，域名: $DOMAIN"
}

# 构建和启动服务
deploy_services() {
    log_step "构建和启动服务..."
    
    # 停止现有服务
    docker-compose down || true
    
    # 构建镜像
    log_info "构建 Docker 镜像..."
    docker-compose build --no-cache
    
    # 启动服务
    log_info "启动服务..."
    docker-compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    docker-compose ps
}

# 验证部署
verify_deployment() {
    log_step "验证部署..."
    
    # 检查应用健康状态
    if curl -f http://localhost/health &>/dev/null; then
        log_info "应用健康检查通过"
    else
        log_error "应用健康检查失败"
        return 1
    fi
    
    # 检查服务日志
    log_info "服务日志:"
    docker-compose logs --tail=20 rclone-gui
}

# 设置 SSL (可选)
setup_ssl() {
    read -p "是否配置 SSL 证书? (需要域名) (y/n): " SETUP_SSL
    
    if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
        log_step "配置 SSL 证书..."
        
        # 使用 Let's Encrypt
        docker run --rm \
            -v $(pwd)/ssl:/etc/letsencrypt \
            -v $(pwd)/nginx/sites:/etc/nginx/conf.d \
            -p 80:80 \
            certbot/certbot certonly \
            --standalone \
            --email admin@$DOMAIN \
            --agree-tos \
            --no-eff-email \
            -d $DOMAIN
        
        # 更新 Nginx 配置以支持 SSL
        cat > nginx/sites/rclone-gui.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL 配置
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # 反向代理到应用
    location / {
        proxy_pass http://rclone-gui:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 支持
    location /api/socketio {
        proxy_pass http://rclone-gui:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
        
        # 重启 Nginx
        docker-compose restart nginx
        
        log_info "SSL 证书配置完成"
    fi
}

# 创建管理脚本
create_management_scripts() {
    log_step "创建管理脚本..."
    
    # 创建启动脚本
    cat > scripts/start.sh << 'EOF'
#!/bin/bash
docker-compose up -d
echo "服务已启动"
docker-compose ps
EOF

    # 创建停止脚本
    cat > scripts/stop.sh << 'EOF'
#!/bin/bash
docker-compose down
echo "服务已停止"
EOF

    # 创建重启脚本
    cat > scripts/restart.sh << 'EOF'
#!/bin/bash
docker-compose restart
echo "服务已重启"
docker-compose ps
EOF

    # 创建日志脚本
    cat > scripts/logs.sh << 'EOF'
#!/bin/bash
SERVICE=${1:-rclone-gui}
docker-compose logs -f $SERVICE
EOF

    # 创建更新脚本
    cat > scripts/update.sh << 'EOF'
#!/bin/bash
git pull
docker-compose build --no-cache
docker-compose up -d
echo "应用已更新"
EOF

    # 创建备份脚本
    cat > scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./backup"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份
mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec -T postgres pg_dump -U rclone rclone_gui > $BACKUP_DIR/db_$DATE.sql

# 备份配置文件
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    .env \
    nginx/ \
    ssl/ \
    2>/dev/null

# 清理旧备份 (保留 7 天)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $DATE"
EOF

    # 设置执行权限
    chmod +x scripts/*.sh
    
    log_info "管理脚本已创建"
}

# 显示部署信息
show_deployment_info() {
    log_info "部署完成！"
    echo ""
    echo "访问信息:"
    echo "  - 应用地址: http://$DOMAIN"
    echo "  - 健康检查: http://$DOMAIN/health"
    echo ""
    echo "管理命令:"
    echo "  - 查看状态: docker-compose ps"
    echo "  - 查看日志: docker-compose logs -f"
    echo "  - 重启服务: docker-compose restart"
    echo "  - 停止服务: docker-compose down"
    echo ""
    echo "管理脚本:"
    echo "  - 启动服务: ./scripts/start.sh"
    echo "  - 停止服务: ./scripts/stop.sh"
    echo "  - 重启服务: ./scripts/restart.sh"
    echo "  - 查看日志: ./scripts/logs.sh"
    echo "  - 更新应用: ./scripts/update.sh"
    echo "  - 备份数据: ./scripts/backup.sh"
    echo ""
    echo "配置文件:"
    echo "  - 环境配置: .env"
    echo "  - Nginx 配置: nginx/sites/rclone-gui.conf"
    echo "  - Docker 配置: docker-compose.yml"
    echo ""
    echo "数据目录:"
    echo "  - 配置文件: ~/.local/share/docker/volumes/rclone-gui_rclone-config/_data"
    echo "  - 缓存文件: ~/.local/share/docker/volumes/rclone-gui_rclone-cache/_data"
    echo "  - 数据库: ~/.local/share/docker/volumes/rclone-gui_postgres-data/_data"
    echo "  - 备份: ./backup"
    echo ""
    log_info "请访问 http://$DOMAIN 查看应用"
}

# 主函数
main() {
    log_info "开始 Docker 部署..."
    
    check_docker
    create_directories
    generate_env
    generate_nginx_config
    deploy_services
    verify_deployment
    setup_ssl
    create_management_scripts
    show_deployment_info
    
    log_info "Docker 部署完成！"
}

# 运行主函数
main "$@"