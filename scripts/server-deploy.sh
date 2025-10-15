#!/bin/bash
# Rclone Web GUI 一键部署脚本
# 支持 Ubuntu/Debian 和 CentOS/RHEL 系统

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
IMAGE_NAME="${IMAGE_NAME:-ghcr.io/your-username/rclone-web-gui}"
TAG="${TAG:-latest}"
CONTAINER_NAME="rclone-web-gui"
PORT="${PORT:-3000}"
DATA_DIR="${DATA_DIR:-/opt/rclone-web-gui}"
COMPOSE_FILE="$DATA_DIR/docker-compose.yml"
SERVICE_NAME="rclone-web-gui"

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Rclone Web GUI 部署脚本${NC}"
    echo -e "${BLUE}================================${NC}"
}

# 检查系统类型
detect_system() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        print_error "无法检测操作系统类型"
        exit 1
    fi
    
    print_message "检测到操作系统: $OS $VER"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 root 权限运行此脚本"
        exit 1
    fi
}

# 安装 Docker
install_docker() {
    if command -v docker &> /dev/null; then
        print_message "Docker 已安装"
        return
    fi
    
    print_message "正在安装 Docker..."
    
    case $OS in
        "Ubuntu"|"Debian"*)
            apt-get update
            apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io
            ;;
        "CentOS"*|"Red Hat"*)
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io
            ;;
        *)
            print_error "不支持的操作系统: $OS"
            exit 1
            ;;
    esac
    
    # 启动 Docker 服务
    systemctl start docker
    systemctl enable docker
    
    print_message "Docker 安装完成"
}

# 安装 Docker Compose
install_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        print_message "Docker Compose 已安装"
        return
    fi
    
    print_message "正在安装 Docker Compose..."
    
    # 下载最新版本的 Docker Compose
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    print_message "Docker Compose 安装完成"
}

# 创建数据目录
create_data_dir() {
    print_message "创建数据目录: $DATA_DIR"
    mkdir -p "$DATA_DIR"
    mkdir -p "$DATA_DIR/data"
    mkdir -p "$DATA_DIR/config"
    mkdir -p "$DATA_DIR/logs"
}

# 创建 docker-compose.yml
create_compose_file() {
    print_message "创建 docker-compose 配置文件"
    
    cat > "$COMPOSE_FILE" << EOF
version: '3.8'

services:
  rclone-web-gui:
    image: $IMAGE_NAME:$TAG
    container_name: $CONTAINER_NAME
    restart: unless-stopped
    ports:
      - "$PORT:3000"
    volumes:
      - ./data:/app/data
      - ./config:/home/nextjs/.config/rclone
      - ./logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
    networks:
      - rclone-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  rclone-network:
    driver: bridge

volumes:
  rclone-data:
    driver: local
EOF
}

# 创建环境变量文件
create_env_file() {
    if [ ! -f "$DATA_DIR/.env" ]; then
        print_message "创建环境变量文件"
        cat > "$DATA_DIR/.env" << EOF
# Rclone Web GUI 配置
IMAGE_NAME=$IMAGE_NAME
TAG=$TAG
CONTAINER_NAME=$CONTAINER_NAME
PORT=$PORT
DATA_DIR=$DATA_DIR

# 可选配置
# PUID=1000
# PGID=1000
# TZ=Asia/Shanghai
EOF
    fi
}

# 创建 systemd 服务
create_systemd_service() {
    print_message "创建 systemd 服务"
    
    cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=Rclone Web GUI
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$DATA_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
}

# 部署应用
deploy_app() {
    print_message "开始部署应用..."
    
    cd "$DATA_DIR"
    
    # 停止现有容器
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        print_message "停止现有容器..."
        docker-compose down
    fi
    
    # 拉取最新镜像
    print_message "拉取最新镜像..."
    docker-compose pull
    
    # 启动服务
    print_message "启动服务..."
    docker-compose up -d
    
    # 等待服务启动
    print_message "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        print_message "服务启动成功！"
    else
        print_error "服务启动失败"
        docker-compose logs
        exit 1
    fi
}

# 创建管理脚本
create_management_scripts() {
    print_message "创建管理脚本"
    
    # 启动脚本
    cat > "$DATA_DIR/start.sh" << EOF
#!/bin/bash
cd "$DATA_DIR"
docker-compose up -d
echo "Rclone Web GUI 已启动"
EOF
    
    # 停止脚本
    cat > "$DATA_DIR/stop.sh" << EOF
#!/bin/bash
cd "$DATA_DIR"
docker-compose down
echo "Rclone Web GUI 已停止"
EOF
    
    # 更新脚本
    cat > "$DATA_DIR/update.sh" << EOF
#!/bin/bash
cd "$DATA_DIR"
echo "正在更新 Rclone Web GUI..."
docker-compose pull
docker-compose up -d
echo "更新完成"
EOF
    
    # 日志脚本
    cat > "$DATA_DIR/logs.sh" << EOF
#!/bin/bash
cd "$DATA_DIR"
docker-compose logs -f
EOF
    
    # 设置执行权限
    chmod +x "$DATA_DIR"/*.sh
}

# 显示部署信息
show_deployment_info() {
    print_header
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo ""
    echo -e "${BLUE}访问地址:${NC} http://localhost:$PORT"
    echo -e "${BLUE}数据目录:${NC} $DATA_DIR"
    echo -e "${BLUE}配置文件:${NC} $DATA_DIR/.env"
    echo ""
    echo -e "${YELLOW}管理命令:${NC}"
    echo -e "  启动服务: ${GREEN}cd $DATA_DIR && ./start.sh${NC}"
    echo -e "  停止服务: ${GREEN}cd $DATA_DIR && ./stop.sh${NC}"
    echo -e "  更新服务: ${GREEN}cd $DATA_DIR && ./update.sh${NC}"
    echo -e "  查看日志: ${GREEN}cd $DATA_DIR && ./logs.sh${NC}"
    echo -e "  系统服务: ${GREEN}systemctl $SERVICE_NAME start|stop|restart|status${NC}"
    echo ""
    echo -e "${YELLOW}Docker 命令:${NC}"
    echo -e "  查看状态: ${GREEN}docker-compose ps${NC}"
    echo -e "  查看日志: ${GREEN}docker-compose logs -f${NC}"
    echo -e "  重启服务: ${GREEN}docker-compose restart${NC}"
    echo ""
    echo -e "${RED}重要提示:${NC}"
    echo -e "  1. 请确保防火墙已开放端口 $PORT"
    echo -e "  2. 首次访问可能需要等待几分钟初始化"
    echo -e "  3. 建议定期备份数据目录 $DATA_DIR"
    echo ""
}

# 主函数
main() {
    print_header
    
    # 检查参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --image)
                IMAGE_NAME="$2"
                shift 2
                ;;
            --tag)
                TAG="$2"
                shift 2
                ;;
            --port)
                PORT="$2"
                shift 2
                ;;
            --data-dir)
                DATA_DIR="$2"
                shift 2
                ;;
            -h|--help)
                echo "用法: $0 [选项]"
                echo ""
                echo "选项:"
                echo "  --image NAME     指定镜像名称 (默认: $IMAGE_NAME)"
                echo "  --tag TAG        指定镜像标签 (默认: $TAG)"
                echo "  --port PORT      指定端口 (默认: $PORT)"
                echo "  --data-dir DIR   指定数据目录 (默认: $DATA_DIR)"
                echo "  -h, --help       显示帮助信息"
                echo ""
                exit 0
                ;;
            *)
                print_error "未知参数: $1"
                exit 1
                ;;
        esac
    done
    
    # 执行部署步骤
    check_root
    detect_system
    install_docker
    install_docker_compose
    create_data_dir
    create_compose_file
    create_env_file
    create_systemd_service
    deploy_app
    create_management_scripts
    show_deployment_info
}

# 运行主函数
main "$@"