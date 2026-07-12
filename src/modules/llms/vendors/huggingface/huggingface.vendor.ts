import type { IModelVendor } from '../IModelVendor';
import type { OpenAIAccessSchema } from '../../server/openai/openai.access';

import { ModelVendorOpenAI } from '../openai/openai.vendor';


export interface DHuggingFaceServiceSettings {
  huggingfaceKey: string;
  csf?: boolean;
}

export const ModelVendorHuggingFace: IModelVendor<DHuggingFaceServiceSettings, OpenAIAccessSchema> = {
  id: 'huggingface',
  name: 'Hugging Face',
  displayRank: 33,
  displayGroup: 'cloud',
  location: 'cloud',
  instanceLimit: 1,
  hasServerConfigKey: 'hasLlmHuggingFace',

  /// client-side-fetch ///
  csfAvailable: _csfHFAvailable,

  // functions
  initializeSetup: () => ({
    huggingfaceKey: '',
  }),
  validateSetup: (setup) => {
    return setup.huggingfaceKey?.length >= 10;
  },
  getTransportAccess: (partialSetup) => ({
    dialect: 'huggingface',
    clientSideFetch: _csfHFAvailable(partialSetup) && !!partialSetup?.csf,
    oaiKey: partialSetup?.huggingfaceKey || '',
    oaiOrg: '',
    oaiHost: 'https://router.huggingface.co/openai',
    heliKey: '',
  }),

  // OpenAI transport ('huggingface' dialect in 'access')
  rpcUpdateModelsOrThrow: ModelVendorOpenAI.rpcUpdateModelsOrThrow,

};

function _csfHFAvailable(s?: Partial<DHuggingFaceServiceSettings>) {
  return !!s?.huggingfaceKey;
}
