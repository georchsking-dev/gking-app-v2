import type { DMessageFragment } from '~/common/stores/chat/chat.fragments';

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
  mediaCreated?: 'image' | 'video';
  errors?: string[];
};

const JORGIS_CONVERSATION_KEY = 'gking.jorgis.conversation.v1';

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

export async function askGKing(text: string, images: JorgisImageAttachment[] = []): Promise<JorgisGKingResult> {
  const { getChatLLMId } = await import('~/common/stores/llms/store-llms');
  if (!getChatLLMId())
    return { available: false };

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

  // Jorgis is intentionally a thin voice shell. Big-AGI's native AIX pipeline
  // owns the selected model, provider credentials, streaming, tools and errors.
  const result = await modules._handleExecute('generate-content', conversationId, 'jorgis-voice');
  if (result === 'err-no-chatllm' || result === 'err-no-chatmode')
    return { available: false };

  const history = handler.historyViewHeadOrThrow('jorgis-result');
  const assistant = [...history].reverse().find(message => message.role === 'assistant');
  if (!assistant)
    return { available: true, response: 'No pude completar la respuesta en este momento.' };

  if (result !== true) {
    handler.messagesDelete([userMessage.id, assistant.id]);
    return { available: false, errors: ['El modelo activo no completó la solicitud.'] };
  }
  const hasImage = assistant.fragments.some(fragment => modules.isContentOrAttachmentFragment(fragment) && (
    modules.isZyncAssetImageReferencePart(fragment.part) || modules.isImageRefPart(fragment.part)
  ));
  const hasVideo = assistant.fragments.some(fragment => modules.isContentOrAttachmentFragment(fragment)
    && fragment.part.pt === 'hosted_resource'
    && fragment.part.resource.via === 'gemini-file'
    && fragment.part.resource.isVideo);
  return {
    available: true,
    response: modules.messageFragmentsReduceText(assistant.fragments, '\n\n', true).trim(),
    model: assistant.generator?.mgt === 'named' ? assistant.generator.name : undefined,
    ...(hasVideo ? { mediaCreated: 'video' as const } : hasImage ? { mediaCreated: 'image' as const } : {}),
  };
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
