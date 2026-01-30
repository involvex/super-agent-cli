import type {
  PluginContext,
  SuperAgentPlugin,
  SuperAgentTool,
} from "@involvex/super-agent-cli/@plugins/shared/types";

interface NotifyConfig {
  sound?: boolean;
  urgency?: "low" | "normal" | "critical";
}

let config: NotifyConfig = {};

const sendNotificationTool: SuperAgentTool = {
  type: "function",
  function: {
    name: "send_notification",
    description:
      "Send a desktop notification to the user. Use this when the user wants to be notified about something or when a long-running task completes.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Notification title (short, descriptive)",
        },
        message: {
          type: "string",
          description: "Notification message body",
        },
        urgency: {
          type: "string",
          enum: ["low", "normal", "critical"],
          description: "Urgency level of the notification",
        },
      },
      required: ["title", "message"],
    },
    executor: async (args: {
      title: string;
      message: string;
      urgency?: string;
    }) => {
      try {
        // Validate inputs
        if (!args.title || !args.message) {
          return "Error: Both title and message are required.";
        }

        const urgency = args.urgency || config.urgency || "normal";
        const { execFile } = await import("child_process");
        const { promisify } = await import("util");
        const execFileAsync = promisify(execFile);

        // Platform-specific notification logic
        if (process.platform === "darwin") {
          // macOS: Use osascript
          // Escape for AppleScript string: " -> \" and \ -> \\
          const safeMessage = args.message
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"');
          const safeTitle = args.title
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"');

          const script = `display notification "${safeMessage}" with title "${safeTitle}"`;

          // Use execFile to avoid shell injection
          await execFileAsync("osascript", ["-e", script]);

          return `Notification sent: "${args.title}"`;
        } else if (process.platform === "win32") {
          // Windows: Use PowerShell
          // Escape for PowerShell string: " -> `" and ` -> ``
          // Note: PowerShell uses backtick ` as escape char
          const safeMessage = args.message
            .replace(/`/g, "``")
            .replace(/"/g, '`"');
          const safeTitle = args.title.replace(/`/g, "``").replace(/"/g, '`"');

          const ps1 = `
$notify = New-Object -ComObject Wscript.Shell
$notify.Popup("${safeMessage}", 5, "${safeTitle}", 64)
          `.trim();

          // Pass command as encoded block or just args?
          // Safest is -Command "..." but proper quoting is hard.
          // Better: -EncodedCommand but that requires base64.
          // Let's use execFile with -Command and careful construction,
          // but actually execFile on Windows still has some shell-like behavior with .cmd/.bat.
          // For powershell.exe, arguments are parsed.

          await execFileAsync("powershell", ["-Command", ps1]);
          return `Notification sent: "${args.title}"`;
        } else {
          // Linux: Use notify-send
          const urgencyFlag = urgency; // low, normal, critical maps directly usually

          // execFile automatically handles argument quoting for the process
          await execFileAsync("notify-send", [
            "-u",
            urgencyFlag,
            args.title,
            args.message,
          ]);

          return `Notification sent: "${args.title}"`;
        }
      } catch (error: any) {
        return `Error sending notification: ${error.message}. Make sure notification tools are installed on your system.`;
      }
    },
  },
};

export const plugin: SuperAgentPlugin = {
  name: "notify",
  version: "1.0.0",
  description: "Send desktop notifications from Super Agent",
  tools: [sendNotificationTool],

  async onInit(context: PluginContext) {
    config = context.config || {};
  },
};

export default plugin;
