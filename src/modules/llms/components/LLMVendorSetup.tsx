import * as React from 'react';

import type { DModelsService, DModelsServiceId } from '~/common/stores/llms/llms.service.types';

import { findModelVendor } from '../vendors/vendors.registry';

export function LLMVendorSetup(props: { service: DModelsService }) {
  const vendor = findModelVendor(props.service.vId);
  if (!vendor)
    return 'Configuration issue: Vendor not found for Service ' + props.service.id;

  return null;
}
