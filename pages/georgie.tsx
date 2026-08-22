import * as React from 'react';
import { AppGeorgie } from '../src/apps/georgie/AppGeorgie';
import { Modals } from '~/common/layout/optima/Modals';
import { withNextJSPerPageLayout } from '~/common/layout/withLayout';

export default withNextJSPerPageLayout({ type: 'noop' }, () => <>
  <AppGeorgie />
  <Modals suspendAutoModelsSetup />
</>);
