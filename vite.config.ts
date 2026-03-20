import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import fs from "fs";
import path from "path";

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
  plugins: [reactRouter(), tsconfigPaths()],
  server: {
    https: httpsConfig,
    allowedHosts: ['nonidyllic-winnifred-unsedately.ngrok-free.dev']
  }
});
