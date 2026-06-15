/**
 * @fileoverview GitHub settings form controller.
 *
 * The form now:
 *   - Persists owner/repo/branch/limit/workerUrl in localStorage.
 *   - Renders a Connect/Disconnect pair for the GitHub App (no PAT field).
 *   - On load, probes the Worker to populate the connected repo/account.
 *   - Listens to auth state changes from the auth client.
 */

import { t } from '../../shared/localization/index.js';
import * as Notifications from '../../shared/ui/notifications.js';
import * as GitHubIntegration from '../../shared/services/github.js';
import * as AuthClient from '../../shared/services/auth-client.js';

let initialized = false;

export function init() {
    if (initialized) return;

    const form = document.querySelector('[data-github-settings]');
    if (!form) return;

    const ownerInput = form.querySelector('[data-github-owner]');
    const repoInput = form.querySelector('[data-github-repo]');
    const branchInput = form.querySelector('[data-github-branch]');
    const limitInput = form.querySelector('[data-github-limit]');
    const workerUrlInput = form.querySelector('[data-github-worker-url]');
    const feedback = form.querySelector('[data-github-feedback]');
    const testButton = form.querySelector('[data-github-test]');
    const connectButton = form.querySelector('[data-github-connect]');
    const disconnectButton = form.querySelector('[data-github-disconnect]');
    const connectionValue = form.querySelector('[data-github-connection-value]');

    function clearFeedback() {
        if (feedback) Notifications.inline(feedback, '');
    }

    function showFeedback(message, tone = 'info') {
        if (feedback && message) Notifications.inline(feedback, message, tone);
    }

    function populate(config) {
        if (!config) return;
        if (ownerInput && document.activeElement !== ownerInput) {
            ownerInput.value = config.owner || '';
        }
        if (repoInput && document.activeElement !== repoInput) {
            repoInput.value = config.repo || '';
        }
        if (branchInput && document.activeElement !== branchInput) {
            branchInput.value = config.branch || '';
        }
        if (limitInput && document.activeElement !== limitInput) {
            const limit = Number(config.storageLimitMb);
            limitInput.value = Number.isFinite(limit) && limit > 0 ? String(limit) : '';
        }
    }

    function renderAuthState(state) {
        if (workerUrlInput && document.activeElement !== workerUrlInput) {
            workerUrlInput.value = state.workerUrl || '';
        }
        if (AuthClient.isConnected()) {
            connectionValue.textContent = `${state.account}/${state.repo}`;
            if (disconnectButton) disconnectButton.hidden = false;
            if (connectButton) connectButton.textContent = t('labels.githubConnect');
        } else {
            connectionValue.textContent = state.workerUrl
                ? '— not connected —'
                : '— worker URL not set —';
            if (disconnectButton) disconnectButton.hidden = true;
            if (connectButton) connectButton.textContent = t('labels.githubConnect');
        }
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFeedback();
        const owner = ownerInput?.value.trim() ?? '';
        const repo = repoInput?.value.trim() ?? '';
        if (!owner || !repo) {
            showFeedback(t('errors.githubValidation'), 'error');
            return;
        }
        const branch = branchInput?.value.trim() || 'main';
        const limitValue = Number(limitInput?.value);
        const workerUrl = workerUrlInput?.value.trim() ?? '';
        const payload = { owner, repo, branch };
        if (Number.isFinite(limitValue) && limitValue > 0) {
            payload.storageLimitMb = limitValue;
        }
        try {
            GitHubIntegration.updateConfig(payload);
            AuthClient.setWorkerUrl(workerUrl);
            showFeedback(t('notifications.githubConfigSaved'), 'success');
            Notifications.toast(t('notifications.githubConfigSaved'), 'success');
        } catch (error) {
            console.error('Failed to save GitHub configuration', error);
            showFeedback(error?.message || t('errors.githubRequestFailed'), 'error');
        }
    });

    testButton?.addEventListener('click', async (event) => {
        event.preventDefault();
        clearFeedback();
        testButton.disabled = true;
        const originalText = testButton.textContent;
        try {
            await GitHubIntegration.testConnection();
            showFeedback(t('notifications.githubTestSuccess'), 'success');
            Notifications.toast(t('notifications.githubTestSuccess'), 'success');
        } catch (error) {
            console.error('GitHub connection test failed', error);
            const message = error?.code === 'config'
                ? t('errors.githubConfigMissing')
                : error?.code === 'auth'
                    ? t('errors.githubAuthRequired')
                    : t('notifications.githubTestFailure');
            showFeedback(message, 'error');
            Notifications.toast(message, 'error');
        } finally {
            testButton.disabled = false;
            if (typeof originalText === 'string') {
                testButton.textContent = originalText;
            }
        }
    });

    connectButton?.addEventListener('click', (event) => {
        event.preventDefault();
        try {
            AuthClient.beginInstall();
        } catch (error) {
            console.error('Connect failed', error);
            showFeedback(error?.message || t('errors.githubConnectFailed'), 'error');
            Notifications.toast(error?.message || t('errors.githubConnectFailed'), 'error');
        }
    });

    disconnectButton?.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
            await AuthClient.signOut();
            showFeedback(t('notifications.githubDisconnected'), 'info');
            Notifications.toast(t('notifications.githubDisconnected'), 'info');
        } catch (error) {
            console.error('Disconnect failed', error);
            showFeedback(t('errors.githubRequestFailed'), 'error');
        }
    });

    GitHubIntegration.subscribe((config) => {
        populate(config);
    });

    AuthClient.subscribe((state) => {
        renderAuthState(state);
    });

    populate(GitHubIntegration.getConfig());
    renderAuthState(AuthClient.getState());

    // Probe the Worker on init to recover the session across reloads.
    AuthClient.fetchSession().catch((e) => {
        console.warn('Auth session probe failed', e);
    });

    // If we landed back from a GitHub install redirect, pick up the
    // installation_id from the URL and POST to /auth/callback.
    handleInstallReturn();

    initialized = true;
}

/**
 * Detects the return from GitHub's App install page and POSTs the data
 * to the Worker's /auth/callback endpoint to mint a session.
 */
async function handleInstallReturn() {
    const params = new URLSearchParams(window.location.search);
    const installationId = params.get('installation_id');
    const state = params.get('state');
    if (!installationId || !state) return;

    const workerUrl = AuthClient.getWorkerUrl();
    if (!workerUrl) {
        console.warn('Install return detected but no Worker URL configured');
        return;
    }

    try {
        const response = await fetch(workerUrl.replace(/\/+$/, '') + '/auth/callback', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ installation_id: installationId, state }),
        });
        if (!response.ok) {
            throw new Error(`Callback failed (${response.status})`);
        }
        const body = await response.json();
        Notifications.toast(
            t('notifications.githubConnected', { repo: `${body.account}/${body.repo}` }),
            'success',
        );
        // Clean up the URL so refreshes don't re-fire the callback.
        const url = new URL(window.location.href);
        url.searchParams.delete('installation_id');
        url.searchParams.delete('state');
        url.searchParams.delete('setup_action');
        window.history.replaceState({}, '', url.toString());
        // Probe session to refresh state.
        await AuthClient.fetchSession();
    } catch (e) {
        console.error('Install callback failed', e);
        Notifications.toast(t('errors.githubRequestFailed'), 'error');
    }
}

// Default export
export default { init };
