import {
  BashTool,
  ConfirmationTool,
  MorphEditorTool,
  ProjectMapTool,
  SearchTool,
  TextEditorTool,
  TodoTool,
} from "../tools/index";
import {
  getAllSuperAgentTools,
  getMCPManager,
  initializeMCPServers,
} from "../core/tools";
import { OpenAICompatibleProvider } from "../core/providers/openai-compatible";
import { LLMMessage, LLMProvider, LLMToolCall } from "../core/llm-provider";
import { createTokenCounter, TokenCounter } from "../utils/token-counter";
import { loadCustomInstructions } from "../utils/custom-instructions";
import { PerplexityProvider } from "../core/providers/perplexity";
import { OpenRouterProvider } from "../core/providers/openrouter";
import { AnthropicProvider } from "../core/providers/anthropic";
import { getSettingsManager } from "../utils/settings-manager";
import { TogetherProvider } from "../core/providers/together";
import { DeepSeekProvider } from "../core/providers/deepseek";
import { MistralProvider } from "../core/providers/mistral";
import { OpenAIProvider } from "../core/providers/openai";
import { OllamaProvider } from "../core/providers/ollama";
import { GeminiProvider } from "../core/providers/gemini";
import { CohereProvider } from "../core/providers/cohere";
import { GroqProvider } from "../core/providers/groq";
import { GrokProvider } from "../core/providers/grok";
import { getFileIndexer } from "../indexing/indexer";
import { loadMCPConfig } from "../mcp/config";
import { ToolResult } from "../types";
import { EventEmitter } from "events";

export interface ChatEntry {
  type: "user" | "assistant" | "tool_result" | "tool_call";
  content: string;
  timestamp: Date;
  toolCalls?: LLMToolCall[];
  toolCall?: LLMToolCall;
  toolResult?: { success: boolean; output?: string; error?: string };
  isStreaming?: boolean;
}

export interface StreamingChunk {
  type: "content" | "tool_calls" | "tool_result" | "done" | "token_count";
  content?: string;
  toolCalls?: LLMToolCall[];
  toolCall?: LLMToolCall;
  toolResult?: ToolResult;
  tokenCount?: number;
}

export class SuperAgent extends EventEmitter {
  private superAgentClient: LLMProvider;
  private textEditor: TextEditorTool;
  private morphEditor: MorphEditorTool | null;
  private bash: BashTool;
  private todoTool: TodoTool;
  private confirmationTool: ConfirmationTool;
  private search: SearchTool;
  private projectMap: ProjectMapTool;
  private chatHistory: ChatEntry[] = [];
  private messages: LLMMessage[] = [];
  private tokenCounter: TokenCounter;
  private abortController: AbortController | null = null;
  private mcpInitialized: boolean = false;
  private maxToolRounds: number;

  constructor(
    apiKey: string,
    baseURL?: string,
    model?: string,
    maxToolRounds?: number,
  ) {
    super();
    const manager = getSettingsManager();

    // Resolve effective configuration
    // Command line args (constructor params) override settings
    const activeConfig = manager.getActiveProviderConfig();
    const activeProviderId = activeConfig?.id || "grok";
    const providerType = activeConfig?.provider || activeProviderId;

    const effectiveApiKey = apiKey || manager.getApiKey() || "";
    let effectiveBaseURL = baseURL || manager.getBaseURL();
    const effectiveModel = model || manager.getCurrentModel();

    // Cloudflare Workers AI specific handling
    if (
      providerType === "workers-ai" &&
      effectiveBaseURL?.includes("{ACCOUNT_ID}")
    ) {
      if (activeConfig?.account_id) {
        effectiveBaseURL = effectiveBaseURL.replace(
          "{ACCOUNT_ID}",
          activeConfig.account_id,
        );
      }
    }

    this.maxToolRounds = maxToolRounds || 400;

    // Instantiate appropriate provider
    if (providerType === "openai") {
      this.superAgentClient = new OpenAIProvider(
        effectiveApiKey,
        effectiveBaseURL,
        effectiveModel,
      );
    } else if (providerType === "gemini" || providerType === "google") {
      this.superAgentClient = new GeminiProvider(
        effectiveApiKey,
        effectiveBaseURL,
        effectiveModel,
      );
    } else if (providerType === "grok") {
      this.superAgentClient = new GrokProvider(
        effectiveApiKey,
        effectiveBaseURL,
        effectiveModel,
      );
    } else if (providerType === "anthropic" || providerType === "claude") {
      this.superAgentClient = new AnthropicProvider(
        effectiveApiKey,
        effectiveBaseURL,
        effectiveModel,
      );
    } else if (providerType === "together") {
      this.superAgentClient = new TogetherProvider(
        effectiveApiKey,
        effectiveBaseURL,
        effectiveModel,
      );
    } else if (providerType === "perplexity") {
      this.superAgentClient = new PerplexityProvider(
        effectiveApiKey,
        effectiveBaseURL,
        effectiveModel,
      );
    } else if (providerType === "cohere") {
      this.superAgentClient = new CohereProvider(
        effectiveApiKey,
        effectiveBaseURL,
        effectiveModel,
      );
    } else if (providerType === "deepseek") {
      this.superAgentClient = new DeepSeekProvider(
        effectiveApiKey,
        effectiveBaseURL,
        effectiveModel,
      );
    } else if (providerType === "ollama") {
      this.superAgentClient = new OllamaProvider(
        effectiveApiKey,
        effectiveBaseURL,
        effectiveModel,
      );
    } else if (providerType === "mistral") {
      this.superAgentClient = new MistralProvider(
        effectiveApiKey,
        effectiveBaseURL,
        effectiveModel,
      );
    } else if (providerType === "groq") {
      this.superAgentClient = new GroqProvider(
        effectiveApiKey,
        effectiveBaseURL,
        effectiveModel,
      );
    } else if (providerType === "openrouter") {
      this.superAgentClient = new OpenRouterProvider(
        effectiveApiKey,
        effectiveBaseURL,
        effectiveModel,
      );
    } else {
      // Default to OpenAI Compatible for all other providers (mistral, openrouter, etc.)
      this.superAgentClient = new OpenAICompatibleProvider(
        effectiveApiKey,
        effectiveBaseURL || "", // Generic provider needs a URL usually, but let class handle default if empty
        effectiveModel,
        activeProviderId, // pass the name for logging
      );
    }

    this.textEditor = new TextEditorTool();
    this.morphEditor = process.env.MORPH_API_KEY ? new MorphEditorTool() : null;
    this.bash = new BashTool();
    this.todoTool = new TodoTool();
    this.confirmationTool = new ConfirmationTool();
    this.search = new SearchTool();
    this.projectMap = new ProjectMapTool();
    this.tokenCounter = createTokenCounter(effectiveModel);

    // Initialize FileIndexer background scan
    const indexer = getFileIndexer();
    indexer.loadIndex().then(() => {
      // Start background scan quietly
      indexer
        .fullScan()
        .catch(err => console.error("Background index scan failed:", err));
    });

    // Initialize MCP servers if configured
    this.initializeMCP();

    // Load custom instructions
    const customInstructions = loadCustomInstructions();
    const customInstructionsSection = customInstructions
      ? `\n\nCUSTOM INSTRUCTIONS:\n${customInstructions}\n\nThe above custom instructions should be followed alongside the standard instructions below.`
      : "";

    // Initialize with system message
    this.messages.push({
      role: "system",
      content: `You are Super Agent CLI, an AI assistant that helps with file editing, coding tasks, and system operations.${customInstructionsSection}

You have access to these tools:
- view_file: View file contents or directory listings
- create_file: Create new files with content (ONLY use this for files that don't exist yet)
- str_replace_editor: Replace text in existing files (ALWAYS use this to edit or update existing files)${
        this.morphEditor
          ? "\n- edit_file: High-speed file editing with Morph Fast Apply (4,500+ tokens/sec with 98% accuracy)"
          : ""
      }
- bash: Execute bash commands (use for searching, file discovery, navigation, and system operations)
- search: Unified search tool for finding text content or files (similar to Cursor's search functionality)
- create_todo_list: Create a visual todo list for planning and tracking tasks
- update_todo_list: Update existing todos in your todo list

REAL-TIME INFORMATION:
You have access to real-time web search and X (Twitter) data. When users ask for current information, latest news, or recent events, you automatically have access to up-to-date information from the web and social media.

IMPORTANT TOOL USAGE RULES:
- NEVER use create_file on files that already exist - this will overwrite them completely
- ALWAYS use str_replace_editor to modify existing files, even for small changes
- Before editing a file, use view_file to see its current contents
- Use create_file ONLY when creating entirely new files that don't exist

SEARCHING AND EXPLORATION:
- Use search for fast, powerful text search across files or finding files by name (unified search tool)
- Examples: search for text content like "import.*react", search for files like "component.tsx"
- Use bash with commands like 'find', 'grep', 'rg', 'ls' for complex file operations and navigation
- view_file is best for reading specific files you already know exist

When a user asks you to edit, update, modify, or change an existing file:
1. First use view_file to see the current contents
2. Then use str_replace_editor to make the specific changes
3. Never use create_file for existing files

When a user asks you to create a new file that doesn't exist:
1. Use create_file with the full content

TASK PLANNING WITH TODO LISTS:
- For complex requests with multiple steps, ALWAYS create a todo list first to plan your approach
- Use create_todo_list to break down tasks into manageable items with priorities
- Mark tasks as 'in_progress' when you start working on them (only one at a time)
- Mark tasks as 'completed' immediately when finished
- Use update_todo_list to track your progress throughout the task
- Todo lists provide visual feedback with colors: ✅ Green (completed), 🔄 Cyan (in progress), ⏳ Yellow (pending)
- Always create todos with priorities: 'high' (🔴), 'medium' (🟡), 'low' (🟢)

USER CONFIRMATION SYSTEM:
File operations (create_file, str_replace_editor) and bash commands will automatically request user confirmation before execution. The confirmation system will show users the actual content or command before they decide. Users can choose to approve individual operations or approve all operations of that type for the session.

If a user rejects an operation, the tool will return an error and you should not proceed with that specific operation.

Be helpful, direct, and efficient. Always explain what you're doing and show the results.

IMPORTANT RESPONSE GUIDELINES:
- After using tools, do NOT respond with pleasantries like "Thanks for..." or "Great!"
- Only provide necessary explanations or next steps if relevant to the task
- Keep responses concise and focused on the actual work being done
- If a tool execution completes the user's request, you can remain silent or give a brief confirmation

Current working directory: ${process.cwd()}`,
    });
  }

  /**
   * Set the active provider dynamically
   */
  public async setProvider(providerId: string): Promise<void> {
    const manager = getSettingsManager();

    // Normalize provider ID
    const activeProviderId = (providerId || "grok").toLowerCase();

    // First set the active provider in settings
    manager.setActiveProvider(activeProviderId);

    // Now get the config using the settings manager's method
    const providerConfig = manager.getActiveProviderConfig();
    const providerType = providerConfig?.provider || activeProviderId;

    // Validate provider exists
    if (!providerConfig) {
      throw new Error(`Provider '${activeProviderId}' not found in settings`);
    }

    // Validate API key
    const effectiveApiKey = providerConfig.api_key || "";
    if (!effectiveApiKey && providerType !== "openai-compatible") {
      throw new Error(`API key not found for provider '${activeProviderId}'`);
    }

    let effectiveBaseURL = providerConfig.base_url || undefined;

    // Cloudflare Workers AI specific handling
    if (
      providerType === "workers-ai" &&
      effectiveBaseURL?.includes("{ACCOUNT_ID}")
    ) {
      if (providerConfig?.account_id) {
        effectiveBaseURL = effectiveBaseURL.replace(
          "{ACCOUNT_ID}",
          providerConfig.account_id,
        );
      } else {
        throw new Error(
          `Account ID not found for Workers AI provider '${activeProviderId}'`,
        );
      }
    }

    // Validate model exists for provider
    const effectiveModel =
      providerConfig.model ||
      providerConfig.default_model ||
      "grok-code-fast-1";

    // For providers that have model lists, validate the model
    if (this.superAgentClient.listModels) {
      // Try to get models, but don't fail if it's not available
      try {
        const availableModels = await this.superAgentClient.listModels();
        if (
          availableModels.length > 0 &&
          !availableModels.includes(effectiveModel)
        ) {
          console.warn(
            `Warning: Model '${effectiveModel}' may not be available for provider '${activeProviderId}'`,
          );
        }
      } catch (error) {
        // Ignore errors when checking available models
      }
    }

    try {
      // Re-instantiate appropriate provider
      if (providerType === "openai") {
        this.superAgentClient = new OpenAIProvider(
          effectiveApiKey,
          effectiveBaseURL,
          effectiveModel,
        );
      } else if (providerType === "gemini" || providerType === "google") {
        this.superAgentClient = new GeminiProvider(
          effectiveApiKey,
          effectiveBaseURL,
          effectiveModel,
        );
      } else if (providerType === "grok") {
        this.superAgentClient = new GrokProvider(
          effectiveApiKey,
          effectiveBaseURL,
          effectiveModel,
        );
      } else if (providerType === "deepseek") {
        this.superAgentClient = new DeepSeekProvider(
          effectiveApiKey,
          effectiveBaseURL,
          effectiveModel,
        );
      } else if (providerType === "ollama") {
        this.superAgentClient = new OllamaProvider(
          effectiveApiKey,
          effectiveBaseURL,
          effectiveModel,
        );
      } else if (providerType === "mistral") {
        this.superAgentClient = new MistralProvider(
          effectiveApiKey,
          effectiveBaseURL,
          effectiveModel,
        );
      } else if (providerType === "groq") {
        this.superAgentClient = new GroqProvider(
          effectiveApiKey,
          effectiveBaseURL,
          effectiveModel,
        );
      } else if (providerType === "openrouter") {
        this.superAgentClient = new OpenRouterProvider(
          effectiveApiKey,
          effectiveBaseURL,
          effectiveModel,
        );
      } else {
        this.superAgentClient = new OpenAICompatibleProvider(
          effectiveApiKey,
          effectiveBaseURL || "",
          effectiveModel,
          activeProviderId,
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize provider '${activeProviderId}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Update token counter with new model
    this.tokenCounter = createTokenCounter(effectiveModel);
  }

  public async listModels(): Promise<string[]> {
    if (this.superAgentClient.listModels) {
      return this.superAgentClient.listModels();
    }
    return [];
  }

  private async initializeMCP(): Promise<void> {
    // Initialize MCP in the background without blocking
    Promise.resolve().then(async () => {
      try {
        const config = loadMCPConfig();
        if (config.servers.length > 0) {
          await initializeMCPServers();
        }
      } catch (error) {
        console.warn("MCP initialization failed:", error);
      } finally {
        this.mcpInitialized = true;
      }
    });
  }

  private isGrokModel(): boolean {
    // If provider is grok or generic provider wrapping grok (if we can tell)
    // For now stick to simple name check
    return (
      this.superAgentClient.name === "grok" ||
      this.superAgentClient.name.includes("grok")
    );
  }

  // Heuristic: enable web search only when likely needed
  private shouldUseSearchFor(message: string): boolean {
    const q = message.toLowerCase();
    const keywords = [
      "today",
      "latest",
      "news",
      "trending",
      "breaking",
      "current",
      "now",
      "recent",
      "x.com",
      "twitter",
      "tweet",
      "what happened",
      "as of",
      "update on",
      "release notes",
      "changelog",
      "price",
    ];
    if (keywords.some(k => q.includes(k))) {
      return true;
    }
    // crude date pattern (e.g., 2024/2025) may imply recency
    if (/(20\d{2})/.test(q)) {
      return true;
    }
    return false;
  }

  private pruneMessages(maxTokens: number = 100000): void {
    const systemMessage = this.messages[0];
    if (systemMessage.role !== "system") {
      return;
    }

    let currentTokens = this.tokenCounter.countMessageTokens(
      this.messages as any,
    );
    if (currentTokens <= maxTokens) {
      return;
    }

    // Keep removing messages from the beginning (after system message) until we are under the limit
    while (this.messages.length > 2 && currentTokens > maxTokens) {
      this.messages.splice(1, 1);
      currentTokens = this.tokenCounter.countMessageTokens(
        this.messages as any,
      );
    }
  }

  async processUserMessage(message: string): Promise<ChatEntry[]> {
    // Add user message to conversation
    const userEntry: ChatEntry = {
      type: "user",
      content: message,
      timestamp: new Date(),
    };
    this.chatHistory.push(userEntry);
    this.messages.push({ role: "user", content: message });

    // Prune context before sending
    const maxContextTokens =
      Number(process.env.SUPER_AGENT_MAX_CONTEXT_TOKENS) || 100000;
    this.pruneMessages(maxContextTokens);

    const newEntries: ChatEntry[] = [userEntry];
    const maxToolRounds = this.maxToolRounds;
    let toolRounds = 0;

    try {
      const tools = await getAllSuperAgentTools();
      let currentResponse = await this.superAgentClient.chat(this.messages, {
        tools: tools as any,
        search_parameters:
          this.isGrokModel() && this.shouldUseSearchFor(message)
            ? { mode: "auto" }
            : { mode: "off" },
      });

      // Agent loop - continue until no more tool calls or max rounds reached
      while (toolRounds < maxToolRounds) {
        const assistantMessage = currentResponse.choices[0]?.message;

        if (!assistantMessage) {
          throw new Error("No response from provider");
        }

        // Handle tool calls
        if (
          assistantMessage.tool_calls &&
          assistantMessage.tool_calls.length > 0
        ) {
          toolRounds++;

          // Add assistant message with tool calls
          const assistantEntry: ChatEntry = {
            type: "assistant",
            content: assistantMessage.content || "Using tools to help you...",
            timestamp: new Date(),
            toolCalls: assistantMessage.tool_calls,
          };
          this.chatHistory.push(assistantEntry);
          newEntries.push(assistantEntry);

          // Add assistant message to conversation
          this.messages.push({
            role: "assistant",
            content: assistantMessage.content || "",
            tool_calls: assistantMessage.tool_calls,
          } as any);

          // Create initial tool call entries to show tools are being executed
          assistantMessage.tool_calls.forEach(toolCall => {
            const toolCallEntry: ChatEntry = {
              type: "tool_call",
              content: "Executing...",
              timestamp: new Date(),
              toolCall: toolCall,
            };
            this.chatHistory.push(toolCallEntry);
            newEntries.push(toolCallEntry);
          });

          // Execute tool calls and update the entries
          for (const toolCall of assistantMessage.tool_calls) {
            const result = await this.executeTool(toolCall);

            // Update the existing tool_call entry with the result
            const entryIndex = this.chatHistory.findIndex(
              entry =>
                entry.type === "tool_call" &&
                entry.toolCall?.id === toolCall.id,
            );

            if (entryIndex !== -1) {
              const updatedEntry: ChatEntry = {
                ...this.chatHistory[entryIndex],
                type: "tool_result",
                content: result.success
                  ? result.output || "Success"
                  : result.error || "Error occurred",
                toolResult: result,
              };
              this.chatHistory[entryIndex] = updatedEntry;

              // Also update in newEntries for return value
              const newEntryIndex = newEntries.findIndex(
                entry =>
                  entry.type === "tool_call" &&
                  entry.toolCall?.id === toolCall.id,
              );
              if (newEntryIndex !== -1) {
                newEntries[newEntryIndex] = updatedEntry;
              }
            }

            // Add tool result to messages with proper format (needed for AI context)
            this.messages.push({
              role: "tool",
              content: result.success
                ? result.output || "Success"
                : result.error || "Error",
              tool_call_id: toolCall.id,
            });
          }

          // Get next response - this might contain more tool calls
          currentResponse = await this.superAgentClient.chat(this.messages, {
            tools: tools as any,
            search_parameters:
              this.isGrokModel() && this.shouldUseSearchFor(message)
                ? { mode: "auto" }
                : { mode: "off" },
          });
        } else {
          // No more tool calls, add final response
          const finalEntry: ChatEntry = {
            type: "assistant",
            content:
              assistantMessage.content ||
              "I understand, but I don't have a specific response.",
            timestamp: new Date(),
          };
          this.chatHistory.push(finalEntry);
          this.messages.push({
            role: "assistant",
            content: assistantMessage.content || "",
          });
          newEntries.push(finalEntry);
          break; // Exit the loop
        }
      }

      if (toolRounds >= maxToolRounds) {
        const warningEntry: ChatEntry = {
          type: "assistant",
          content:
            "Maximum tool execution rounds reached. Stopping to prevent infinite loops.",
          timestamp: new Date(),
        };
        this.chatHistory.push(warningEntry);
        newEntries.push(warningEntry);
      }

      return newEntries;
    } catch (error: any) {
      const errorEntry: ChatEntry = {
        type: "assistant",
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      };
      this.chatHistory.push(errorEntry);
      return [userEntry, errorEntry];
    }
  }

  private messageReducer(previous: any, item: any): any {
    const reduce = (acc: any, delta: any) => {
      acc = { ...acc };
      for (const [key, value] of Object.entries(delta)) {
        if (acc[key] === undefined || acc[key] === null) {
          acc[key] = value;
          // Clean up index properties from tool calls
          if (Array.isArray(acc[key])) {
            for (const arr of acc[key]) {
              delete arr.index;
            }
          }
        } else if (typeof acc[key] === "string" && typeof value === "string") {
          (acc[key] as string) += value;
        } else if (Array.isArray(acc[key]) && Array.isArray(value)) {
          const accArray = acc[key] as any[];
          for (let i = 0; i < value.length; i++) {
            if (!accArray[i]) {
              accArray[i] = {};
            }
            accArray[i] = reduce(accArray[i], value[i]);
          }
        } else if (typeof acc[key] === "object" && typeof value === "object") {
          acc[key] = reduce(acc[key], value);
        }
      }
      return acc;
    };

    return reduce(previous, item.choices[0]?.delta || {});
  }

  async *processUserMessageStream(
    message: string,
  ): AsyncGenerator<StreamingChunk, void, unknown> {
    // Create new abort controller for this request
    this.abortController = new AbortController();

    // Add user message to conversation
    const userEntry: ChatEntry = {
      type: "user",
      content: message,
      timestamp: new Date(),
    };
    this.chatHistory.push(userEntry);
    this.messages.push({ role: "user", content: message });

    // Prune context before sending
    const maxContextTokens =
      Number(process.env.SUPER_AGENT_MAX_CONTEXT_TOKENS) || 100000;
    this.pruneMessages(maxContextTokens);

    // Calculate input tokens
    let inputTokens = this.tokenCounter.countMessageTokens(
      this.messages as any,
    );
    yield {
      type: "token_count",
      tokenCount: inputTokens,
    };

    const maxToolRounds = this.maxToolRounds;
    let toolRounds = 0;
    let totalOutputTokens = 0;
    let lastTokenUpdate = 0;

    try {
      // Agent loop - continue until no more tool calls or max rounds reached
      while (toolRounds < maxToolRounds) {
        // Check if operation was cancelled
        if (this.abortController?.signal.aborted) {
          yield {
            type: "content",
            content: "\n\n[Operation cancelled by user]",
          };
          yield { type: "done" };
          return;
        }

        // Stream response and accumulate
        const tools = await getAllSuperAgentTools();
        const stream = this.superAgentClient.chatStream(this.messages, {
          tools: tools as any,
          search_parameters:
            this.isGrokModel() && this.shouldUseSearchFor(message)
              ? { mode: "auto" }
              : { mode: "off" },
        });
        let accumulatedMessage: any = {};
        let accumulatedContent = "";
        let toolCallsYielded = false;

        for await (const chunk of stream) {
          // Check for cancellation in the streaming loop
          if (this.abortController?.signal.aborted) {
            yield {
              type: "content",
              content: "\n\n[Operation cancelled by user]",
            };
            yield { type: "done" };
            return;
          }

          if (!chunk.choices?.[0]) {
            continue;
          }

          // Accumulate the message using reducer
          accumulatedMessage = this.messageReducer(accumulatedMessage, chunk);

          // Check for tool calls - yield when we have complete tool calls with function names
          if (!toolCallsYielded && accumulatedMessage.tool_calls?.length > 0) {
            // Check if we have at least one complete tool call with a function name
            const hasCompleteTool = accumulatedMessage.tool_calls.some(
              (tc: any) => tc.function?.name,
            );
            if (hasCompleteTool) {
              yield {
                type: "tool_calls",
                toolCalls: accumulatedMessage.tool_calls,
              };
              toolCallsYielded = true;
            }
          }

          // Stream content as it comes
          if (chunk.choices[0].delta?.content) {
            accumulatedContent += chunk.choices[0].delta.content;

            // Update token count in real-time including accumulated content and any tool calls
            const currentOutputTokens =
              this.tokenCounter.estimateStreamingTokens(accumulatedContent) +
              (accumulatedMessage.tool_calls
                ? this.tokenCounter.countTokens(
                    JSON.stringify(accumulatedMessage.tool_calls),
                  )
                : 0);
            totalOutputTokens = currentOutputTokens;

            yield {
              type: "content",
              content: chunk.choices[0].delta.content,
            };

            // Emit token count update
            const now = Date.now();
            if (now - lastTokenUpdate > 250) {
              lastTokenUpdate = now;
              yield {
                type: "token_count",
                tokenCount: inputTokens + totalOutputTokens,
              };
            }
          }
        }

        // Add assistant entry to history
        const assistantEntry: ChatEntry = {
          type: "assistant",
          content: accumulatedMessage.content || "Using tools to help you...",
          timestamp: new Date(),
          toolCalls: accumulatedMessage.tool_calls || undefined,
        };
        this.chatHistory.push(assistantEntry);

        // Add accumulated message to conversation
        this.messages.push({
          role: "assistant",
          content: accumulatedMessage.content || "",
          tool_calls: accumulatedMessage.tool_calls,
        } as any);

        // Handle tool calls if present
        if (accumulatedMessage.tool_calls?.length > 0) {
          toolRounds++;

          // Only yield tool_calls if we haven't already yielded them during streaming
          if (!toolCallsYielded) {
            yield {
              type: "tool_calls",
              toolCalls: accumulatedMessage.tool_calls,
            };
          }

          // Execute tools
          for (const toolCall of accumulatedMessage.tool_calls) {
            // Check for cancellation before executing each tool
            if (this.abortController?.signal.aborted) {
              yield {
                type: "content",
                content: "\n\n[Operation cancelled by user]",
              };
              yield { type: "done" };
              return;
            }

            const result = await this.executeTool(toolCall);

            const toolResultEntry: ChatEntry = {
              type: "tool_result",
              content: result.success
                ? result.output || "Success"
                : result.error || "Error occurred",
              timestamp: new Date(),
              toolCall: toolCall,
              toolResult: result,
            };
            this.chatHistory.push(toolResultEntry);

            yield {
              type: "tool_result",
              toolCall,
              toolResult: result,
            };

            // Add tool result with proper format (needed for AI context)
            this.messages.push({
              role: "tool",
              content: result.success
                ? result.output || "Success"
                : result.error || "Error",
              tool_call_id: toolCall.id,
            });
          }

          // Update token count after processing all tool calls to include tool results
          inputTokens = this.tokenCounter.countMessageTokens(
            this.messages as any,
          );
          // Final token update after tools processed
          yield {
            type: "token_count",
            tokenCount: inputTokens + totalOutputTokens,
          };

          // Continue the loop to get the next response (which might have more tool calls)
        } else {
          // No tool calls, we're done
          break;
        }
      }

      if (toolRounds >= maxToolRounds) {
        yield {
          type: "content",
          content:
            "\n\nMaximum tool execution rounds reached. Stopping to prevent infinite loops.",
        };
      }

      yield { type: "done" };
    } catch (error: any) {
      // Check if this was a cancellation
      if (this.abortController?.signal.aborted) {
        yield {
          type: "content",
          content: "\n\n[Operation cancelled by user]",
        };
        yield { type: "done" };
        return;
      }

      const errorEntry: ChatEntry = {
        type: "assistant",
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      };
      this.chatHistory.push(errorEntry);
      yield {
        type: "content",
        content: errorEntry.content,
      };
      yield { type: "done" };
    } finally {
      // Clean up abort controller
      this.abortController = null;
    }
  }

  private async executeTool(toolCall: LLMToolCall): Promise<ToolResult> {
    try {
      const args = JSON.parse(toolCall.function.arguments);

      switch (toolCall.function.name) {
        case "view_file":
          const range: [number, number] | undefined =
            args.start_line && args.end_line
              ? [args.start_line, args.end_line]
              : undefined;
          return await this.textEditor.view(args.path, range);

        case "create_file":
          return await this.textEditor.create(args.path, args.content);

        case "str_replace_editor":
          return await this.textEditor.strReplace(
            args.path,
            args.old_str,
            args.new_str,
            args.replace_all,
          );

        case "edit_file":
          if (!this.morphEditor) {
            return {
              success: false,
              error:
                "Morph Fast Apply not available. Please set MORPH_API_KEY environment variable to use this feature.",
            };
          }
          return await this.morphEditor.editFile(
            args.target_file,
            args.instructions,
            args.code_edit,
          );

        case "bash":
          return await this.bash.execute(args.command);

        case "create_todo_list":
          return await this.todoTool.createTodoList(args.todos);

        case "update_todo_list":
          return await this.todoTool.updateTodoList(args.updates);

        case "search":
          return await this.search.search(args.query, {
            searchType: args.search_type,
            includePattern: args.include_pattern,
            excludePattern: args.exclude_pattern,
            caseSensitive: args.case_sensitive,
            wholeWord: args.whole_word,
            regex: args.regex,
            maxResults: args.max_results,
            fileTypes: args.file_types,
            includeHidden: args.include_hidden,
          });

        case "project_map":
          return await this.projectMap.getProjectMap(args.max_depth);

        default:
          // Check if this is an MCP tool
          if (toolCall.function.name.startsWith("mcp__")) {
            return await this.executeMCPTool(toolCall);
          }

          return {
            success: false,
            error: `Unknown tool: ${toolCall.function.name}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Tool execution error: ${error.message}`,
      };
    }
  }

  /**
   * Abort the current operation
   */
  public abortCurrentOperation(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Set the model to use
   */
  public setModel(model: string): void {
    this.superAgentClient.setModel(model);
    // Update token counter with new model
    this.tokenCounter = createTokenCounter(model);
  }

  /**
   * Get the current model
   */
  public getCurrentModel(): string {
    return this.superAgentClient.getCurrentModel();
  }

  /**
   * Fetch available models from the current provider's API
   * This uses the provider's listModels() method with caching
   */
  public async fetchAvailableModels(
    forceRefresh: boolean = false,
  ): Promise<string[]> {
    const manager = getSettingsManager();
    const currentProviderId = this.superAgentClient.name;

    try {
      const models = await manager.fetchModelsForProvider(
        currentProviderId,
        forceRefresh,
        this.superAgentClient,
      );
      return models;
    } catch (error) {
      // If fetching fails, return the hardcoded list as fallback
      return manager.getAvailableModels(currentProviderId);
    }
  }

  /**
   * Execute a bash command directly
   * This is used by the UI/CLI for direct command execution
   */
  public async executeBashCommand(command: string): Promise<ToolResult> {
    return await this.bash.execute(command);
  }

  private async executeMCPTool(toolCall: LLMToolCall): Promise<ToolResult> {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      const mcpManager = getMCPManager();

      const result = await mcpManager.callTool(toolCall.function.name, args);

      if (result.isError) {
        return {
          success: false,
          error: (result.content[0] as any)?.text || "MCP tool error",
        };
      }

      // Extract content from result
      const output = result.content
        .map(item => {
          if (item.type === "text") {
            return item.text;
          } else if (item.type === "resource") {
            return `Resource: ${item.resource?.uri || "Unknown"}`;
          }
          return String(item);
        })
        .join("\n");

      return {
        success: true,
        output,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `MCP tool execution error: ${error.message}`,
      };
    }
  }
}
