import { DEFAULT_IMAP_PORT, DEFAULT_IMAP_SERVER } from "../core/emailSource.js";

export interface EmailApiConfig {
  token: string;
  host: string;
  port: number;
  email: string;
  authCode: string;
  server: string;
  imapPort: number;
}

type EnvLike = Record<string, string | undefined>;

const DEFAULT_API_HOST = "127.0.0.1";
const DEFAULT_API_PORT = 8787;

export function loadEmailApiConfig(env: EnvLike = process.env): EmailApiConfig {
  return {
    token: requiredEnv(env, "EMAIL_API_TOKEN"),
    host: optionalEnv(env, "EMAIL_API_HOST", DEFAULT_API_HOST),
    port: portEnv(env, "EMAIL_API_PORT", DEFAULT_API_PORT),
    email: requiredEnv(env, "EMAIL_ACCOUNT"),
    authCode: requiredEnv(env, "EMAIL_AUTH_CODE"),
    server: optionalEnv(env, "EMAIL_IMAP_SERVER", DEFAULT_IMAP_SERVER),
    imapPort: portEnv(env, "EMAIL_IMAP_PORT", DEFAULT_IMAP_PORT),
  };
}

function requiredEnv(env: EnvLike, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`缺少服务配置：${name}`);
  }
  return value;
}

function optionalEnv(env: EnvLike, name: string, fallback: string): string {
  return env[name]?.trim() || fallback;
}

function portEnv(env: EnvLike, name: string, fallback: number): number {
  const raw = env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`无效端口配置：${name}`);
  }
  return value;
}
