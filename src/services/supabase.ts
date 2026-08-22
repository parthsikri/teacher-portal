import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'aew_supabase_url_prod_v2';
const SUPABASE_KEY_KEY = 'aew_supabase_key_prod_v2';

// Default Supabase project credentials
const DEFAULT_SUPABASE_URL = 'https://yczcnpsdmhftvpwdenoy.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljemNucHNkbWhmdHZwd2Rlbm95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczODMwNjQsImV4cCI6MjEwMjk1OTA2NH0.H_qomZFkVTfIsvmSkS9UUWn5hNjP9h1kGB3YEpPA3Vk';

const ENV_SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
const ENV_SUPABASE_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_KEY;

let supabaseInstance: SupabaseClient | null = null;

export const SupabaseService = {
  getConfig(): { url: string; key: string } {
    if (typeof window === 'undefined') {
      return { url: ENV_SUPABASE_URL, key: ENV_SUPABASE_KEY };
    }
    const localUrl = localStorage.getItem(SUPABASE_URL_KEY) || ENV_SUPABASE_URL;
    const localKey = localStorage.getItem(SUPABASE_KEY_KEY) || ENV_SUPABASE_KEY;
    return { url: localUrl.trim() || DEFAULT_SUPABASE_URL, key: localKey.trim() || DEFAULT_SUPABASE_KEY };
  },

  saveConfig(url: string, key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(SUPABASE_KEY_KEY, key.trim());
    supabaseInstance = null; // reset client
  },

  isConfigured(): boolean {
    const { url, key } = this.getConfig();
    return Boolean(url && key && url.startsWith('https://') && key.length > 20);
  },

  getClient(): SupabaseClient | null {
    if (supabaseInstance) return supabaseInstance;

    const { url, key } = this.getConfig();
    if (!url || !key || !url.startsWith('https://') || key.length < 20) {
      return null;
    }

    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
        },
      });
      return supabaseInstance;
    } catch (err) {
      console.warn('[Supabase] Failed to initialize client:', err);
      return null;
    }
  },

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
        if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
          return {
            success: false,
            message: 'Connected to Supabase, but the "portal_master_state" table has not been created yet. Please run the SQL schema script in your Supabase SQL Editor.',
          };
        }
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Successfully connected to Supabase database!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection failed' };
    }
  },

  async fetchMasterState(): Promise<any | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('portal_master_state')
        .select('data, updated_at')
        .eq('id', 'aew_portal_master')
        .single();

      if (error) {
        console.warn('[Supabase] Fetch error:', error.message);
        return null;
      }

      return data?.data || null;
    } catch (err) {
      console.warn('[Supabase] Fetch exception:', err);
      return null;
    }
  },

  async saveMasterState(state: any): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('portal_master_state')
        .upsert(
          {
            id: 'aew_portal_master',
            version: 2,
            data: state,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.warn('[Supabase] Save error:', error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('[Supabase] Save exception:', err);
      return false;
    }
  },
};
