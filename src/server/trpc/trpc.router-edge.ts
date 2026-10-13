import { createTRPCRouter } from './trpc.server';
import { aixRouter } from '~/modules/aix/server/api/aix.router';
import { llmOpenAIRouter } from '~/modules/llms/server/openai/openai.router';
import { llmAnthropicRouter } from '~/modules/llms/server/anthropic/anthropic.router';
import { llmGeminiRouter } from '~/modules/llms/server/gemini/gemini.router';
import { llmOllamaRouter } from '~/modules/llms/server/ollama/ollama.router';
import { llmBedrockRouter } from '~/modules/llms/server/bedrock/bedrock.router';
import { googleSearchRouter } from '~/modules/google/search.router';
import { backendRouter } from '~/modules/backend/backend.router';

export const appRouterEdge = createTRPCRouter({
  aix: aixRouter,
  backend: backendRouter,
  llmOpenAI: llmOpenAIRouter,
  llmAnthropic: llmAnthropicRouter,
  llmGemini: llmGeminiRouter,
  llmOllama: llmOllamaRouter,
  llmBedrock: llmBedrockRouter,
  googleSearch: googleSearchRouter,
});

export type AppRouterEdge = typeof appRouterEdge;
