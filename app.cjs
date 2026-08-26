'use strict';

import('./build/index.js').catch((err) => {
  console.error('Failed to start SvelteKit app:', err);
  process.exit(1);
});
