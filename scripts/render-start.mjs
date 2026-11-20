import { spawn } from "node:child_process";

const api = spawn(process.execPath, ["server/server.js"], {
  stdio: "inherit",
  env: { ...process.env, API_PORT: process.env.API_PORT || "3001" },
});

const web = spawn(process.execPath, [".output/server/index.mjs"], {
  stdio: "inherit",
  env: { ...process.env, SHIS_API_URL: process.env.SHIS_API_URL || "http://127.0.0.1:3001" },
});

function stop() {
  api.kill("SIGTERM");
  web.kill("SIGTERM");
}

process.on("SIGTERM", stop);
process.on("SIGINT", stop);
web.on("exit", (code) => process.exit(code ?? 0));
api.on("exit", (code) => {
  if (code) process.exit(code);
});
