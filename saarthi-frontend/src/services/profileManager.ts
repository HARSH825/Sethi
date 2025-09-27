// src/services/profileManager.ts
import { UserProfile } from '@/types';

interface CacheData {
  profile: UserProfile;
  timestamp: number;
  version: string;
}

interface SessionData {
  userId?: string;
  onboardingProgress: number;
  currentField?: string;
  conversationHistory: Array<{
    user: string;
    saarthi: string;
    timestamp: Date;
  }>;
}

class ProfileManager {
  private readonly storageKey = 'saarthi_user_profile';
  private readonly sessionKey = 'saarthi_session';
  private readonly cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours

  async initializeProfile(): Promise<UserProfile | null> {
    const cached = localStorage.getItem(this.storageKey);
    
    if (cached && this.isValidCache(cached)) {
      console.log('📱 Using cached profile');
      return JSON.parse(cached).profile;
    }
    
    console.log('🆕 New user - no cached profile');
    return null;
  }

  cacheProfile(profile: UserProfile): void {
    const cacheData: CacheData = {
      profile,
      timestamp: Date.now(),
      version: '1.0'
    };
    localStorage.setItem(this.storageKey, JSON.stringify(cacheData));
    console.log('💾 Profile cached:', profile.name);
  }

  updateProfileField(field: keyof UserProfile, value: any): UserProfile {
    const currentProfile = this.getCachedProfile() || {} as UserProfile;
    const updatedProfile = { ...currentProfile, [field]: value };
    this.cacheProfile(updatedProfile);
    return updatedProfile;
  }

  getCachedProfile(): UserProfile | null {
    const cached = localStorage.getItem(this.storageKey);
    return cached ? JSON.parse(cached).profile : null;
  }

  saveSession(sessionData: SessionData): void {
    localStorage.setItem(this.sessionKey, JSON.stringify({
      ...sessionData,
      timestamp: Date.now()
    }));
  }

  loadSession(): (SessionData & { timestamp: number }) | null {
    const session = localStorage.getItem(this.sessionKey);
    return session ? JSON.parse(session) : null;
  }

  private isValidCache(cachedData: string): boolean {
    try {
      const data: CacheData = JSON.parse(cachedData);
      const age = Date.now() - data.timestamp;
      return age < this.cacheMaxAge;
    } catch {
      return false;
    }
  }

  clearProfile(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.sessionKey);
    console.log('🗑️ Profile cleared');
  }

  async syncWithDatabase(profile: UserProfile): Promise<void> {
    try {
      if (profile.id) {
        await fetch(`http://localhost:3001/api/users/${profile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile)
        });
      }
    } catch (error) {
      console.warn('Background sync failed:', error);
    }
  }
}

export default new ProfileManager();
