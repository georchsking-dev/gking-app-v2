import * as z from 'zod/v4';

export const wireOpenrouterModelsListOutputSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  created: z.number().optional(),
  context_length: z.number().optional(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
    input_cache_write: z.string().optional(),
    input_cache_read: z.string().optional(),
  }),
  top_provider: z.object({
    max_completion_tokens: z.number().nullable().optional(),
    is_moderated: z.boolean().optional(),
  }),
  architecture: z.object({
    modality: z.string().optional(),
    tokenizer: z.string().optional(),
    instruct_type: z.string().nullable().optional(),
    input_modalities: z.array(z.string()).optional(),
    output_modalities: z.array(z.string()).optional(),
  }).optional(),
  supported_parameters: z.array(z.string()).optional(),
});

export type WireOpenrouterModel = z.infer<typeof wireOpenrouterModelsListOutputSchema>;
