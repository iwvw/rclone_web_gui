#!/bin/bash

# Rclone Web GUI 自动部署脚本
# 适用于 Ubuntu 20.04+ 系统

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# 检查是否为 root 用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "请不要使用 root 用户运行此脚本"
        exit 1
    fi
}

# 检查系统
check_system() {
    log_info "检查系统环境..."
    
    if ! command -v apt &> /dev/null; then
        log_error "此脚本仅支持 Ubuntu/Debian 系统"
        exit 1
    fi
    
    # 检查 Ubuntu 版本
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        log_info "系统版本: $PRETTY_NAME"
    fi
}

# 更新系统
update_system() {
    log_info "更新系统包..."
    sudo apt update && sudo apt upgrade -y
}

# 安装 Node.js
install_nodejs() {
    if ! command -v node &> /dev/null; then
        log_info "安装 Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        log_info "Node.js 已安装: $(node --version)"
    fi
}

# 安装 PM2
install_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log_info "安装 PM2..."
        sudo npm install -g pm2
    else
        log_info "PM2 已安装: $(pm2 --version)"
    fi
}

# 安装 Nginx
install_nginx() {
    if ! command -v nginx &> /dev/null; then
        log_info "安装 Nginx..."
        sudo apt install nginx -y
        sudo systemctl start nginx
        sudo systemctl enable nginx
    else
        log_info "Nginx 已安装"
    fi
}

# 安装 Certbot
install_certbot() {
    if ! command -v certbot &> /dev/null; then
        log_info "安装 Certbot..."
        sudo apt install certbot python3-certbot-nginx -y
    else
        log_info "Certbot 已安装"
    fi
}

# 安装 rclone
install_rclone() {
    if ! command -v rclone &> /dev/null; then
        log_info "安装 rclone..."
        curl -O https://downloads.rclone.org/rclone-current-linux-amd64.zip
        unzip rclone-current-linux-amd64.zip
        sudo mv rclone-*-linux-amd64/rclone /usr/local/bin/
        sudo chmod +x /usr/local/bin/rclone
        rm -rf rclone-*-linux-amd64*
    else
        log_info "rclone 已安装: $(rclone version | head -n1)"
    fi
}

# 创建应用目录
setup_app() {
    log_info "设置应用目录..."
    
    APP_DIR="/opt/rclone-gui"
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    
    if [[ ! -d "$APP_DIR/.git" ]]; then
        log_info "克隆应用代码..."
        git clone https://github.com/your-username/rclone-web-gui.git $APP_DIR
    else
        log_info "更新应用代码..."
        cd $APP_DIR
        git pull origin main
    fi
    
    cd $APP_DIR
}

# 安装依赖
install_dependencies() {
    log_info "安装应用依赖..."
    cd /opt/rclone-gui
    npm ci --production
}

# 构建应用
build_app() {
    log_info "构建应用..."
    cd /opt/rclone-gui
    npm run build
}

# 创建环境配置
create_env() {
    log_info "创建环境配置..."
    
    ENV_FILE="/opt/rclone-gui/.env.production"
    
    if [[ ! -f "$ENV_FILE" ]]; then
        cat > $ENV_FILE << EOF
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# 安全配置
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000

# API 配置
NEXT_PUBLIC_API_URL=http://localhost:3000/api
RC_SERVER_HOST=localhost
RC_SERVER_PORT=5572

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log
EOF
        log_info "环境配置文件已创建"
    else
        log_info "环境配置文件已存在"
    fi
}

# 创建 PM2 配置
create_pm2_config() {
    log_info "创建 PM2 配置..."
    
    cat > /opt/rclone-gui/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'rclone-gui',
    script: 'npm',
    args: 'start',
    cwd: '/opt/rclone-gui',
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
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
}

# 创建日志目录
create_log_dir() {
    log_info "创建日志目录..."
    mkdir -p /opt/rclone-gui/logs
}

# 配置防火墙
setup_firewall() {
    log_info "配置防火墙..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw --force enable
        sudo ufw allow ssh
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw deny 3000/tcp
        log_info "防火墙配置完成"
    else
        log_warn "UFW 未安装，请手动配置防火墙"
    fi
}

# 启动应用
start_app() {
    log_info "启动应用..."
    cd /opt/rclone-gui
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
}

# 配置 Nginx
setup_nginx() {
    log_info "配置 Nginx..."
    
    # 获取服务器 IP 或域名
    read -p "请输入您的域名 (留空使用 IP): " DOMAIN
    
    if [[ -z "$DOMAIN" ]]; then
        DOMAIN=$(curl -s ifconfig.me)
    fi
    
    # 创建 Nginx 配置
    sudo tee /etc/nginx/sites-available/rclone-gui > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/socketio {
        proxy_pass http://localhost:3000;
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

    # 启用站点
    sudo ln -sf /etc/nginx/sites-available/rclone-gui /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 测试配置
    sudo nginx -t
    
    # 重启 Nginx
    sudo systemctl restart nginx
    
    log_info "Nginx 配置完成"
}

# 设置 SSL (可选)
setup_ssl() {
    read -p "是否配置 SSL 证书? (y/n): " SETUP_SSL
    
    if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
        read -p "请输入您的域名: " DOMAIN
        
        if [[ -n "$DOMAIN" ]]; then
            log_info "获取 SSL 证书..."
            sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
            
            # 设置自动续期
            (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
            
            log_info "SSL 证书配置完成"
        else
            log_warn "域名不能为空，跳过 SSL 配置"
        fi
    fi
}

# 创建监控脚本
create_monitor_script() {
    log_info "创建监控脚本..."
    
    sudo tee /usr/local/bin/rclone-gui-monitor > /dev/null << 'EOF'
#!/bin/bash

# 检查服务状态
if ! pm2 list | grep -q "rclone-gui.*online"; then
    echo "$(date): Rclone GUI is down, restarting..." >> /var/log/rclone-gui-monitor.log
    pm2 restart rclone-gui
fi

# 检查磁盘空间
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): Warning: Disk usage is ${DISK_USAGE}%" >> /var/log/rclone-gui-monitor.log
fi

# 检查内存使用
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 80 ]; then
    echo "$(date): Warning: Memory usage is ${MEMORY_USAGE}%" >> /var/log/rclone-gui-monitor.log
fi
EOF

    sudo chmod +x /usr/local/bin/rclone-gui-monitor
    
    # 添加到 crontab
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/rclone-gui-monitor") | crontab -
    
    log_info "监控脚本已创建"
}

# 创建备份脚本
create_backup_script() {
    log_info "创建备份脚本..."
    
    sudo tee /usr/local/bin/rclone-gui-backup > /dev/null << 'EOF'
#!/bin/bash

BACKUP_DIR="/backup/rclone-gui"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份应用数据
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    /opt/rclone-gui \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=logs \
    2>/dev/null

# 清理旧备份 (保留 30 天)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete 2>/dev/null

echo "$(date): Backup completed: $DATE" >> /var/log/rclone-gui-backup.log
EOF

    sudo chmod +x /usr/local/bin/rclone-gui-backup
    
    # 添加到 crontab (每天凌晨 2 点备份)
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/rclone-gui-backup") | crontab -
    
    log_info "备份脚本已创建"
}

# 显示部署信息
show_deployment_info() {
    log_info "部署完成！"
    echo ""
    echo "应用信息:"
    echo "  - 应用目录: /opt/rclone-gui"
    echo "  - 访问地址: http://$DOMAIN"
    echo "  - PM2 状态: pm2 status"
    echo "  - 应用日志: pm2 logs rclone-gui"
    echo ""
    echo "管理命令:"
    echo "  - 重启应用: pm2 restart rclone-gui"
    echo "  - 停止应用: pm2 stop rclone-gui"
    echo "  - 查看状态: pm2 status"
    echo "  - 查看日志: pm2 logs rclone-gui"
    echo ""
    echo "配置文件:"
    echo "  - 环境配置: /opt/rclone-gui/.env.production"
    echo "  - PM2 配置: /opt/rclone-gui/ecosystem.config.js"
    echo "  - Nginx 配置: /etc/nginx/sites-available/rclone-gui"
    echo ""
    echo "监控和备份:"
    echo "  - 监控脚本: /usr/local/bin/rclone-gui-monitor"
    echo "  - 备份脚本: /usr/local/bin/rclone-gui-backup"
    echo "  - 监控日志: /var/log/rclone-gui-monitor.log"
    echo "  - 备份目录: /backup/rclone-gui"
    echo ""
    log_info "请访问 http://$DOMAIN 查看应用"
}

# 主函数
main() {
    log_info "开始部署 Rclone Web GUI..."
    
    check_root
    check_system
    update_system
    install_nodejs
    install_pm2
    install_nginx
    install_certbot
    install_rclone
    setup_app
    install_dependencies
    build_app
    create_env
    create_pm2_config
    create_log_dir
    setup_firewall
    start_app
    setup_nginx
    setup_ssl
    create_monitor_script
    create_backup_script
    show_deployment_info
    
    log_info "部署完成！"
}

# 运行主函数
main "$@"