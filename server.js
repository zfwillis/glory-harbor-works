const { spawn } = require("node:child_process");
const path = require("node:path");

const rootDir = __dirname;
const serverDir = path.join(rootDir, "server");
const clientDir = path.join(rootDir, "client");
const isWindows = process.platform === "win32";

const processes = [];
let shuttingDown = false;

function startProcess(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.log(`${name} exited (${signal ?? code}). Shutting down all processes...`);
      shutdown(code ?? 0);
    }
  });

  child.on("error", (err) => {
    console.error(`Failed to start ${name}:`, err.message);
    shutdown(1);
  });

  processes.push(child);
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }

  setTimeout(() => process.exit(exitCode), 300);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const clientCommand = isWindows ? "cmd.exe" : "npm";
const clientArgs = isWindows
  ? ["/d", "/s", "/c", "npm run dev"]
  : ["run", "dev"];

startProcess("API server", process.execPath, ["server.js"], serverDir);
startProcess("Vite client", clientCommand, clientArgs, clientDir);