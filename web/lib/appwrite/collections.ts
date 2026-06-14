/**
 * Appwrite Database collection IDs (provision in Appwrite Console).
 * Used when MODULE_STATE_SOURCE=appwrite.
 */

import { appwriteConfig } from '@/lib/appwrite/config';

/** Company module cap + enabled slugs (mirrors hr_alerts module keys). */
export const COLLECTION_COMPANY_MODULES = 'company_modules';

export const APPWRITE_COLLECTIONS = {
  companyModules: COLLECTION_COMPANY_MODULES,
} as const;

export type AppwriteCollectionId =
  (typeof APPWRITE_COLLECTIONS)[keyof typeof APPWRITE_COLLECTIONS];

/**
 * Attribute contract for `company_modules` (create in Console):
 * - company_id (string, required, indexed)
 * - super_admin_cap (string[], required)
 * - enabled_modules (string[], required)
 * - module_features (object, optional)
 */
export const COMPANY_MODULES_SCHEMA_DOC = {
  databaseId: appwriteConfig.databaseId,
  collectionId: COLLECTION_COMPANY_MODULES,
  attributes: ['company_id', 'super_admin_cap', 'enabled_modules', 'module_features'],
} as const;
