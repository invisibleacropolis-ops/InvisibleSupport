/**
 * @fileoverview Supabase settings form controller.
 */

import { t } from '../../shared/localization/index.js';
import * as Notifications from '../../shared/ui/notifications.js';
import * as SupabaseStorage from '../../shared/services/supabase-storage.js';
import * as AuthClient from '../../shared/services/auth-client.js';

let initialized = false;

export function init() {
    if (initialized) return;

    const form = document.querySelector('[data-supabase-settings]');
    if (!form) return;

    const emailInput = form.querySelector('[data-supabase-email]');
    const limitInput = form.querySelector('[data-supabase-limit]');
    const projectValue = form.querySelector('[data-supabase-project-value]');
    const bucketValue = form.querySelector('[data-supabase-bucket-value]');
    const feedback = form.querySelector('[data-supabase-feedback]');
    const testButton = form.querySelector('[data-supabase-test]');
    const signInButton = form.querySelector('[data-supabase-signin]');
    const signOutButton = form.querySelector('[data-supabase-signout]');
    const connectionValue = form.querySelector('[data-supabase-connection-value]');

    function clearFeedback() {
        if (feedback) Notifications.inline(feedback, '');
    }

    function showFeedback(message, tone = 'info') {
        if (feedback && message) Notifications.inline(feedback, message, tone);
    }

    function populate(config) {
        if (!config) return;
        if (projectValue) {
            projectValue.textContent = config.configured ? config.projectUrl : t('labels.supabaseNotConfigured');
        }
        if (bucketValue) {
            bucketValue.textContent = config.bucket || '—';
        }
        if (limitInput && document.activeElement !== limitInput) {
            const limit = Number(config.storageLimitMb);
            limitInput.value = Number.isFinite(limit) && limit > 0 ? String(limit) : '';
        }
    }

    function renderAuthState(state) {
        const configured = Boolean(state.configured);
        const connected = AuthClient.isConnected();
        if (emailInput && document.activeElement !== emailInput) {
            emailInput.value = state.lastEmail || state.email || '';
        }
        if (connectionValue) {
            connectionValue.textContent = !configured
                ? t('labels.supabaseNotConfigured')
                : connected
                    ? state.email
                    : t('labels.supabaseSignedOut');
        }
        if (signInButton) signInButton.disabled = !configured || connected;
        if (signOutButton) {
            signOutButton.hidden = !connected;
            signOutButton.disabled = !connected;
        }
        if (testButton) testButton.disabled = !configured || !connected;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFeedback();
        const limitValue = Number(limitInput?.value);
        try {
            if (Number.isFinite(limitValue) && limitValue > 0) {
                SupabaseStorage.updateConfig({ storageLimitMb: limitValue });
            }
            showFeedback(t('notifications.supabaseConfigSaved'), 'success');
            Notifications.toast(t('notifications.supabaseConfigSaved'), 'success');
        } catch (error) {
            console.error('Failed to save Supabase configuration', error);
            showFeedback(error?.message || t('errors.supabaseRequestFailed'), 'error');
        }
    });

    signInButton?.addEventListener('click', async (event) => {
        event.preventDefault();
        clearFeedback();
        signInButton.disabled = true;
        const originalText = signInButton.textContent;
        try {
            await AuthClient.sendMagicLink(emailInput?.value || '');
            showFeedback(t('notifications.supabaseMagicLinkSent'), 'success');
            Notifications.toast(t('notifications.supabaseMagicLinkSent'), 'success');
        } catch (error) {
            console.error('Magic link failed', error);
            const message = error?.code === 'config'
                ? t('errors.supabaseConfigMissing')
                : error?.message || t('errors.supabaseAuthRequired');
            showFeedback(message, 'error');
            Notifications.toast(message, 'error');
        } finally {
            signInButton.disabled = false;
            if (typeof originalText === 'string') signInButton.textContent = originalText;
        }
    });

    signOutButton?.addEventListener('click', async (event) => {
        event.preventDefault();
        clearFeedback();
        try {
            await AuthClient.signOut();
            showFeedback(t('notifications.supabaseSignedOut'), 'info');
            Notifications.toast(t('notifications.supabaseSignedOut'), 'info');
        } catch (error) {
            console.error('Sign out failed', error);
            showFeedback(error?.message || t('errors.supabaseRequestFailed'), 'error');
        }
    });

    testButton?.addEventListener('click', async (event) => {
        event.preventDefault();
        clearFeedback();
        testButton.disabled = true;
        const originalText = testButton.textContent;
        try {
            await SupabaseStorage.testConnection();
            showFeedback(t('notifications.supabaseTestSuccess'), 'success');
            Notifications.toast(t('notifications.supabaseTestSuccess'), 'success');
        } catch (error) {
            console.error('Supabase connection test failed', error);
            const message = error?.code === 'config'
                ? t('errors.supabaseConfigMissing')
                : error?.code === 'auth'
                    ? t('errors.supabaseAuthRequired')
                    : t('notifications.supabaseTestFailure');
            showFeedback(message, 'error');
            Notifications.toast(message, 'error');
        } finally {
            testButton.disabled = false;
            if (typeof originalText === 'string') testButton.textContent = originalText;
        }
    });

    SupabaseStorage.subscribe(populate);
    AuthClient.subscribe(renderAuthState);

    populate(SupabaseStorage.getConfig());
    renderAuthState(AuthClient.getState());

    AuthClient.initAuth().catch((e) => {
        console.warn('Supabase auth init failed', e);
    });

    initialized = true;
}

export default { init };
