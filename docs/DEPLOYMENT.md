# 部署文档

> 适用于 Linux 服务器（Ubuntu 22.04 / CentOS 8+），单机 Docker Compose 起步，API 可水平扩展。

## 一、前置准备（需人工提供）

| 项目 | 用途 | 状态 |
|---|---|---|
| 已备案域名 | 小程序 request 合法域名、支付回调、Web 管理端 | 需人工购买并备案 |
| HTTPS 证书 | 小程序强制 HTTPS；Nginx 443 端口 | 需人工申请（可用 Let's Encrypt） |
| 微信小程序 AppID / AppSecret | 登录、订阅消息、支付 | 需人工提供 |
| 微信支付商户号 + APIv3 密钥 + 证书序列号 + 私钥 | 支付/退款/分账 | 需人工开通分账权限 |
| 对象存储/CDN 密钥（COS/OSS） | 商品图片/视频 | 需人工提供，未提供前用本地存储 |
| TSPL 便携蓝牙标签打印机 | M4 出货标签打印 | 需真机调试 |
| 订阅消息模板 ID | 状态变更/超时提醒 | 需人工在小程序后台配置 |

## 二、服务器初始化

```bash
# 1. 安装 Docker 与 Compose
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # 重新登录生效

# 2. 克隆/上传项目
cd /opt && git clone <your-repo> flower-wholesale && cd flower-wholesale

# 3. 配置环境变量
cp .env.example .env
vim .env     # 务必修改：数据库密码、JWT_SECRET、QR_SIGN_SECRET、微信支付相关
```

关键环境变量说明见 `.env.example`。**生产环境必须修改** `JWT_SECRET`、`QR_SIGN_SECRET`、数据库密码。

## 三、构建与启动

```bash
# 构建共享包 + API + 管理端
npm install
npm run build:shared
npm run build:api
npm run build:admin

# 启动基础设施
docker compose up -d mysql redis

# 执行数据库迁移（首次 & 每次里程碑升级）
npm run migration:run

# 初始化种子数据（角色/权限/系统配置/测试账号，仅首次）
npm run seed

# 启动全部服务（api + nginx）
docker compose up -d --build

# 查看状态
docker compose ps
docker compose logs -f api
```

## 四、HTTPS 配置（Nginx）

将证书放到 `nginx/certs/`，在 `nginx/nginx.conf` 增加 443 server：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    location /api/ { proxy_pass http://api:3000; }
    location /admin/ { alias /usr/share/nginx/html/admin/; try_files $uri $uri/ /admin/index.html; }
}
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

并在 docker-compose 的 nginx volumes 挂载 `./nginx/certs:/etc/nginx/certs:ro`。

## 五、微信小程序后台配置

1. 开发管理 → 开发设置：配置 **服务器域名** request 合法域名 = `https://your-domain.com`。
2. 设置 → 基本设置：开通手机号快速验证组件。
3. 订阅消息：创建模板，把模板 ID 填入 `.env` 的 `SUBSCRIBE_TEMPLATE_*`。
4. 微信支付：绑定商户号，开通**分账权限**（分账接收方需添加并审核）。
5. 客服：在小程序后台绑定微信客服账号（订单内客服入口）。
6. 上传代码：用微信开发者工具打开 `apps/miniapp`，填入 AppID，上传体验版 → 提交审核 → 发布。

## 六、蓝牙打印隐私声明（小程序端必填）

小程序使用蓝牙需在下发审核时提供《隐私保护指引》，声明：
- 收集用途：仅用于连接便携标签打印机打印出货标签；
- 涉及权限：蓝牙（wx.openBluetoothAdapter 等）、位置信息（安卓扫描附近蓝牙设备可能需要定位授权，仅用于发现打印机，不上传、不存储）；
- 不收集用户个人信息用于打印，打印内容仅含订单号/商品/单位序号。

`app.json` 中按需声明 `requiredPrivateInfos` 与 `permission`。

## 七、备份与升级

```bash
# 备份数据库
docker exec flower-mysql mysqldump -uroot -p${MYSQL_ROOT_PASSWORD} flower_ws > backup_$(date +%F).sql

# 升级流程
git pull && npm install && npm run build:shared && npm run build:api && npm run build:admin
npm run migration:run
docker compose up -d --build
```

## 八、常见问题

- **迁移报错 Duplicate column**：说明手动改过表结构，检查 migration 是否已执行（`migrations` 表）。
- **小程序 request 域名错误**：确认已将域名加入合法域名列表且证书有效。
- **支付回调不通**：确认回调地址 `https://your-domain.com/api/v1/payments/callback` 已加入微信支付回调配置；本地可用内网穿透调试。
- **分账失败**：确认商户号已开通分账权限、接收方已添加、金额未超订单 30%、在冻结期内操作。
