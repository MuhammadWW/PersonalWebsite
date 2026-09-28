import { defineConfig } from 'jsrepo';

export default defineConfig({
    registries: ['@ieedan/std'],
    paths: {
        util: './src/lib/std',
    },
});
