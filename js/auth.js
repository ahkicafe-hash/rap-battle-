/**
 * ClawCypher Authentication Module
 *
 * Provides reusable authentication functions for all protected pages:
 * - getUser() - Get current authenticated user
 * - requireAuth() - Protect pages (redirect if not logged in)
 * - logout() - Sign out user
 * - updateNav(user) - Update navigation bar with user info
 */

import { supabase } from './supabase.js';

/**
 * Get the current authenticated user
 * @returns {Promise<Object|null>} User object or null if not authenticated
 */
export async function getUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting user:', error);
      return null;
    }

    return user;
  } catch (err) {
    console.error('Error in getUser:', err);
    return null;
  }
}

/**
 * Require authentication on a page - redirect to auth.html if not logged in
 * Call this at the top of every protected page
 * @returns {Promise<Object>} User object if authenticated
 */
export async function requireAuth() {
  const user = await getUser();

  if (!user) {
    // Not logged in - redirect to auth page
    window.location.href = '/auth.html';
    throw new Error('Not authenticated');
  }

  return user;
}

/**
 * Sign out the current user and redirect to home page
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      alert('Error signing out. Please try again.');
      return;
    }

    // Redirect to home page
    window.location.href = '/index.html';
  } catch (err) {
    console.error('Error in logout:', err);
    alert('Error signing out. Please try again.');
  }
}

/**
 * Update navigation bar to show user info and logout button
 * @param {Object} user - The authenticated user object
 */
export async function updateNav(user) {
  if (!user) return;

  try {
    // Fetch user profile data from database
    const { data: profile, error } = await supabase
      .from('users')
      .select('username, credits, elo_rating')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }

    // Update desktop nav
    const desktopNav = document.querySelector('nav .hidden.md\\:flex.items-center.gap-6');
    if (desktopNav && desktopNav.nextElementSibling) {
      const navActions = desktopNav.nextElementSibling;
      navActions.innerHTML = `
        <div class="flex items-center gap-4">
          <span class="text-xs text-slate-400 font-inter hidden lg:inline">
            Credits: <strong class="text-electric">${profile.credits || 0}</strong>
          </span>
          <a href="/profile.html" class="nav-link font-orbitron hover:text-electric transition-colors">
            @${profile.username || 'User'}
          </a>
          <button
            onclick="window.logoutUser()"
            class="px-3 py-1.5 text-xs font-orbitron tracking-wider text-slate-400 hover:text-electric border border-slate-700 hover:border-electric/30 rounded-lg transition-colors"
          >
            LOGOUT
          </button>
        </div>
      `;
    }

    // Update mobile menu
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
      // Find the "Enter" link and replace it with profile + logout
      const enterLink = mobileMenu.querySelector('a[href="auth.html"]');
      if (enterLink) {
        enterLink.outerHTML = `
          <a href="/profile.html" style="color:#8B5CF6;">@${profile.username || 'User'}</a>
          <a href="#" onclick="window.logoutUser(); return false;" style="color:#EF4444; margin-top:1rem; border:1px solid rgba(239,68,68,0.3); border-radius:0.5rem; text-align:center;">Logout</a>
        `;
      }
    }

    // Make logout function globally available
    window.logoutUser = logout;

  } catch (err) {
    console.error('Error updating nav:', err);
  }
}

/**
 * Get user profile data from database
 * @param {string} userId - The user ID
 * @returns {Promise<Object|null>} User profile or null
 */
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error loading user profile:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in getUserProfile:', err);
    return null;
  }
}

/**
 * Check if username is available
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} True if available, false if taken
 */
export async function isUsernameAvailable(username) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Error checking username:', error);
      return false;
    }

    return !data; // Available if no user found
  } catch (err) {
    console.error('Error in isUsernameAvailable:', err);
    return false;
  }
}
