import { createHash } from 'crypto';

export interface BackupIntegrityManifest {
  algorithm: 'sha256';
  checksum: string;
  table_count: number;
  record_count: number;
}

export function countBackupRecords(backup: Record<string, unknown>): number {
  return Object.entries(backup).reduce((total, [key, value]) => {
    if (key.startsWith('_')) return total;
    return total + (Array.isArray(value) ? value.length : value ? 1 : 0);
  }, 0);
}

export function buildBackupIntegrityManifest(backup: Record<string, unknown>): BackupIntegrityManifest {
  const backupWithoutIntegrity = Object.fromEntries(
    Object.entries(backup).filter(([key]) => key !== '_integrity')
  );
  const serialized = JSON.stringify(backupWithoutIntegrity);

  return {
    algorithm: 'sha256',
    checksum: createHash('sha256').update(serialized).digest('hex'),
    table_count: Object.keys(backupWithoutIntegrity).filter((key) => !key.startsWith('_')).length,
    record_count: countBackupRecords(backupWithoutIntegrity),
  };
}

export function verifyBackupIntegrityManifest(backup: Record<string, unknown>): boolean {
  const integrity = backup._integrity;
  if (!integrity || typeof integrity !== 'object') return false;
  const manifest = integrity as Partial<BackupIntegrityManifest>;
  if (manifest.algorithm !== 'sha256' || typeof manifest.checksum !== 'string') return false;

  return buildBackupIntegrityManifest(backup).checksum === manifest.checksum;
}
