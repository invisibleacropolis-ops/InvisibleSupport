/**
 * @fileoverview Supabase Auth client for email magic-link sign-in.
 */

import { getRedirectUrl, getSupabaseClient, isSupabaseConfigured } from './supabase-client.js?v=20260706-2';

const LAST_EMAIL_KEY = 'invisibleSupport.supabaseEmail';

const listeners = new Set();
let state = {
    configured: isSupabaseConfigured(),
    user: null,
    email: '',
    lastEmail: loadLastEmail(),
};
let initialized = false;

function loadLastEmail() {
    try {
        return localStorage.getItem(LAST_EMAIL_KEY) || '';
    } catch {
        return '';
    }
}

function persistLastEmail(email) {
    state = { ...state, lastEmail: email || '' };
    try {
        if (email) localStorage.setItem(LAST_EMAIL_KEY, email);
        else localStorage.removeItem(LAST_EMAIL_KEY);
    } catch (e) {
        console.warn('Failed to persist Supabase email', e);
    }
}

function notify() {
    const snapshot = getState();
    listeners.forEach((listener) => {
        try {
            listener(snapshot);
        } catch (e) {
            console.warn('Auth state listener error', e);
        }
    });
}

function applyUser(user) {
    state = {
        ...state,
        configured: isSupabaseConfigured(),
        user: user || null,
        email: user?.email || '',
    };
    notify();
}

export function getState() {
    return {
        configured: state.configured,
        user: state.user,
        email: state.email,
        lastEmail: state.lastEmail,
    };
}

export function isConnected() {
    return Boolean(state.user?.id);
}

export function getUserId() {
    return state.user?.id || '';
}

export function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    listener(getState());
    return () => listeners.delete(listener);
}

export async function initAuth() {
    if (initialized) return getState();
    initialized = true;

    if (!isSupabaseConfigured()) {
        state = { ...state, configured: false };
        notify();
        return getState();
    }

    const client = await getSupabaseClient();
    const { data } = await client.auth.getSession();
    applyUser(data?.session?.user || null);

    client.auth.onAuthStateChange((_event, session) => {
        applyUser(session?.user || null);
    });

    return getState();
}

export async function fetchSession() {
    if (!isSupabaseConfigured()) {
        state = { ...state, configured: false, user: null, email: '' };
        notify();
        return null;
    }

    const client = await getSupabaseClient();
    const { data, error } = await client.auth.getUser();
    if (error) {
        applyUser(null);
        return null;
    }
    applyUser(data?.user || null);
    return getState();
}

export async function sendMagicLink(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) {
        const error = new AuthError('email_required', 'Enter an email address first.');
        throw error;
    }
    if (!isSupabaseConfigured()) {
        throw new AuthError('config', 'Supabase is not configured.');
    }

    const client = await getSupabaseClient();
    const { error } = await client.auth.signInWithOtp({
        email: normalized,
        options: {
            emailRedirectTo: getRedirectUrl(),
        },
    });
    if (error) {
        throw new AuthError('request_failed', error.message || 'Unable to send magic link.');
    }
    persistLastEmail(normalized);
    notify();
}

export async function signOut() {
    if (!isSupabaseConfigured()) {
        applyUser(null);
        return;
    }
    const client = await getSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) {
        throw new AuthError('request_failed', error.message || 'Unable to sign out.');
    }
    applyUser(null);
}

export class AuthError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'AuthError';
        this.code = code;
    }
}
