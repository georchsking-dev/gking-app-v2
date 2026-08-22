import type { DMessageFragment } from '~/common/stores/chat/chat.fragments';
import {
  type DLLM,
  getLLMLabel,
  isLLMVisible,
  LLM_IF_OAI_Vision,
  LLM_IF_Outputs_Audio,
  LLM_IF_Outputs_Image,
  LLM_IF_Outputs_NoText,
} from '~/common/stores/llms/llms.types';
import type { ModelVendorId } from '~/modules/llms/vendors/vendors.registry';

export type JorgisHistoryMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  provider?: string;
  model?: string;
  source: 'gking' | 'local';
  imageUrls?: string[];
  hasVideo?: boolean;
};

export type JorgisImageAttachment = {
  name: string;
  mimeType: string;
  file: File;
};

export type JorgisGKingResult = {
  available: boolean;
  response?: string;
  provider?: string;
  model?: string;
  retries?: number;
  mediaCreated?: 'image' | 'video';
  errors?: string[];
};

export type JorgisRequestKind = 'conversation' | 'image' | 'video' | 'music';

const JORGIS_CONVERSATION_KEY = 'gking.jorgis.conversation.v1';
const PROVIDER_PRIORITY: readonly ModelVendorId[] = [
  'googleai',
  'groq',
  'openrouter',
  'anthropic',
  'xai',
  'mistral',
  'deepseek',
  'cerebras',
  'togetherai',
  'perplexity',
  'zai',
  'huggingface',
  'openai',
  'ollama',
  'lmstudio',
  'localai',
];

function modelSupportsRequest(model: DLLM, requestKind: JorgisRequestKind, hasImages: boolean): boolean {
  if (!isLLMVisible(model)) return false;
  if (hasImages && !model.interfaces.includes(LLM_IF_OAI_Vision)) return false;

  if (requestKind === 'image')
    return model.interfaces.includes(LLM_IF_Outputs_Image);
  if (requestKind === 'video')
    return /\b(veo|video|omni)\b/i.test(`${model.id} ${getLLMLabel(model)}`);
  if (requestKind === 'music')
    return model.interfaces.includes(LLM_IF_Outputs_Audio)
      && /\b(lyria|music|audio)\b/i.test(`${model.id} ${getLLMLabel(model)}`);

  return !model.interfaces.includes(LLM_IF_Outputs_NoText);
}

function modelQualityScore(model: DLLM, requestKind: JorgisRequestKind): number {
  let score = model.benchmark?.cbaElo ?? 0;
  if (model.userStarred) score += 10000;
  if (requestKind === 'conversation' && model.interfaces.includes(LLM_IF_Outputs_Image)) score -= 5000;
  if (/\b(0[.,]?5b|1b|1[.,]?5b|2b|3b)\b/i.test(`${model.id} ${getLLMLabel(model)}`)) score -= 2000;
  if (/\b(7b|8b|mistral|dolphin)\b/i.test(`${model.id} ${getLLMLabel(model)}`)) score += 250;
  return score;
}

function buildFailoverRoute(
  models: DLLM[],
  activeModelId: string,
  requestKind: JorgisRequestKind,
  hasImages: boolean,
): DLLM[] {
  const eligible = models.filter(model => modelSupportsRequest(model, requestKind, hasImages));
  const active = eligible.find(model => model.id === activeModelId);
  const providers = [...new Set(eligible.map(model => model.vId))]
    .sort((a, b) => {
      const aRank = PROVIDER_PRIORITY.indexOf(a);
      const bRank = PROVIDER_PRIORITY.indexOf(b);
      return (aRank < 0 ? PROVIDER_PRIORITY.length : aRank) - (bRank < 0 ? PROVIDER_PRIORITY.length : bRank);
    });
  const route: DLLM[] = active ? [active] : [];
  const rankedByProvider = providers.map(provider => ({
    provider,
    models: eligible
      .filter(model => model.vId === provider && model.id !== active?.id)
      .sort((a, b) => modelQualityScore(b, requestKind) - modelQualityScore(a, requestKind))
      .slice(0, 2),
  }));

  // Round-robin across providers first, then try one alternate model per
  // provider. This prevents a depleted provider from blocking the others.
  for (let level = 0; level < 2; level++) {
    for (const group of rankedByProvider) {
      const candidate = group.models[level];
      if (candidate)
        route.push(candidate);
    }
  }
  return route;
}

async function loadChatModules() {
  const [storeModule, overlayModule, messageModule, fragmentModule, executeModule, imageAttachmentModule, imageAssetModule] = await Promise.all([
    import('~/common/stores/chat/store-chats'),
    import('~/common/chat-overlay/ConversationsManager'),
    import('~/common/stores/chat/chat.message'),
    import('~/common/stores/chat/chat.fragments'),
    import('../chat/editors/_handleExecute'),
    import('~/common/attachment-drafts/attachment.dblobs'),
    import('~/modules/dblobs/dblobs.images'),
  ]);
  return { ...storeModule, ...overlayModule, ...messageModule, ...fragmentModule, ...executeModule, ...imageAttachmentModule, ...imageAssetModule };
}

async function ensureJorgisConversation() {
  const modules = await loadChatModules();
  if (!modules.useChatStore.persist.hasHydrated())
    await modules.useChatStore.persist.rehydrate();

  const state = modules.useChatStore.getState();
  const storedId = typeof window !== 'undefined' ? window.localStorage.getItem(JORGIS_CONVERSATION_KEY) : null;
  const existing = storedId ? state.conversations.find(conversation => conversation.id === storedId) : null;
  if (existing)
    return { modules, conversationId: existing.id };

  const conversationId = state.prependNewConversation(undefined, false);
  state.setUserTitle(conversationId, 'Jorgis');
  if (typeof window !== 'undefined')
    window.localStorage.setItem(JORGIS_CONVERSATION_KEY, conversationId);
  return { modules, conversationId };
}

export async function loadJorgisHistory(): Promise<JorgisHistoryMessage[]> {
  const { modules, conversationId } = await ensureJorgisConversation();
  const history = modules.useChatStore.getState().historyView(conversationId) ?? [];
  const messages = history.filter(message => message.role !== 'system').slice(-40);
  const hydrated = await Promise.all(messages.map(async message => {
    if (message.role === 'system') return [];
    const text = modules.messageFragmentsReduceText(message.fragments, '\n\n', true).trim();
    const imageUrls: string[] = [];
    let hasVideo = false;
    for (const fragment of message.fragments) {
      if (!modules.isContentOrAttachmentFragment(fragment)) continue;
      const part = fragment.part;
      const legacyImagePart = modules.isZyncAssetImageReferencePartWithLegacyDBlob(part)
        ? part._legacyImageRefPart
        : modules.isImageRefPart(part) ? part : undefined;
      if (legacyImagePart?.dataRef.reftype === 'dblob') {
        const asset = await modules.getImageAsset(legacyImagePart.dataRef.dblobAssetId);
        if (asset)
          imageUrls.push(`data:${asset.data.mimeType};base64,${asset.data.base64}`);
      }
      if (part.pt === 'hosted_resource' && part.resource.via === 'gemini-file' && part.resource.isVideo)
        hasVideo = true;
    }
    if (!text && !imageUrls.length && !hasVideo) return [];
    const source = message.generator?.mgt === 'named' && message.generator.name === 'Jorgis local' ? 'local' : 'gking';
    return [{
      id: message.id,
      role: message.role,
      text: text || (hasVideo ? 'Video creado.' : 'Imagen creada.'),
      createdAt: message.created,
      model: message.generator?.mgt === 'named' ? message.generator.name : undefined,
      source,
      ...(imageUrls.length ? { imageUrls } : {}),
      ...(hasVideo ? { hasVideo: true } : {}),
    } satisfies JorgisHistoryMessage];
  }));
  return hydrated.flat();
}

export async function askGKing(
  text: string,
  images: JorgisImageAttachment[] = [],
  requestKind: JorgisRequestKind = 'conversation',
): Promise<JorgisGKingResult> {
  const { getChatLLMId, llmsStoreActions, llmsStoreState } = await import('~/common/stores/llms/store-llms');
  const activeModelId = getChatLLMId();
  if (!activeModelId)
    return { available: false, errors: ['No hay ningún modelo configurado.'] };

  const modelState = llmsStoreState();
  const originalAssignment = modelState.modelAssignments.primaryChat?.modelId;
  const route = buildFailoverRoute(modelState.llms, activeModelId, requestKind, images.length > 0);
  if (!route.length) {
    return {
      available: false,
      errors: [images.length
        ? 'No hay un modelo configurado que pueda procesar imágenes.'
        : `No hay un modelo configurado compatible con ${requestKind === 'image' ? 'imágenes' : requestKind === 'video' ? 'video' : requestKind === 'music' ? 'audio' : 'esta solicitud'}.`],
    };
  }

  const { modules, conversationId } = await ensureJorgisConversation();
  const handler = modules.ConversationsManager.getHandler(conversationId);
  const fragments: DMessageFragment[] = [modules.createTextContentFragment(text)];
  for (const image of images) {
    const fragment = await modules.imageDataToImageAttachmentFragmentViaDBlob(
      image.mimeType,
      image.file,
      { media: 'file', origin: 'file-open', fileWithHandle: image.file, refPath: image.name },
      image.name,
      '',
      false,
      'openai-high-res',
    );
    if (fragment) {
      await modules.transferAttachmentOwnedDBAsset(fragment, 'global', 'app-chat');
      fragments.push(fragment);
    }
  }
  const userMessage = modules.createDMessageFromFragments('user', fragments);
  handler.messageAppend(userMessage);

  const errors: string[] = [];
  for (let attempt = 0; attempt < route.length; attempt++) {
    const candidate = route[attempt];
    if (candidate.id !== getChatLLMId())
      llmsStoreActions().assignDomainModelId('primaryChat', candidate.id);

    if (attempt > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gking:route-status', {
        detail: {
          status: 'failover',
          attempt: attempt + 1,
          model: getLLMLabel(candidate),
          provider: candidate.vId,
        },
      }));
    }

    const historyBefore = handler.historyViewHeadOrThrow('jorgis-before-attempt');
    const messageIdsBefore = new Set(historyBefore.map(message => message.id));

    // Every attempt uses Big-AGI's native execution path. This keeps provider
    // credentials, streaming, tools and media handling in their existing owner.
    const result = await modules._handleExecute('generate-content', conversationId, 'jorgis-voice');
    const historyAfter = handler.historyViewHeadOrThrow('jorgis-result');
    const newAssistants = historyAfter.filter(message => message.role === 'assistant' && !messageIdsBefore.has(message.id));
    const assistant = newAssistants.at(-1);
    const providerErrors = newAssistants
      .flatMap(message => message.fragments.filter(modules.isErrorContentFragment).map(fragment => fragment.part.error))
      .filter(Boolean);

    if (assistant) {
      const hasImage = assistant.fragments.some(fragment => modules.isContentOrAttachmentFragment(fragment) && (
        modules.isZyncAssetImageReferencePart(fragment.part) || modules.isImageRefPart(fragment.part)
      ));
      const hasVideo = assistant.fragments.some(fragment => modules.isContentOrAttachmentFragment(fragment)
        && fragment.part.pt === 'hosted_resource'
        && fragment.part.resource.via === 'gemini-file'
        && fragment.part.resource.isVideo);
      const response = modules.messageFragmentsReduceText(assistant.fragments, '\n\n', true).trim();
      const completed = result === true && providerErrors.length === 0 && (response || hasImage || hasVideo);

      if (completed) {
        return {
          available: true,
          response,
          provider: candidate.vId,
          model: getLLMLabel(candidate),
          retries: attempt,
          ...(hasVideo ? { mediaCreated: 'video' as const } : hasImage ? { mediaCreated: 'image' as const } : {}),
        };
      }
    }

    const failure = providerErrors.length
      ? providerErrors.join(' · ')
      : typeof result === 'string'
        ? result
        : 'No devolvió una respuesta utilizable.';
    errors.push(`${getLLMLabel(candidate)} (${candidate.vId}): ${failure}`);
    if (newAssistants.length)
      handler.messagesDelete(newAssistants.map(message => message.id));
  }

  llmsStoreActions().assignDomainModelId('primaryChat', originalAssignment);
  return { available: false, errors };
}

export async function appendLocalImageExchange(text: string, imageBlob: Blob, imageName: string): Promise<void> {
  const { modules, conversationId } = await ensureJorgisConversation();
  const handler = modules.ConversationsManager.getHandler(conversationId);
  const imageFile = new File([imageBlob], imageName, { type: imageBlob.type || 'image/png' });
  const imageFragment = await modules.imageDataToImageAttachmentFragmentViaDBlob(
    imageFile.type,
    imageFile,
    { media: 'file', origin: 'file-open', fileWithHandle: imageFile, refPath: imageName },
    imageName,
    'Creada localmente por Jorgis',
    false,
    false,
  );
  handler.messageAppend(modules.createDMessageTextContent('user', text));
  if (!imageFragment) {
    handler.messageAppendAssistantText('La imagen local se generó, pero no pude guardarla en el historial.', 'Jorgis local');
    return;
  }
  await modules.transferAttachmentOwnedDBAsset(imageFragment, 'global', 'app-chat');
  handler.messageAppend(modules.createDMessageFromFragments('assistant', [
    modules.createTextContentFragment('Imagen creada localmente.'),
    imageFragment,
  ]));
}

export async function appendLocalExchange(text: string, response: string): Promise<void> {
  const { modules, conversationId } = await ensureJorgisConversation();
  const handler = modules.ConversationsManager.getHandler(conversationId);
  handler.messageAppend(modules.createDMessageTextContent('user', text));
  handler.messageAppendAssistantText(response, 'Jorgis local');
}

export async function clearJorgisHistory(): Promise<void> {
  const { modules, conversationId } = await ensureJorgisConversation();
  modules.ConversationsManager.getHandler(conversationId).historyClear();
}

export async function abortJorgisRequest(): Promise<void> {
  const { modules, conversationId } = await ensureJorgisConversation();
  modules.useChatStore.getState().abortConversationTemp(conversationId);
}
