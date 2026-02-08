/**
 * Supabase Client Initialization
 *
 * This module exports a configured Supabase client instance
 * that can be imported and used across the application.
 */

// Initialize Supabase client using CDN-loaded library
const SUPABASE_URL = 'https://fwunwkiejqkrldvsubgf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dW53a2llanFrcmxkdnN1YmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDU2NzcsImV4cCI6MjA4NjEyMTY3N30.uAAFM2LILwSjgIzzzSx09gPlbeboD-XU--wNxpWlbIQ';

// Create and export the Supabase client
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
