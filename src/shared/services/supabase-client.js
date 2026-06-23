/**
 * @fileoverview Lazy Supabase browser client.
 */

import { SUPABASE_CONFIG, isConfigured as hasSupabaseConfig } from '../config/supabase.js';

const SUPABASE_JS_URL = 'https://esm.sh/@supabase/supabase-js@2';

let clientPromise = null;

export function isSupabaseConfigured() {
    return hasSupabaseConfig();
}

export async function getSupabaseClient() {
    if (!hasSupabaseConfig()) {
        const error = new Error('Supabase project URL and publishable key are not configured.');
        error.code = 'config';
        throw error;
    }

    if (!clientPromise) {
        clientPromise = import(SUPABASE_JS_URL).then(({ createClient }) =>
            createClient(SUPABASE_CONFIG.projectUrl, SUPABASE_CONFIG.publishableKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    flowType: 'pkce',
                },
            })
        );
    }

    return clientPromise;
}

export function getRedirectUrl() {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.hash = '';
    return url.toString();
}
