import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const tryExec = (command: string) => {
  try {
    return execSync(command, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
};

const normalize = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const getBuildVersion = () => {
  const injectedVersion = normalize(process.env.VITE_APP_VERSION ?? "");
  if (injectedVersion) {
    return injectedVersion;
  }

  const tag = normalize(tryExec("git describe --tags --abbrev=0"));
  const shortSha = normalize(tryExec("git rev-parse --short HEAD"));
  return tag || shortSha || "dev";
};

const buildVersion = getBuildVersion();

export default defineConfig({
  base: "./",
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(buildVersion),
  },
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@ant-design/icons")) {
            return "antd-icons";
          }
          if (
            id.includes("node_modules/@ant-design/cssinjs") ||
            id.includes("node_modules/@ant-design/cssinjs-utils")
          ) {
            return "antd-style";
          }
          if (
            id.includes("node_modules/@rc-component") ||
            id.includes("node_modules/rc-")
          ) {
            return "antd-rc";
          }
          if (id.includes("node_modules/antd")) {
            return "antd";
          }
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom")
          ) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 40148,
    strictPort: true,
  },
});
