import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const actorDir = path.join(rootDir, "actors/product-hunt-reviews");
const actorId =
  process.env.APIFY_PRODUCT_HUNT_ACTOR_ID?.trim() ??
  "feature_map/product-hunt-reviews";
const apifyToken = resolveApifyToken();
const skipTests = process.argv.includes("--skip-tests");

if (!apifyToken) {
  console.error(
    "Missing APIFY_TOKEN or APIFY_API_TOKEN. Set one before deploying the Product Hunt actor."
  );
  process.exit(1);
}

function resolveApifyToken() {
  const envToken =
    process.env.APIFY_TOKEN?.trim() ?? process.env.APIFY_API_TOKEN?.trim();

  if (envToken) {
    return envToken;
  }

  try {
    const authPath = path.join(os.homedir(), ".apify/auth.json");
    const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
    return typeof auth.token === "string" && auth.token.trim()
      ? auth.token.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env: {
        ...process.env,
        APIFY_TOKEN: apifyToken
      },
      shell: false,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`${command} ${args.join(" ")} failed with exit code ${code}`)
      );
    });
  });
}

if (!skipTests) {
  await run("npm", ["run", "actor:test"]);
}

await run("npx", ["--yes", "apify-cli@latest", "push", actorId], {
  cwd: actorDir
});
