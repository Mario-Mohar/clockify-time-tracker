import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  // Optional on purpose: the pool only needs it on first use, so the build
  // and the tests run without a database.
  DATABASE_URL: {
    schema: (value) => value || undefined
  }
});
