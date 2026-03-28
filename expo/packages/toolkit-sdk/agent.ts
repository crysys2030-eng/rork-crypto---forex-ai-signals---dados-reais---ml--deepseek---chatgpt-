import { useState, useCallback } from 'react';
import { z } from 'zod';

const TOOLKIT_URL = process.env["EXPO_PUBLIC_TOOLKIT_URL"] || "https://toolkit.rork.com";

type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image"; image: string };
type ToolInputPart = { type: "tool"; toolName: string; state: "input-streaming" | "input-available"; input: Record<string, unknown> };
type ToolOutputPart = { type: "tool"; toolName: string; state: "output-available"; output: unknown };
type ToolErrorPart = { type: "tool"; toolName: string; state: "output-error"; errorText: string };
type ToolPart = ToolInputPart | ToolOutputPart | ToolErrorPart;

type Message = {
  id: string;
  role: "user" | "assistant";
  parts: (TextPart | ImagePart | ToolPart)[];
};

type File = {
  type: "file";
  mimeType: string;
  uri: string;
};

type MessageObject = {
  text: string;
  files?: File[];
};

type RorkTool<TInput extends Record<string, unknown>> = {
  description: string;
  zodSchema: z.ZodType<TInput>;
  execute?: (input: TInput) => void | Promise<void>;
};

export function createRorkTool<TInput extends Record<string, unknown>>(config: {
  description: string;
  zodSchema: z.ZodType<TInput>;
  execute?: (input: TInput) => void | Promise<void>;
}): RorkTool<TInput> {
  return config;
}

export function useRorkAgent<TTools extends Record<string, RorkTool<any>>>(config: {
  tools: TTools;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (input: string | MessageObject) => {
    setIsLoading(true);
    setError(null);

    const messageText = typeof input === "string" ? input : input.text;
    const files = typeof input === "string" ? undefined : input.files;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      parts: [{ type: "text", text: messageText }],
    };

    if (files) {
      files.forEach(file => {
        userMessage.parts.push({
          type: "image",
          image: file.uri,
        });
      });
    }

    setMessages(prev => [...prev, userMessage]);

    try {
      const toolSchemas = Object.entries(config.tools).reduce((acc, [name, tool]) => {
        acc[name] = {
          description: tool.description,
          schema: z.toJSONSchema(tool.zodSchema),
        };
        return acc;
      }, {} as Record<string, { description: string; schema: unknown }>);

      const response = await fetch(new URL("/agent/chat", TOOLKIT_URL).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.parts.filter(p => p.type === "text" || p.type === "image").map(p => {
              if (p.type === "text") return { type: "text", text: p.text };
              if (p.type === "image") return { type: "image", image: p.image };
              return null;
            }).filter(Boolean),
          })),
          tools: toolSchemas,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        parts: data.parts || [{ type: "text", text: data.text || "" }],
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.toolCalls) {
        for (const toolCall of data.toolCalls) {
          const tool = config.tools[toolCall.name];
          if (tool && tool.execute) {
            try {
              await tool.execute(toolCall.input);
            } catch (err) {
              console.error(`Error executing tool ${toolCall.name}:`, err);
            }
          }
        }
      }
    } catch (err) {
      setError(err as Error);
      console.error("Error sending message:", err);
    } finally {
      setIsLoading(false);
    }
  }, [messages, config.tools]);

  const addToolResult = useCallback((toolName: string, result: unknown) => {
    setMessages(prev => {
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      
      if (lastMessage && lastMessage.role === "assistant") {
        const toolPart = lastMessage.parts.find(
          p => p.type === "tool" && p.toolName === toolName
        ) as ToolInputPart | undefined;

        if (toolPart) {
          const index = lastMessage.parts.indexOf(toolPart);
          lastMessage.parts[index] = {
            type: "tool",
            toolName,
            state: "output-available",
            output: result,
          };
        }
      }

      return updated;
    });
  }, []);

  return {
    messages,
    error,
    isLoading,
    sendMessage,
    addToolResult,
    setMessages,
  };
}
