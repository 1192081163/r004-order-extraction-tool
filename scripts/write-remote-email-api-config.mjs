import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputPath = path.resolve("resources", "remote-email-api.json");
const baseUrl = process.env.ORDERFLOW_EMAIL_API_URL?.trim() ?? "";
const token = process.env.ORDERFLOW_EMAIL_API_TOKEN?.trim() ?? "";

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ baseUrl, token }, null, 2)}\n`, "utf8");

if (baseUrl && token) {
  console.log("Remote email API config prepared for packaged build.");
} else {
  console.log("Remote email API config template prepared without packaged credentials.");
}
