# 🚀 Rclone Web GUI

一个现代化的 Rclone Web 管理界面，提供直观的图形化操作体验，支持多云存储管理和文件同步。

![GitHub release (latest by date)](https://img.shields.io/github/v/release/yourusername/rclone-web-gui)
![GitHub stars](https://img.shields.io/github/stars/yourusername/rclone-web-gui)
![GitHub forks](https://img.shields.io/github/forks/yourusername/rclone-web-gui)
![GitHub license](https://img.shields.io/github/license/yourusername/rclone-web-gui)
![Docker Pulls](https://img.shields.io/docker/pulls/yourusername/rclone-web-gui)

## ✨ 特性

- 🌐 **现代化界面**：基于 Next.js + TypeScript + Tailwind CSS
- 🔄 **实时同步**：Socket.IO 实时状态更新
- 📁 **文件管理**：支持多云存储的文件浏览器
- 🚀 **一键部署**：Docker 容器化，支持多种部署方式
- 🔒 **安全可靠**：内置安全机制和权限控制
- 📊 **监控面板**：实时监控传输状态和系统资源
- 🎨 **响应式设计**：完美适配桌面和移动设备

## 🚀 快速开始

### Docker 部署（推荐）

```bash
# 一键部署
docker run -d \
  --name rclone-web-gui \
  -p 3000:3000 \
  -v rclone-data:/app/data \
  ghcr.io/yourusername/rclone-web-gui:latest
```

### 服务器部署

```bash
# 自动部署脚本
curl -fsSL https://raw.githubusercontent.com/yourusername/rclone-web-gui/main/scripts/server-deploy.sh | bash

# 访问应用
open http://localhost:3000
```

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/yourusername/rclone-web-gui.git
cd rclone-web-gui

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问应用
open http://localhost:3000
```

## 📖 文档

- [📚 完整文档](./docs/README.md)
- [🚀 部署指南](./DEPLOYMENT.md)
- [🔄 GitHub Actions 部署](./GITHUB_DEPLOYMENT.md)
- [⚡ 快速开始](./QUICK_START.md)
- [🔧 配置说明](./docs/CONFIGURATION.md)
- [🐛 故障排除](./docs/TROUBLESHOOTING.md)

## 🏗️ 技术栈

### 前端
- **框架**：Next.js 14 (App Router)
- **语言**：TypeScript
- **样式**：Tailwind CSS + Shadcn/ui
- **状态管理**：Zustand
- **实时通信**：Socket.IO

### 后端
- **运行时**：Node.js
- **API**：Express + Socket.IO
- **数据库**：Prisma + SQLite
- **认证**：NextAuth.js

### 部署
- **容器化**：Docker + Docker Compose
- **CI/CD**：GitHub Actions
- **反向代理**：Nginx
- **进程管理**：PM2

## 🐳 Docker 镜像

| 镜像标签 | 说明 |
|---------|------|
| `latest` | 最新稳定版本 |
| `v1.0.0` | 特定版本 |
| `main` | 主分支最新构建 |

```bash
# 拉取镜像
docker pull ghcr.io/yourusername/rclone-web-gui:latest

# 查看所有标签
curl -s https://registry.hub.docker.com/v2/repositories/yourusername/rclone-web-gui/tags/list | jq
```

## 🔄 自动更新

### 设置定时更新

```bash
# 添加到 crontab
echo "0 2 * * * /opt/rclone-web-gui/update.sh" | sudo crontab -

# 手动更新
cd /opt/rclone-web-gui && ./update.sh
```

### 监控更新

```bash
# 查看当前版本
docker inspect ghcr.io/yourusername/rclone-web-gui:latest | grep -i version

# 查看更新日志
cd /opt/rclone-web-gui && ./logs.sh
```

## 📊 功能模块

### 🏠 仪表板
- 系统状态概览
- 传输任务统计
- 存储空间使用情况
- 实时性能监控

### 📁 文件管理
- 多云存储浏览
- 文件上传/下载
- 批量操作
- 文件预览

### 🔄 同步管理
- 同步任务配置
- 实时同步状态
- 历史记录查看
- 错误重试机制

### ⚙️ 系统设置
- Rclone 配置管理
- 用户权限设置
- 系统参数调整
- 日志管理

## 🛠️ 开发

### 环境要求

- Node.js 18+
- Docker & Docker Compose
- Git

### 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 代码检查
npm run lint

# 构建生产版本
npm run build

# 运行测试
npm test
```

### 项目结构

```
rclone-web-gui/
├── src/                 # 源代码
│   ├── app/            # Next.js App Router
│   ├── components/     # React 组件
│   ├── lib/           # 工具库
│   └── types/         # TypeScript 类型
├── public/            # 静态资源
├── docs/              # 文档
├── scripts/           # 部署脚本
├── .github/           # GitHub Actions
└── docker/            # Docker 配置
```

## 🤝 贡献

我们欢迎所有形式的贡献！

### 贡献方式

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范

- 遵循 [ESLint 配置](.eslintrc.json)
- 编写单元测试
- 更新相关文档
- 遵循 [Conventional Commits](https://conventionalcommits.org/)

## 📝 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细更新记录。

## 🐛 问题反馈

如果遇到问题，请：

1. 查看 [故障排除文档](./docs/TROUBLESHOOTING.md)
2. 搜索 [已有 Issues](https://github.com/yourusername/rclone-web-gui/issues)
3. 创建 [新 Issue](https://github.com/yourusername/rclone-web-gui/issues/new)

## 📄 许可证

本项目采用 [MIT 许可证](./LICENSE)。

## 🙏 致谢

- [Rclone](https://rclone.org/) - 强大的云存储同步工具
- [Next.js](https://nextjs.org/) - React 全栈框架
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Shadcn/ui](https://ui.shadcn.com/) - 美观的组件库

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/rclone-web-gui&type=Date)](https://star-history.com/#yourusername/rclone-web-gui&Date)

---

<div align="center">
  <p>如果这个项目对你有帮助，请给它一个 ⭐️</p>
  <p>Made with ❤️ by the community</p>
</div>