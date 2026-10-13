import type { IModelVendor } from '../IModelVendor';
import { ModelVendors } from '../vendors.registry';

export interface DOpenRouterServiceSettings {
  oaiKey?: string;
  oaiHost?: string;
  clientSideFetch?: boolean;
}

export const ModelVendorOpenRouter: IModelVendor<DOpenRouterServiceSettings> = ModelVendors.openrouter;
