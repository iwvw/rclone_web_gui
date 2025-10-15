# 多阶段构建 - 基础镜像
FROM node:18-alpine AS base

# 安装基础依赖
RUN apk add --no-cache \
    curl \
    unzip \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# 多阶段构建 - 依赖安装阶段
FROM base AS deps

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json pnpm-lock.yaml* ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖（使用 pnpm 以提高速度）
RUN pnpm install --frozen-lockfile

# 多阶段构建 - 构建阶段
FROM base AS builder

# 设置工作目录
WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml

# 复制源代码
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用
RUN pnpm build

# 生产阶段
FROM base AS runner

# 安装运行时依赖
RUN apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# 安装 rclone（使用预编译版本）
RUN curl -fsSL https://downloads.rclone.org/rclone-current-linux-amd64.zip -o rclone.zip && \
    unzip rclone.zip && \
    mv rclone-*-linux-amd64/rclone /usr/local/bin/ && \
    chmod +x /usr/local/bin/rclone && \
    rm -rf rclone.zip rclone-*-linux-amd64

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 设置工作目录
WORKDIR /app

# 创建必要的目录
RUN mkdir -p /app/logs /home/nextjs/.config/rclone /home/nextjs/.cache/rclone && \
    chown -R nextjs:nodejs /app /home/nextjs

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制 package.json
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# 设置权限
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 使用 dumb-init 作为 PID 1
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "server.js"]