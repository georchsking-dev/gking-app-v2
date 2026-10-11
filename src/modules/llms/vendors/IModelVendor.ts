import type { DModelsServiceId } from '~/common/stores/llms/llms.service.types';
import type { ModelVendorId } from './vendors.registry';
import type { ModelDescriptionSchema } from '../server/llm.server.types';

export interface IModelVendor<TSetup = Record<string, any>, TAccess = any> {
  id: ModelVendorId;
  name: string;
  location?: 'local' | 'cloud';
  rank?: number;
  displayRank?: number;
  instanceLimit?: number;
  hasFreeModels?: boolean;
  displayGroup?: 'popular' | 'cloud' | 'local';
  initializeSetup?: () => TSetup;
  getTransportAccess: (setup?: TSetup) => TAccess;
  rpcUpdateModelsOrThrow: (transportAccess: TAccess) => Promise<{ models: ModelDescriptionSchema[] }>;
}
