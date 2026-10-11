import type { DModelsServiceId } from '~/common/stores/llms/llms.service.types';
import { findModelsServiceOrNull } from '~/common/stores/llms/store-llms';
import { findModelVendor } from './vendors.registry';
import type { IModelVendor } from './IModelVendor';

export function findServiceAccessOrThrow(serviceId: DModelsServiceId) {
  const service = findModelsServiceOrNull(serviceId);
  if (!service) throw new Error(`Service not found: ${serviceId}`);
  const vendor = findModelVendor(service.vId);
  if (!vendor) throw new Error(`Vendor not found for service: ${service.vId}`);
  const transportAccess = vendor.getTransportAccess(service.setup);
  return { service, vendor, transportAccess };
}

export function vendorHasBackendCap(vendor: IModelVendor | null | undefined, _backendCaps?: any): boolean {
  if (!vendor) return false;
  return false;
}
