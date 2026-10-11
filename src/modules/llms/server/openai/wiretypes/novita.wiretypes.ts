import * as z from 'zod/v4';

export const wireNovitaModelSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  display_name: z.string().optional(),
  description: z.string().optional(),
  created: z.number().optional(),
  context_size: z.number().optional(),
  max_output_tokens: z.number().optional(),
  input_token_price_per_m: z.number().optional(),
  output_token_price_per_m: z.number().optional(),
  features: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
});

export type WireNovitaModel = z.infer<typeof wireNovitaModelSchema>;

export const wireNovitaListOutputSchema = z.object({
  data: z.array(wireNovitaModelSchema).optional(),
  models: z.array(wireNovitaModelSchema).optional(),
});
