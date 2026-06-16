# ！！！内部成员使用本地3000端口只要看1，2
统一官网（main分支）：rag-legal-git-main-hehe051104s-projects.vercel.app

.env文件需要解压下载好然后放进主目录下

有分支了，那么前端想要正常访问需要在api_server.py的required_origin中添加前端的网页地址
网址一般为：rag-legal-git-分支名-hehe051104s-projects.vercel.app

若要分支网站实现谷歌登录，需在谷歌后台添加该网址以实现Google登录（联系我进行后台操作）


运行api_server.py要在本地通过隧道连接网络，需要先点击项目路径下的cloudflared-windows-amd64.msi
并在管理员终端中运行：cloudflared tunnel run --token eyJhIjoiNzJiOWZhYzBkODE4NmFlMTk5ZjI0ZTljZGI2ZDUyZWYiLCJ0IjoiZWFmNzQ5NDctY2IzYS00NjEyLWFkMTMtMTBiZGJkMTc1OTkzIiwicyI6Ik5EVTNPV0UwTkRBdE5USXlaQzAwTjJZMUxXSmpNR1V0WVRZelltRTVaRFpoTldOayJ9

不用就关闭终端，让别人用

# 法律助手项目说明

相关数据库已建立完成，只需要进行环境配置并启动服务。

## 1. 环境准备

### 1.1 Python 环境

使用 conda 环境 `RAG-Legal`（Python 3.13），激活后所有命令自动使用正确解释器：

```powershell
conda activate RAG-Legal
```

### 1.2 安装依赖

```bash
pip install -r requirements.txt
```


## 2. 安装与启动模型

1. 安装 Ollama。
2. 拉取并启动模型：

```bash
ollama run Lusizo/qwen2.5-7b-instruct-1m
```

3. 启动后端（推荐用项目脚本，自动锁定正确环境）：

```powershell
.\run_api.ps1
```

genie TTS 语音合成服务自动随 API 启动（监听 127.0.0.1:9900）。

调试：VS Code 按 `F5` 选择「启动 API 服务器」。

## 3. 法律数据扩充

如需新增法律文本：

1. 前往 https://flk.npc.gov.cn/index 下载原文。
2. 将文件放入“法律原文”文件夹。
3. 在 process+injest(一键批量完成).py 中配置参数后运行。

司法解释的处理流程同上。

## 4. 法律助手前端（可选 Web UI）

这是 RAG-Legal 项目的可选 Next.js 前端。

### 快速开始

```bash
需要node-js环境，请自己安装
npm install -g pnpm      # 全局安装 pnpm
cd next-app
pnpm install              # 安装前端依赖
pnpm dev                  # 启动开发服务器
```

启动后访问：http://localhost:3000

### 技术栈

- Next.js 15 (App Router)
- React Server Components
- shadcn/ui + Tailwind CSS
- Auth.js（认证）
- Drizzle ORM

### 语音播报

AI 回复气泡右上角有喇叭图标，点击即可语音播报。后端使用 genie_tts 引擎（ONNX 模型），默认发音人 nina（中文女声），生成 WAV 音频后通过浏览器原生 Audio API 播放。

**TTS 缓存**：相同文本 + 相同发音人只合成一次，之后命中缓存直接返回（`cached: true`），缓存文件位于 `uploads/audio/`。

## 5. 多模态功能（TTS / 语音 / 文件上传）

### 5.1 配置

服务自动随 `api_server.py` 启动（监听 127.0.0.1:9900），启动时自动加载默认角色 nina。

默认发音人 nina（中文），可选 feibi。通过环境变量 `TTS_DEFAULT_CHARACTER` 可修改默认角色。

所需模型文件（放置于项目根目录）：
- `CharacterModels/` — 发音人 ONNX 模型（v2ProPlus/nina、feibi）
- `GenieData/` — G2P / hubert / speaker encoder

TTS 依赖见 `requirements.txt` 中「TTS 语音合成」段。

### 5.2 调用示例

```bash
curl -X POST "http://127.0.0.1:8000/speech/synthesize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"text": "根据《民法典》第一千零四十六条，结婚应当男女双方完全自愿。", "character": "nina"}'
```

返回（首次合成 `cached: false`，再次请求同一文本 `cached: true`）：
```json
{
  "status": "success",
  "data": { "audio_url": "/uploads/audio/abc123_nina.wav", "format": "wav", "character": "nina", "cached": false },
  "msg": "语音合成成功"
}
```

若 genie 服务器未启动则返回 503。


## 6. 认证接口联调

Python 认证接口现在统一返回：

```json
{
	"status": "success | error",
	"data": {},
	"msg": "自定义提示消息"
}
```

Swagger 示例可直接打开后端 `/docs` 查看，接口包括：

**认证接口：**
- `POST /api/auth/send-code`
- `POST /api/auth/register`
- `POST /api/auth/reset-password`
- `POST /api/auth/login`
- `POST /api/auth/token/verify`

**多模态接口：**
- `POST /speech/synthesize` — 文本转语音（TTS），默认发音人 nina
- `POST /speech/transcriptions` — 语音转文本（STT）
- `POST /api/upload` — 文件上传

前端调用封装已放在 `next-app/lib/api/auth.ts`，可以直接在 Next.js 中导入使用。

### 需要配置的环境变量

- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM`
- `SMTP_USE_SSL` / `SMTP_USE_TLS`
- `ADMIN_EMAILS` 或 `ADMIN_INVITE_CODE`
- `CORS_ORIGINS`
- `JWT_SECRET` / `JWT_ALGORITHM` / `JWT_EXPIRE_MINUTES`
- `REDIS_URL`（可选，验证码缓存优先使用 Redis）
- `RESET_CODE_SECRET`（可选，验证码摘要密钥；不配则回退到 `JWT_SECRET`）
- `RESET_CODE_EXPIRE_MINUTES`（默认 5）
- `RESET_CODE_RESEND_INTERVAL_SECONDS`（默认 60）

### 认证规则

- 新用户默认是 `user`。
- `ADMIN_EMAILS` 里的邮箱注册时会自动分配 `admin`。
- `ADMIN_INVITE_CODE` 匹配时也会分配 `admin`。
- 找回密码验证码为 6 位，默认 5 分钟有效。
- 验证码默认存入 Redis；如果未配置 `REDIS_URL`，则回退到内存 TTL 缓存。
- 同一邮箱默认 60 秒内只能重新获取一次验证码。
- 注册成功后会发送欢迎邮件，找回密码会发送验证码邮件。

### 联调样例（curl）

以下示例假设后端地址为 `http://127.0.0.1:8000`。

1) 注册

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/register" \
	-H "Content-Type: application/json" \
	-d '{
		"email": "demo@example.com",
		"password": "Test123456",
		"full_name": "Demo User",
		"invite_code": ""
	}'
```

2) 登录

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/login" \
	-H "Content-Type: application/json" \
	-d '{
		"email": "demo@example.com",
		"password": "Test123456"
	}'
```

3) 发送找回验证码

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/send-code" \
	-H "Content-Type: application/json" \
	-d '{
		"email": "demo@example.com"
	}'
```

4) 重置密码（将 123456 替换为真实验证码）

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/reset-password" \
	-H "Content-Type: application/json" \
	-d '{
		"email": "demo@example.com",
		"code": "123456",
		"new_password": "NewPass123456"
	}'
```

5) 校验 JWT（将 TOKEN 替换为登录接口返回的 access_token）

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/token/verify" \
	-H "Content-Type: application/json" \
	-d '{
		"token": "TOKEN"
	}'
```

### 联调样例（PowerShell）

```powershell
$base = "http://127.0.0.1:8000"

# 注册
$registerBody = @{
	email = "demo@example.com"
	password = "Test123456"
	full_name = "Demo User"
	invite_code = ""
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/api/auth/register" -ContentType "application/json" -Body $registerBody

# 登录并提取 token
$loginBody = @{
	email = "demo@example.com"
	password = "Test123456"
} | ConvertTo-Json
$loginResp = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResp.data.token.access_token

# 发送验证码
$sendCodeBody = @{ email = "demo@example.com" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/api/auth/send-code" -ContentType "application/json" -Body $sendCodeBody

# 重置密码（先把 123456 改成邮箱收到的验证码）
$resetBody = @{
	email = "demo@example.com"
	code = "123456"
	new_password = "NewPass123456"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/api/auth/reset-password" -ContentType "application/json" -Body $resetBody

# 校验 token
$verifyBody = @{ token = $token } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/api/auth/token/verify" -ContentType "application/json" -Body $verifyBody
```

