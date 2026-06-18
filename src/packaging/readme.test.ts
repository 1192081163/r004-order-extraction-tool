import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

const root = process.cwd();

describe("README portable executable guidance", () => {
  test("starts with direct Windows portable exe guidance before developer setup", async () => {
    const readme = await readFile(path.join(root, "README.md"), "utf8");
    const downloadIndex = readme.indexOf("下载 Windows 便携版");
    const localRunIndex = readme.indexOf("本地开发运行");

    expect(downloadIndex).toBeGreaterThanOrEqual(0);
    expect(localRunIndex).toBeGreaterThan(downloadIndex);
    expect(readme).toContain("orderflow-desktop-windows.exe");
    expect(readme).toContain("双击这个 exe 就会直接打开软件");
    expect(readme).not.toContain("下载 Windows 安装包");
    expect(readme).not.toContain("双击安装");
    expect(readme).not.toContain("order-extraction-tool-windows.exe");
    expect(readme).not.toContain("order-organizer-assistant-windows.exe");
    expect(readme).not.toContain("r004-order-extraction-tool");
  });
});
