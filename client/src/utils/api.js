    /**
     * API base URL helper.
     * - Dev:  Vite proxies /api → localhost:3001 automatically (vite.config.js)
     * - Prod: Uses VITE_API_URL env var pointing to Cloud Run URL
     *
     * Usage: import { api } from '../utils/api'
     *        fetch(api('/api/upload'), { ... })
     */
    const BASE = import.meta.env.VITE_API_URL || "";

    export const api = (path) => `${BASE}${path}`;
