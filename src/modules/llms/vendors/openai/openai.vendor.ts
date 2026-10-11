import type { IModelVendor } from '../IModelVendor';
import { ModelVendors } from '../vendors.registry';

export interface DOpenAIServiceSettings {
  oaiKey?: string;
  oaiOrg?: string;
  oaiHost?: string;
  clientSideFetch?: boolean;
}

export const ModelVendorOpenAI: IModelVendor<DOpenAIServiceSettings> = ModelVendors.openai;
