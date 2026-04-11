const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  Notification,
  dialog 
} = require("electron");
const path = require("path");
const say = require("say");
const AutoLaunch = require("electron-auto-launch");
require("dotenv").config();
const OpenAI = require("openai");
const { shell } = require("electron");
const arp = require("node-arp");
const { exec } = require("child_process");

let win;
let tray;

/**
 * Create main window
 */
function createWindow() {
  win = new BrowserWindow({
    width: 1250,
    height: 600,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  // Hide window instead of quitting
  // win.on("close", (event) => {
  //   event.preventDefault();
  //   win.hide();
  //   new Notification({
  //     title: "AI Agent",
  //     body: "AI Agent is still running in background. Use tray to reopen.",
  //   }).show();
  // });
}

/**
 * Simple ARP-based network scan
 */

app.whenReady().then(() => {
  createWindow();


  // Tray integration
  tray = new Tray(path.join(__dirname, "icon.png"));
  const contextMenu = Menu.buildFromTemplate([
    { label: "Open Agent", click: () => win.show() },
    { label: "Speak Test", click: () => say.speak("Hello, I am your AI agent.") },
    { label: "Quit", click: () => app.quit() },
  ]);
  tray.setToolTip("Desktop Agent");
  tray.setContextMenu(contextMenu);

  // Auto-launch setup
  const agentLauncher = new AutoLaunch({ name: "Desktop Agent" });
  agentLauncher.enable();

  // Start the background agent
  import('./src/agent/agentMain.js').then(() => {
    console.log('Background agent started.');
  }).catch(err => {
    console.error('Failed to start background agent:', err);
  });

  new Notification({
    title: "Agent",
    body: "Agent has started and is running in background.",
  }).show();
});

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Action handlers
 */
const actions = {
  open_url: (url) => shell.openExternal(url),

  system_action: async (action, arg) => {
    switch (action) {
      case "clear_cache":
        app.clearRecentDocuments();
        say.speak("Cache cleared successfully.");
        break;

      case "show_notification":
        new Notification({ title: "AI Agent", body: "This is a test notification" }).show();
        break;

      case "restart_agent":
        app.relaunch();
        app.exit();
        break;

      case "get_system_info":
        const os = require("os");
        const info = `CPU: ${os.cpus()[0].model}, Memory: ${(os.totalmem() / 1e9).toFixed(2)} GB`;
        say.speak(info);
        break;

      case "open_app":
        if (typeof arg !== "string") {
          say.speak("No valid app name provided.");
          break;
        }
        const appName = arg.toLowerCase();

        if (process.platform === "win32") {
          switch (appName) {
            case "settings":
              shell.openExternal("ms-settings:");
              break;
            case "calculator":
              exec("calc");
              break;
            case "notepad":
              exec("notepad");
              break;
            default:
              say.speak(`I don't know how to open ${appName} on Windows.`);
          }
        } else if (process.platform === "darwin") {
          switch (appName) {
            case "settings":
              shell.openExternal("x-apple.systempreferences:");
              break;
            case "calculator":
              exec("open -a Calculator");
              break;
            case "notes":
              exec("open -a Notes");
              break;
            default:
              say.speak(`I don't know how to open ${appName} on macOS.`);
          }
        } else {
          say.speak("Opening apps is not yet supported on this OS.");
        }
        break;

      default:
        say.speak(`Unknown system action: ${action}`);
    }
  },

  speak: (msg) => say.speak(msg),
};

/**
 * IPC handler for commands
 */
ipcMain.handle("parse-command", async (event, userCommand) => {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI agent. Always respond in strict JSON format:
{"intent": string, "args": array}.
Valid intents:
- "open_url" → args[0] must be a full URL string
- "system_action" → args[0] must be one of: "clear_cache", "show_notification", "restart_agent", "get_system_info", "scan_network"
- "system_action" → args[0] = "open_app", args[1] = app name (e.g. "calculator", "settings", "notepad")
- "speak" → args[0] must be a message string`,
        },
        { role: "user", content: userCommand },
      ],
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content returned from OpenAI");

    let parsed = JSON.parse(content);

    if (actions[parsed.intent]) {
      const result = await actions[parsed.intent](...(parsed.args || []));
      return {
        parsed,
        status: result?.status || `Executed: ${parsed.intent}`,
        devices: result?.devices || [],
      };
    } else {
      return { parsed, status: `Unknown intent: ${parsed.intent}` };
    }
  } catch (err) {
    console.error("Parse-command error:", err);
    return { parsed: { intent: "", args: [] }, status: `Error: ${err.message}` };
  }
});

// IPC handler for voice feedback
ipcMain.handle("speak", async (event, msg) => {
  try {
    say.speak(msg);
  } catch (err) {
    console.error("TTS error:", err);
  }
});

// 🔔 Listen for notification requests
ipcMain.on('show-notification', (event, { title, body }) => {
  
  new Notification({ title, body }).show();
  console.log("🚀 ~ Notification:", Notification)
});

// choose folder 

// ✅ Register handler in main process
ipcMain.handle("choose-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  return result.filePaths;
});

// Global error handling
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

// Lifecycle
app.on("window-all-closed", (event) => {
  event.preventDefault();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
