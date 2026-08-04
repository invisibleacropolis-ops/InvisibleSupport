/**
 * @fileoverview Checked-in Supabase project configuration.
 *
 * The publishable key is safe to ship to the browser. Do not put service
 * role keys or other privileged credentials in this file.
 */

export const SUPABASE_CONFIG = {
    projectUrl: 'https://guoyqsfvqllyhlsrknml.supabase.co',
    publishableKey: 'sb_publishable_ed-VTx2u60tI9SnQeVbGRQ_IEHA36FO',
    bucket: 'invisible-support-assets',
    assetsTable: 'assets',
    signedUrlExpiresInSeconds: 60 * 60,
};

export function isConfigured() {
    return Boolean(
        SUPABASE_CONFIG.projectUrl &&
        SUPABASE_CONFIG.publishableKey &&
        !SUPABASE_CONFIG.projectUrl.includes('YOUR-PROJECT-REF') &&
        !SUPABASE_CONFIG.publishableKey.includes('YOUR-SUPABASE-PUBLISHABLE-KEY')
    );
}

export default SUPABASE_CONFIG;
