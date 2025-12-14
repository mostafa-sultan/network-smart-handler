import type { StorageAdapter } from '../types';

/**
 * Default storage adapter for Web (IndexedDB/LocalStorage)
 */
export class WebStorageAdapter implements StorageAdapter {
  private storage: Storage;

  constructor(useIndexedDB = false) {
    if (
      useIndexedDB &&
      typeof window !== 'undefined' &&
      'indexedDB' in window
    ) {
      // For now, fallback to localStorage
      // IndexedDB implementation can be added if needed
      this.storage = window.localStorage;
    } else {
      this.storage =
        typeof window !== 'undefined' ? window.localStorage : ({} as Storage);
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return this.storage.getItem(key);
    } catch (error) {
      console.warn('Storage getItem failed:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      this.storage.setItem(key, value);
    } catch (error) {
      console.warn('Storage setItem failed:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.warn('Storage removeItem failed:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      this.storage.clear();
    } catch (error) {
      console.warn('Storage clear failed:', error);
    }
  }
}

/**
 * React Native AsyncStorage adapter
 */
export class RNStorageAdapter implements StorageAdapter {
  private AsyncStorage: any;

  constructor(AsyncStorage: any) {
    this.AsyncStorage = AsyncStorage;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await this.AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('AsyncStorage getItem failed:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('AsyncStorage setItem failed:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('AsyncStorage removeItem failed:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.AsyncStorage.clear();
    } catch (error) {
      console.warn('AsyncStorage clear failed:', error);
    }
  }
}
