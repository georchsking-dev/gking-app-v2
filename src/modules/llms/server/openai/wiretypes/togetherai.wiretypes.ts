import * as z from 'zod/v4';

export const wireTogetherAIModelSchema = z.object({
  id: z.string(),
  display_name: z.string().optional(),
  organization: z.string().optional(),
  type: z.string().optional(),
  link: z.string().optional(),
  context_length: z.number().nullable().optional(),
  pricing: z.object({
    input: z.union([z.number(), z.string()]).optional(),
    output: z.union([z.number(), z.string()]).optional(),
  }).optional(),
  created: z.number().optional(),
});

export const wireTogetherAIListOutputSchema = z.array(wireTogetherAIModelSchema);
