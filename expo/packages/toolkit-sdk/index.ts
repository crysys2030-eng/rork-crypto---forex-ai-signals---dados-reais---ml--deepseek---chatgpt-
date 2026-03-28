import { z } from 'zod';

type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image"; image: string };
type UserMessage = { role: "user"; content: string | (TextPart | ImagePart)[] };
type AssistantMessage = { role: "assistant"; content: string | TextPart[] };

const TOOLKIT_URL = process.env["EXPO_PUBLIC_TOOLKIT_URL"] || "https://toolkit.rork.com";

export async function generateObject<T extends z.ZodType>(params: {
  messages: (UserMessage | AssistantMessage)[];
  schema: T;
}): Promise<z.infer<T>> {
  const result = await fetch(new URL("/agent/chat", TOOLKIT_URL).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: params.messages,
      schema: z.toJSONSchema(params.schema),
    }),
  });

  if (!result.ok) {
    throw new Error(`API request failed: ${result.statusText}`);
  }

  const data = await result.json();

  return params.schema.parse(data.object);
}

export async function generateText(
  params: string | { messages: (UserMessage | AssistantMessage)[] },
): Promise<string> {
  const messages: (UserMessage | AssistantMessage)[] = typeof params === "string"
    ? [{ role: "user", content: params }]
    : params.messages;

  const result = await fetch(new URL("/agent/chat", TOOLKIT_URL).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
    }),
  });

  if (!result.ok) {
    throw new Error(`API request failed: ${result.statusText}`);
  }

  const data = await result.json();

  return data.text;
}

export { createRorkTool, useRorkAgent } from './agent';
