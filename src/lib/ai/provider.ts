export type AiProviderId = "deepseek" | "moonshot";

const PROVIDERS: Record<
  AiProviderId,
  { baseUrl: string; env: "DEEPSEEK_API_KEY" | "MOONSHOT_API_KEY"; defaultModel: string; label: string }
> = {
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1/chat/completions",
    env: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-chat",
    label: "DeepSeek",
  },
  moonshot: {
    baseUrl: "https://api.moonshot.cn/v1/chat/completions",
    env: "MOONSHOT_API_KEY",
    defaultModel: "moonshot-v1-128k",
    label: "Moonshot",
  },
};

export function providerConfig(provider: AiProviderId) {
  return PROVIDERS[provider];
}

export function isAiProvider(value: string | null | undefined): value is AiProviderId {
  return value === "deepseek" || value === "moonshot";
}

export function defaultModelFor(provider: AiProviderId) {
  return PROVIDERS[provider].defaultModel;
}

function readKey(provider: AiProviderId): string {
  const config = PROVIDERS[provider];
  const key = process.env[config.env]?.trim();
  if (!key) {
    throw new Error(`The ${config.label} key is not configured on the server.`);
  }
  return key;
}

function redact(message: string, key: string) {
  return message.split(key).join("[redacted]");
}

type Completion = {
  content: string;
  promptTokens: number;
  completionTokens: number;
};

async function requestCompletion(
  provider: AiProviderId,
  model: string,
  system: string,
  user: string,
  jsonMode: boolean
): Promise<Response> {
  const key = readKey(provider);
  const body: Record<string, unknown> = {
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  let response: Response;
  try {
    response = await fetch(PROVIDERS[provider].baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The provider could not be reached.";
    throw new Error(redact(message, key));
  }

  if (!response.ok) {
    const detail = redact(await response.text(), key).slice(0, 500);
    const failure = new Error(
      `${PROVIDERS[provider].label} returned ${response.status}: ${detail}`
    );
    (failure as Error & { status?: number }).status = response.status;
    throw failure;
  }

  return response;
}

export async function completeJson(input: {
  provider: AiProviderId;
  model: string | null;
  system: string;
  user: string;
}): Promise<Completion> {
  const model = input.model?.trim() || defaultModelFor(input.provider);
  let response: Response;
  try {
    response = await requestCompletion(input.provider, model, input.system, input.user, true);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 400) throw error;
    response = await requestCompletion(input.provider, model, input.system, input.user, false);
  }

  const key = readKey(input.provider);
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(redact("The provider returned an empty notebook section.", key));
  }

  return {
    content,
    promptTokens: payload.usage?.prompt_tokens ?? 0,
    completionTokens: payload.usage?.completion_tokens ?? 0,
  };
}
