/**
 * supabase.ts
 *
 * This file is intentionally kept minimal.
 * NO Supabase credentials are stored here — they are kept server-side only
 * in the Vercel serverless function (api/cloud-sync.ts) via environment variables.
 *
 * All database reads and writes go through /api/cloud-sync (secure, server-side).
 * This file is retained only so the DatabaseSettingsModal can test a user-provided
 * connection before storing it. No keys are bundled into the frontend JS.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'aew_supabase_url_prod_v2';
const SUPABASE_KEY_KEY = 'aew_supabase_key_prod_v2';

export const SupabaseService = {
  /**
   * Save user-provided config to localStorage (only used by DatabaseSettingsModal).
   * These are NOT used for actual data sync (which goes through /api/cloud-sync).
   */
  saveConfig(url: string, key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(SUPABASE_KEY_KEY, key.trim());
  },

  getConfig(): { url: string; key: string } {
    if (typeof window === 'undefined') return { url: '', key: '' };
    return {
      url: localStorage.getItem(SUPABASE_URL_KEY) || '',
      key: localStorage.getItem(SUPABASE_KEY_KEY) || '',
    };
  },

  isConfigured(): boolean {
    // Always false — sync is done server-side via /api/cloud-sync
    return false;
  },

  /**
   * Test a user-supplied Supabase connection (used only in DatabaseSettingsModal UI).
   * This is the ONLY place the anon key touches the browser, and only when the admin
   * explicitly pastes it to test. The key is never used for ongoing sync.
   */
  async testConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
    try {
      const tempClient = createClient(url.trim(), key.trim(), {
        auth: { persistSession: false },
      });

      const { error } = await tempClient
        .from('portal_master_state')
        .select('id, updated_at')
        .limit(1);

      if (error) {
        if (
          error.code === '42P01' ||
          error.message.includes('relation') ||
          error.message.includes('does not exist')
        ) {
          return {
            success: false,
            message:
              'Connected to Supabase, but the "portal_master_state" table has not been created yet. Please run the SQL schema script in your Supabase SQL Editor.',
          };
        }
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Successfully connected to Supabase database!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection failed' };
    }
  },

  // These are no-ops: actual data sync is server-side via /api/cloud-sync
  async fetchMasterState(): Promise<null> { return null; },
  async saveMasterState(_state: any): Promise<boolean> { return false; },
};
