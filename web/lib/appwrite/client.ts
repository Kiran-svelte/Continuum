/**
 * Appwrite server client (node-appwrite).
 * Used for Storage, Databases, and future Auth session bridging.
 */

import { Client, Account, Databases, Storage, Users } from 'node-appwrite';
import { appwriteConfig, isAppwriteConfigured } from '@/lib/appwrite/config';

let cachedClient: Client | null = null;

export function getAppwriteClient(): Client {
  if (!isAppwriteConfigured()) {
    throw new Error('Appwrite client requires APPWRITE_API_KEY');
  }
  if (!cachedClient) {
    cachedClient = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId)
      .setKey(appwriteConfig.apiKey);
  }
  return cachedClient;
}

export function getAppwriteStorage(): Storage {
  return new Storage(getAppwriteClient());
}

export function getAppwriteDatabases(): Databases {
  return new Databases(getAppwriteClient());
}

export function getAppwriteAccount(): Account {
  return new Account(getAppwriteClient());
}

export function getAppwriteUsers(): Users {
  return new Users(getAppwriteClient());
}
