import { defineConfig } from 'kubricate';

import { secretManager } from './src/setup-secrets.js';
import stacks from './src/stacks.js';

export default defineConfig({
  stacks: { ...stacks },
  secret: {
    secretSpec: secretManager,
  },
});
