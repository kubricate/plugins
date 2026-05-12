import { namespaceTemplate, simpleAppTemplate } from '@kubricate/stacks';
import { Stack } from 'kubricate';

import { secretManager } from './setup-secrets.js';

const namespace = Stack.fromTemplate(namespaceTemplate, { name: 'my-namespace' });

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: 'my-namespace',
  imageName: 'nginx',
  name: 'my-app',
}).useSecrets(secretManager, c => {
  c.secrets('MY_APP_KEY').inject();
  c.secrets('MY_DB_PASSWORD').inject();
});

export default { namespace, myApp };
