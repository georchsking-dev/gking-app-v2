import * as React from 'react';

import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import {
  Box, Button, Chip, Divider, FormControl, FormLabel, Modal, ModalClose,
  ModalDialog, Option, Select, Stack, Switch, Typography,
} from '@mui/joy';

import { isLLMVisible } from '~/common/stores/llms/llms.types';
import { getChatLLMId, useModelsStore } from '~/common/stores/llms/store-llms';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI', googleai: 'Gemini', anthropic: 'Anthropic', openrouter: 'OpenRouter',
  groq: 'Groq', xai: 'xAI / Grok', mistral: 'Mistral', huggingface: 'Hugging Face',
  ollama: 'Ollama local', lmstudio: 'LM Studio local', localai: 'LocalAI', azure: 'Azure OpenAI',
  bedrock: 'AWS Bedrock', deepseek: 'DeepSeek', perplexity: 'Perplexity', togetherai: 'Together AI',
};

export function JorgisSettings(props: {
  open: boolean;
  onClose: () => void;
  autoSpeak: boolean;
  onAutoSpeakChange: (enabled: boolean) => void;
  continuousConversation: boolean;
  onContinuousConversationChange: (enabled: boolean) => void;
  onClearHistory: () => Promise<void>;
  onOpenModels: () => void;
  localAvailable?: boolean;
  localModel?: string;
}) {
  const allModels = useModelsStore(state => state.llms);
  const assignedModelId = useModelsStore(state => state.modelAssignments.primaryChat?.modelId);
  const assignModel = useModelsStore(state => state.assignDomainModelId);
  const visibleModels = React.useMemo(() => allModels.filter(isLLMVisible), [allModels]);
  const activeModelId = assignedModelId ?? getChatLLMId();
  const activeModel = visibleModels.find(model => model.id === activeModelId);
  const localModels = visibleModels.filter(model => ['ollama', 'lmstudio', 'localai'].includes(model.vId));

  return <Modal open={props.open} onClose={props.onClose}>
    <ModalDialog
      aria-labelledby='jorgis-settings-title'
      sx={{
        width: 'min(680px, calc(100vw - 24px))', maxHeight: 'calc(100dvh - 32px)', overflow: 'auto',
        bgcolor: 'rgba(8, 13, 32, .96)', color: '#eef5ff', border: '1px solid rgba(76, 210, 255, .22)',
        boxShadow: '0 24px 80px rgba(0,0,0,.55), 0 0 60px rgba(66, 92, 255,.12)', backdropFilter: 'blur(22px)',
      }}
    >
      <ModalClose sx={{ color: 'rgba(230,240,255,.72)' }} />
      <Typography id='jorgis-settings-title' level='h3'>Configuración de Jorgis</Typography>
      <Typography level='body-sm' sx={{ color: 'rgba(224,236,255,.62)' }}>
        Voz, modelo principal y conexiones de inteligencia artificial.
      </Typography>

      <Stack spacing={2.25} mt={2}>
        <Box>
          <Typography level='title-md'>Conversación</Typography>
          <Stack mt={1.25} spacing={1.5}>
            <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
              <Box><Typography level='title-sm'>Responder por voz</Typography><Typography level='body-xs'>Reproduce cada respuesta automáticamente.</Typography></Box>
              <Switch checked={props.autoSpeak} onChange={event => props.onAutoSpeakChange(event.target.checked)} />
            </Stack>
            <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
              <Box><Typography level='title-sm'>Conversación continua</Typography><Typography level='body-xs'>Vuelve a escuchar al terminar de hablar, sin pulsar otra vez.</Typography></Box>
              <Switch checked={props.continuousConversation} onChange={event => props.onContinuousConversationChange(event.target.checked)} />
            </Stack>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,.09)' }} />

        <Box>
          <Typography level='title-md'>Modelo para conversar</Typography>
          <FormControl sx={{ mt: 1.25 }}>
            <FormLabel>Modelo activo</FormLabel>
            <Select
              aria-label='Modelo activo de Jorgis'
              value={assignedModelId ?? 'auto'}
              onChange={(_, value) => assignModel('primaryChat', !value || value === 'auto' ? undefined : value)}
            >
              <Option value='auto'>Automático — selección nativa de Big‑AGI</Option>
              {visibleModels.map(model => (
                <Option key={model.id} value={model.id}>
                  {model.label} · {PROVIDER_LABELS[model.vId] ?? model.vId}
                </Option>
              ))}
            </Select>
            <Typography level='body-xs' mt={.75}>
              En Automático se usa la selección estable de Big‑AGI. Para máxima calidad, fija OpenAI o Gemini; para privacidad, elige Ollama.
            </Typography>
          </FormControl>
          {activeModel && <Chip size='sm' variant='soft' color='success' sx={{ mt: 1 }}>
            En uso: {activeModel.label} · {PROVIDER_LABELS[activeModel.vId] ?? activeModel.vId}
          </Chip>}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,.09)' }} />

        <Box>
          <Typography level='title-md'>API Keys y modelos</Typography>
          <Typography level='body-sm' mt={.5} sx={{ color: 'rgba(224,236,255,.68)' }}>
            Agrega OpenAI, Gemini, Anthropic, OpenRouter, Groq, xAI, Mistral y los demás proveedores compatibles. Cada proveedor muestra su campo de API Key y descarga su lista real de modelos.
          </Typography>
          <Button fullWidth sx={{ mt: 1.25 }} startDecorator={<KeyRoundedIcon />} onClick={props.onOpenModels}>
            Agregar modelos y API Keys
          </Button>
        </Box>

        <Box sx={{ p: 1.5, borderRadius: 'lg', bgcolor: 'rgba(65, 215, 255, .06)', border: '1px solid rgba(86, 218, 255, .13)' }}>
          <Stack direction='row' alignItems='center' gap={1}>
            <MemoryRoundedIcon sx={{ color: '#70eaff' }} />
            <Typography level='title-md'>Modelos locales</Typography>
          </Stack>
          <Typography level='body-sm' mt={.75}>
            Ollama, LM Studio y LocalAI también se agregan desde “Agregar modelos y API Keys”; normalmente no requieren API Key.
          </Typography>
          <Typography level='body-xs' mt={.75} sx={{ color: 'rgba(224,236,255,.62)' }}>
            {props.localAvailable
              ? `Ollama está disponible${props.localModel ? ` · ${props.localModel}` : ''}. ${localModels.length ? `${localModels.length} modelo(s) local(es) aparecen en Big‑AGI.` : 'Abre el administrador para importar los modelos instalados.'}`
              : 'Ollama no respondió en este momento. Los proveedores en la nube siguen funcionando.'}
          </Typography>
        </Box>

        <Button variant='plain' color='danger' startDecorator={<DeleteOutlineRoundedIcon />} onClick={() => void props.onClearHistory()}>
          Borrar conversación
        </Button>
      </Stack>
    </ModalDialog>
  </Modal>;
}
