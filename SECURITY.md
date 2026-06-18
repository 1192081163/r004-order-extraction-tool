# Security Policy

## Sensitive Data

不要提交真实订单、客户资料、邮箱内容、邮箱授权码、导出的报表、打包产物或本地运行日志。仓库的 `.gitignore` 已排除 `data/`、`outputs/`、`reports/`、`build/`、`dist/`、`release/` 和常见 Excel 文件，但开源前仍应只从 Git 跟踪文件发布。

应用会把企业微信邮箱和邮箱授权码保存在用户本机配置文件：

```text
~/.order_organizer_assistant/email_settings.json
```

该文件不属于仓库内容，不应提交或上传。当前版本未使用系统 Keychain 或 Credential Manager；如果你的环境要求更强的凭据保护，请先禁用邮箱保存功能或改造凭据存储后再分发。

## Reporting Vulnerabilities

如果你发现安全问题，请不要在公开 issue 中贴出真实订单、邮箱、授权码、客户名称或附件内容。请在 GitHub issue 中描述复现方式，并使用脱敏样例数据。
