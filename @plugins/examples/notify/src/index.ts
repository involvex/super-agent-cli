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

        // Platform-specific notification logic
        if (process.platform === "darwin") {
          // macOS: Use osascript
          const { exec } = await import("child_process");
          const { promisify } = await import("util");
          const execAsync = promisify(exec);

          const script = `display notification "${args.message.replace(/"/g, '\\"')}" with title "${args.title.replace(/'/g, "''")}"`;
          await execAsync(`osascript -e '${script}'`);

          return `Notification sent: "${args.title}"`;
        } else if (process.platform === "win32") {
          // Windows: Use PowerShell
          const { exec } = await import("child_process");
          const { promisify } = await import("util");
          const execAsync = promisify(exec);

          const ps1 = `
$notify = New-Object -ComObject Wscript.Shell
$notify.Popup("${args.message.replace(/"/g, '`"')}", 5, "${args.title.replace(/"/g, '`"')}", 64)
          `.trim();

          await execAsync(`powershell -Command "${ps1}"`);
          return `Notification sent: "${args.title}"`;
        } else {
          // Linux: Use notify-send
          const { exec } = await import("child_process");
          const { promisify } = await import("util");
          const execAsync = promisify(exec);

          const urgencyFlag = `-u ${urgency}`;
          await execAsync(
            `notify-send ${urgencyFlag} "${args.title}" "${args.message}"`,
          );
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
