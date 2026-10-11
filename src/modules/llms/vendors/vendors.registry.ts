import type { IModelVendor } from './IModelVendor';

export type ModelVendorId =
  | 'alibaba'
  | 'anthropic'
  | 'azure'
  | 'bedrock'
  | 'cerebras'
  | 'cohere'
  | 'deepseek'
  | 'googleai'
  | 'groq'
  | 'lmstudio'
  | 'localai'
  | 'mistral'
  | 'moonshot'
  | 'ollama'
  | 'openai'
  | 'openrouter'
  | 'perplexity'
  | 'sakanaai'
  | 'togetherai'
  | 'xai'
  | 'zai'
  | 'huggingface';

export const ModelVendors: Record<ModelVendorId, IModelVendor> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    location: 'cloud',
    displayGroup: 'popular',
    displayRank: 10,
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    location: 'cloud',
    displayGroup: 'popular',
    displayRank: 20,
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  googleai: {
    id: 'googleai',
    name: 'Gemini',
    location: 'cloud',
    displayGroup: 'popular',
    displayRank: 30,
    hasFreeModels: true,
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    location: 'cloud',
    displayGroup: 'popular',
    displayRank: 40,
    hasFreeModels: true,
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    location: 'cloud',
    displayGroup: 'popular',
    displayRank: 50,
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    location: 'cloud',
    displayGroup: 'popular',
    displayRank: 60,
    hasFreeModels: true,
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    location: 'local',
    displayGroup: 'local',
    displayRank: 10,
    hasFreeModels: true,
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    location: 'local',
    displayGroup: 'local',
    displayRank: 20,
    hasFreeModels: true,
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  localai: {
    id: 'localai',
    name: 'LocalAI',
    location: 'local',
    displayGroup: 'local',
    displayRank: 30,
    hasFreeModels: true,
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  alibaba: {
    id: 'alibaba',
    name: 'Alibaba Cloud',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  azure: {
    id: 'azure',
    name: 'Azure OpenAI',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  bedrock: {
    id: 'bedrock',
    name: 'AWS Bedrock',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  cohere: {
    id: 'cohere',
    name: 'Cohere',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  moonshot: {
    id: 'moonshot',
    name: 'Moonshot',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  sakanaai: {
    id: 'sakanaai',
    name: 'Sakana AI',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  togetherai: {
    id: 'togetherai',
    name: 'Together AI',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  xai: {
    id: 'xai',
    name: 'xAI',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  zai: {
    id: 'zai',
    name: 'Z-AI',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
  huggingface: {
    id: 'huggingface',
    name: 'Hugging Face',
    location: 'cloud',
    displayGroup: 'cloud',
    getTransportAccess: (setup) => setup || {},
    rpcUpdateModelsOrThrow: async () => ({ models: [] }),
  },
};

export function findModelVendor(vendorId: string | undefined): IModelVendor | null {
  if (!vendorId) return null;
  return ModelVendors[vendorId as ModelVendorId] ?? null;
}

export function findAllModelVendors(): IModelVendor[] {
  return Object.values(ModelVendors);
}
