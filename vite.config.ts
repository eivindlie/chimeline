import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Resolve build hash: prefer git SHA, fall back to timestamp
function getBuildHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return Math.floor(Date.now() / 1000).toString();
  }
}

const buildHash = getBuildHash();

// Check if SSL certificates exist in .ssl/ folder for local HTTPS development
let httpsConfig = undefined;
const certPath = path.resolve("./.ssl/cert.pem");
const keyPath = path.resolve("./.ssl/key.pem");

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsConfig = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
}

export default defineConfig({
  base: "/",
  define: {
    // Bake the build hash into the bundle so the app knows its own version
    __BUILD_HASH__: JSON.stringify(buildHash),
  },
  plugins: [reactRouter(), tsconfigPaths()],
  server: {
    https: httpsConfig,
    allowedHosts: ['nonidyllic-winnifred-unsedately.ngrok-free.dev']
  }
});
