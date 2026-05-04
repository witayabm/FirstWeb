const { spawn } = require("child_process");

const sharedEnv = {
  ...process.env,
  BACKEND_PORT: process.env.BACKEND_PORT || "3001",
  FRONTEND_PORT: process.env.FRONTEND_PORT || process.env.PORT || "3000",
  API_BASE_URL: process.env.API_BASE_URL || "",
  API_PROXY_URL:
    process.env.API_PROXY_URL ||
    process.env.BACKEND_URL ||
    `http://127.0.0.1:${process.env.BACKEND_PORT || "3001"}`
};

const children = [
  spawn(process.execPath, ["server.js"], {
    env: sharedEnv,
    stdio: "inherit"
  }),
  spawn(process.execPath, ["frontend-server.js"], {
    env: sharedEnv,
    stdio: "inherit"
  })
];

let shuttingDown = false;

function stopAll(signal = "SIGTERM") {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  children.forEach((child) => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}

process.on("SIGTERM", () => stopAll("SIGTERM"));
process.on("SIGINT", () => stopAll("SIGINT"));

children.forEach((child) => {
  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      stopAll();
      process.exit(code ?? (signal ? 1 : 0));
    }
  });
});
