# 自动拉邮件 API 服务

这个服务把桌面端的企业微信邮箱拉取和订单提取能力封装成 HTTP API，其他软件只需要通过接口调用，不需要自己连接 IMAP 或复制订单提取规则。

## 环境变量

服务器启动前设置这些变量：

```bash
export EMAIL_API_TOKEN="换成一段长随机 token"
export EMAIL_ACCOUNT="your-enterprise-email@example.com"
export EMAIL_AUTH_CODE="企业微信邮箱授权码"
```

可选变量：

```bash
export EMAIL_API_HOST="127.0.0.1"
export EMAIL_API_PORT="8787"
export EMAIL_IMAP_SERVER="imap.exmail.qq.com"
export EMAIL_IMAP_PORT="993"
export EMAIL_IMAP_PROXY=""
```

建议线上部署时把 `EMAIL_API_HOST` 设为 `127.0.0.1`，再由 Nginx、内网网关或 VPN 暴露给可信软件使用。不要把 `EMAIL_AUTH_CODE` 放进请求体或前端代码。

`EMAIL_IMAP_PROXY` 可选，服务器直连 IMAP 端口受限时填写代理地址，例如 `socks5://127.0.0.1:7891`。

## 启动

```bash
npm run serve:email-api
```

服务启动后默认监听：

```text
http://127.0.0.1:8787
```

## 鉴权

除健康检查外，所有 API 都需要：

```text
Authorization: Bearer $EMAIL_API_TOKEN
```

## 健康检查

```bash
curl http://127.0.0.1:8787/health
```

返回：

```json
{"ok":true}
```

## 刷新邮件候选列表

只扫描邮件元数据和附件结构，不下载整封邮件正文。

```bash
curl -X POST http://127.0.0.1:8787/api/email/messages \
  -H "Authorization: Bearer $EMAIL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days":7}'
```

常用请求字段：

```json
{
  "days": 7
}
```

返回字段和桌面端候选邮件列表一致，`messages[].uid` 可用于后续提取。

## 提取选中邮件订单

按 UID 下载候选邮件里的 Excel 附件，并使用现有订单分类器过滤，只有订单 Excel 会进入提取。

```bash
curl -X POST http://127.0.0.1:8787/api/email/extract \
  -H "Authorization: Bearer $EMAIL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messageUids":["101","102"],"hours":168}'
```

常用请求字段：

```json
{
  "messageUids": ["101", "102"],
  "hours": 168,
  "inferManual": true
}
```

返回包含两部分：

```json
{
  "emailFetch": {
    "files": ["/path/to/downloaded/order.xlsx"],
    "scannedMessages": 1,
    "attachmentCount": 1,
    "downloadDir": "/path/to/download-dir"
  },
  "extraction": {
    "inputFiles": [],
    "rows": [],
    "skippedFiles": [],
    "failures": [],
    "outputs": {
      "outputDir": "/path/to/output",
      "csvOutput": "/path/to/output/orders.csv",
      "xlsxOutput": "/path/to/output/orders.xlsx",
      "auditOutput": "/path/to/output/audit.xlsx"
    }
  }
}
```

## 提取本地或上传的 Excel

不走邮箱，直接让服务器使用同一套订单提取规则处理 Excel。适合其他软件已经拿到 Excel 文件，但希望统一复用服务器规则。

### 使用服务器路径

这种方式要求文件已经在服务器本机或服务器可访问的磁盘路径上。

```bash
curl -X POST http://127.0.0.1:8787/api/orders/extract \
  -H "Authorization: Bearer $EMAIL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paths":["/server/orders/order.xlsx"],"inferManual":true}'
```

常用请求字段：

```json
{
  "paths": ["/server/orders/order.xlsx"],
  "recursive": false,
  "inferManual": true
}
```

### 上传 base64 文件

这种方式不要求客户端和服务器共享文件系统。客户端把 Excel 转成 base64 后传给服务端，服务端保存到临时目录再执行同一套提取规则。

```bash
curl -X POST http://127.0.0.1:8787/api/orders/extract \
  -H "Authorization: Bearer $EMAIL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":[{"filename":"order.xlsx","contentBase64":"BASE64内容"}],"inferManual":true}'
```

请求字段：

```json
{
  "files": [
    {
      "filename": "order.xlsx",
      "contentBase64": "BASE64内容"
    }
  ],
  "inferManual": true
}
```

返回结构与本地提取结果一致：

```json
{
  "inputFiles": ["/tmp/orderflow-api-xxx/order.xlsx"],
  "rows": [],
  "skippedFiles": [],
  "failures": [],
  "outputs": {
    "outputDir": "/path/to/output",
    "csvOutput": "/path/to/output/orders.csv",
    "xlsxOutput": "/path/to/output/orders.xlsx",
    "auditOutput": "/path/to/output/audit.xlsx"
  }
}

```

## 错误响应

未带 token：

```json
{"error":"Unauthorized"}
```

未知路由：

```json
{"error":"Not Found"}
```

请求体不是合法 JSON：

```json
{"error":"Unexpected end of JSON input"}
```
