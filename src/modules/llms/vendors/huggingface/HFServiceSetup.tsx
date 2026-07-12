import * as React from 'react';

import type { DModelsServiceId } from '~/common/stores/llms/llms.service.types';
import { AlreadySet } from '~/common/components/AlreadySet';
import { FormInputKey } from '~/common/components/forms/FormInputKey';
import { InlineError } from '~/common/components/InlineError';
import { Link } from '~/common/components/Link';
import { SetupFormClientSideToggle } from '~/common/components/forms/SetupFormClientSideToggle';
import { SetupFormRefetchButton } from '~/common/components/forms/SetupFormRefetchButton';
import { useToggleableBoolean } from '~/common/util/hooks/useToggleableBoolean';

import { ApproximateCosts } from '../ApproximateCosts';
import { ModelVendorHuggingFace } from './huggingface.vendor';
import { useLlmUpdateModels } from '../../llm.client.hooks';
import { useServiceSetup } from '../useServiceSetup';


const HF_REG_LINK = 'https://huggingface.co/settings/tokens';


export function HFServiceSetup(props: { serviceId: DModelsServiceId }) {

  // external state
  const {
    service, serviceAccess, serviceHasCloudTenantConfig, serviceHasLLMs,
    serviceSetupValid, updateSettings,
  } = useServiceSetup(props.serviceId, ModelVendorHuggingFace);

  // derived state
  const { clientSideFetch, oaiKey: huggingfaceKey } = serviceAccess;
  const needsUserKey = !serviceHasCloudTenantConfig;

  // advanced mode - initialize open if CSF is enabled, but let user toggle freely
  const advanced = useToggleableBoolean(!!clientSideFetch);
  const showAdvanced = advanced.on;

  // key validation
  const shallFetchSucceed = !needsUserKey || (!!huggingfaceKey && serviceSetupValid);
  const showKeyError = !!huggingfaceKey && !serviceSetupValid;

  // fetch models
  const { isFetching, refetch, isError, error } =
    useLlmUpdateModels(!serviceHasLLMs && shallFetchSucceed, service);


  return <>

    <ApproximateCosts serviceId={service?.id} />

    <FormInputKey
      autoCompleteId='hf-key' label='Hugging Face API Key (Token)'
      rightLabel={<>{needsUserKey
        ? !huggingfaceKey && <Link level='body-sm' href={HF_REG_LINK} target='_blank'>Tokens page</Link>
        : <AlreadySet />}
      </>}
      value={huggingfaceKey} onChange={value => updateSettings({ huggingfaceKey: value })}
      required={needsUserKey} isError={showKeyError}
      placeholder='hf_...'
    />

    {showAdvanced && <SetupFormClientSideToggle
      visible={!!huggingfaceKey}
      checked={!!clientSideFetch}
      onChange={on => updateSettings({ csf: on })}
      helpText='Connect directly to Hugging Face API from your browser instead of through the server.'
    />}

    <SetupFormRefetchButton refetch={refetch} disabled={isFetching} loading={isFetching} error={isError} advanced={advanced} />

    {isError && <InlineError error={error} />}

  </>;
}
