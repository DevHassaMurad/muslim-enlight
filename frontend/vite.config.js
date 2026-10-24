import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        server: {
            host: '127.0.0.1',
            port: 3000,
            strictPort: true,
            proxy: {
                '/api': {
                    target: env.API_PROXY_TARGET || 'http://127.0.0.1:5000',
                    changeOrigin: true,
                },
            },
        },
    };
});
