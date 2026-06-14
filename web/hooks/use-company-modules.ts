'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ModuleSlug } from '@/lib/core-functions/catalog';
import type { ModuleFeatureState } from '@/lib/core-functions/types';

export interface CompanyModulesState {
  enabledModules: ModuleSlug[];
  moduleCap: ModuleSlug[];
  moduleFeatures: Record<string, ModuleFeatureState>;
  loading: boolean;
  error: string | null;
}

const EMPTY: CompanyModulesState = {
  enabledModules: [],
  moduleCap: [],
  moduleFeatures: {},
  loading: true,
  error: null,
};

export function useCompanyModules(): CompanyModulesState & {
  isModuleEnabled: (slug: ModuleSlug) => boolean;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<CompanyModulesState>(EMPTY);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to load module state');
      }
      const data = await res.json();
      setState({
        enabledModules: Array.isArray(data.enabledModules) ? data.enabledModules : [],
        moduleCap: Array.isArray(data.moduleCap) ? data.moduleCap : [],
        moduleFeatures:
          data.moduleFeatures && typeof data.moduleFeatures === 'object'
            ? data.moduleFeatures
            : {},
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        ...EMPTY,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load modules',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isModuleEnabled = useCallback(
    (slug: ModuleSlug) => {
      if (slug === 'employees') return true;
      return state.enabledModules.includes(slug);
    },
    [state.enabledModules]
  );

  return { ...state, isModuleEnabled, refresh };
}
