'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, User, Calendar, FileText, ShieldCheck, Loader2 } from 'lucide-react';
import type { NavItem } from '@/components/portal-layout';
import { useDebounce } from '@/lib/use-debounce';

interface CommandKProps {
  navItems: NavItem[];
}

interface SearchResult {
  id: string;
  type?: string;
  domain?: string;
  label?: string;
  title?: string;
  sublabel?: string;
  subtitle?: string;
  href: string;
}

const DOMAIN_ICON: Record<string, React.ReactNode> = {
  employees: <User className="h-4 w-4" />,
  employee: <User className="h-4 w-4" />,
  leaves: <Calendar className="h-4 w-4" />,
  leave: <Calendar className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  policies: <ShieldCheck className="h-4 w-4" />,
  audit: <ShieldCheck className="h-4 w-4" />,
};

const DOMAIN_COLOR: Record<string, string> = {
  employees: 'bg-blue-500/15 text-blue-400',
  employee: 'bg-blue-500/15 text-blue-400',
  leaves: 'bg-amber-500/15 text-amber-400',
  leave: 'bg-amber-500/15 text-amber-400',
  document: 'bg-purple-500/15 text-purple-400',
  policies: 'bg-emerald-500/15 text-emerald-400',
  audit: 'bg-rose-500/15 text-rose-400',
};

/**
 * Global Cmd+K search component.
 * Priority 1: Full-text API search via /api/search/global (employees, leaves, policies, audit).
 * Priority 2: Nav item navigation for quick page access.
 */
export function CommandKSearch({ navItems }: CommandKProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 280);

  // Toggle on Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Auto-focus input
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setApiResults([]);
      setSelectedIdx(0);
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open]);

  // Call real search API when query is long enough
  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setApiResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search/global?q=${encodeURIComponent(q)}&limit=5`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();

      // Flatten result groups (employees, leaves, policies, audit)
      const flat: SearchResult[] = [];
      if (data.result) {
        for (const [domain, items] of Object.entries(data.result)) {
          for (const item of items as SearchResult[]) {
            flat.push({ ...item, domain, label: item.title, sublabel: item.subtitle });
          }
        }
      }
      // Also flatten the simple /results array format
      if (Array.isArray(data.results)) {
        for (const item of data.results as SearchResult[]) {
          flat.push(item);
        }
      }
      setApiResults(flat);
    } catch {
      setApiResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    void runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  // Nav items filtered for navigation shortcut
  const navResults: SearchResult[] = query.length >= 1
    ? navItems
        .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map((item) => ({ id: item.href, label: item.label, sublabel: item.group, href: item.href, domain: 'nav' }))
    : [];

  const combined: SearchResult[] = [...apiResults, ...navResults];

  // Keyboard navigation
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, combined.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && combined[selectedIdx]) {
        e.preventDefault();
        setOpen(false);
        router.push(combined[selectedIdx].href);
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, combined, selectedIdx, router]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="relative hidden sm:flex items-center w-[240px] lg:w-[300px] h-9 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-colors group"
        aria-label="Open global search (Cmd+K)"
      >
        <Search className="mr-2 h-4 w-4 shrink-0 group-hover:text-[var(--primary)] transition-colors" />
        <span className="truncate">Search Continuum...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="fixed left-[50%] top-[12%] z-[101] w-full max-w-[580px] translate-x-[-50%] p-4 sm:p-0">
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
          {/* Input */}
          <div className="flex items-center border-b border-[var(--border)] px-4">
            {isSearching
              ? <Loader2 className="mr-3 h-5 w-5 shrink-0 opacity-50 animate-spin" />
              : <Search className="mr-3 h-5 w-5 shrink-0 opacity-50" />
            }
            <input
              ref={inputRef}
              className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-[var(--muted-foreground)]"
              placeholder="Search employees, leave requests, policies..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Global search input"
            />
            <button
              onClick={() => setOpen(false)}
              className="ml-2 rounded-md p-1 opacity-70 hover:bg-[var(--secondary)] hover:opacity-100 transition-colors"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[380px] overflow-y-auto p-2">
            {query.length < 2 ? (
              <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                Type at least 2 characters to search employees, leave requests, and more.
              </div>
            ) : combined.length === 0 && !isSearching ? (
              <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                No results for &quot;{query}&quot;.
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {/* API Results */}
                {apiResults.length > 0 && (
                  <div>
                    <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                      Results
                    </p>
                    {apiResults.map((item, idx) => {
                      const domain = item.domain ?? item.type ?? 'employee';
                      const icon = DOMAIN_ICON[domain] ?? <FileText className="h-4 w-4" />;
                      const color = DOMAIN_COLOR[domain] ?? 'bg-[var(--accent)] text-[var(--primary)]';
                      const isSelected = idx === selectedIdx;
                      return (
                        <button
                          key={item.id + idx}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm w-full transition-colors ${
                            isSelected ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'hover:bg-[var(--secondary)]'
                          }`}
                          onClick={() => { setOpen(false); router.push(item.href); }}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${color}`}>
                            {icon}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-[var(--foreground)] truncate">{item.label ?? item.title}</span>
                            {(item.sublabel ?? item.subtitle) && (
                              <span className="text-[11px] text-[var(--muted-foreground)] truncate">
                                {item.sublabel ?? item.subtitle}
                              </span>
                            )}
                          </div>
                          <span className="ml-auto text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] shrink-0 hidden sm:block">
                            {domain}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Nav shortcuts */}
                {navResults.length > 0 && (
                  <div>
                    <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                      Navigate to
                    </p>
                    {navResults.map((item, navIdx) => {
                      const idx = apiResults.length + navIdx;
                      const isSelected = idx === selectedIdx;
                      return (
                        <button
                          key={item.id}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm w-full transition-colors ${
                            isSelected ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'hover:bg-[var(--secondary)]'
                          }`}
                          onClick={() => { setOpen(false); router.push(item.href); }}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--primary)]">
                            <Search className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-[var(--foreground)]">{item.label}</span>
                          {item.sublabel && (
                            <span className="text-[11px] text-[var(--muted-foreground)]">{item.sublabel}</span>
                          )}
                          <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">page</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--muted)]/40 px-4 py-2 text-xs text-[var(--muted-foreground)]">
            <span>
              <kbd className="rounded bg-[var(--card)] px-1 shadow-sm border border-[var(--border)]">↑</kbd>{' '}
              <kbd className="rounded bg-[var(--card)] px-1 shadow-sm border border-[var(--border)]">↓</kbd>{' '}
              navigate
            </span>
            <span>
              <kbd className="rounded bg-[var(--card)] px-1 shadow-sm border border-[var(--border)]">Enter</kbd>{' '}
              open · {' '}
              <kbd className="rounded bg-[var(--card)] px-1 shadow-sm border border-[var(--border)]">Esc</kbd>{' '}
              close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
