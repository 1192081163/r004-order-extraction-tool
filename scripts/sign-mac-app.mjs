import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

export default async function signMacApp(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }

  const appName = readdirSync(context.appOutDir).find((name) => name.endsWith(".app"));
  if (!appName) {
    throw new Error(`No .app bundle found in ${context.appOutDir}`);
  }

  execFileSync("codesign", ["--force", "--deep", "--sign", "-", path.join(context.appOutDir, appName)], {
    stdio: "inherit",
  });
}
