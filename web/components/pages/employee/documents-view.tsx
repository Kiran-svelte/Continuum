"use client"

import { useState, useEffect, useTransition, type ChangeEvent } from 'react';
import { Search, FolderLock, UploadCloud, FileDigit, CalendarDays, ShieldCheck, Loader2, Trash2 } from 'lucide-react';
import { format } from "date-fns";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type DocumentRecord = {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string | Date;
  url: string;
};

export default function DocumentsView() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, startUpload] = useTransition();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'identity' | 'financial' | 'policies'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const inferCategory = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return 'personal_id';
    if (ext === 'pdf') return 'tax_form';
    return 'other';
  };

  const loadDocuments = async () => {
    const response = await fetch('/api/documents?limit=100', { method: 'GET' });
    if (!response.ok) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    const payload = await response.json();
    setDocuments(Array.isArray(payload.documents) ? payload.documents : []);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadDocuments();
  }, [isUploading, isDeleting]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toUpperCase() || 'DOC';
    
    startUpload(async () => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('category', inferCategory(file.name));

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        alert("Upload failed: " + (payload.error || 'Please try again'));
        return;
      }

      await loadDocuments();
    });

    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    const res = await fetch('/api/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      alert("Failed to delete: " + (payload.error || 'Please try again'));
    } else {
      await loadDocuments();
    }

    setIsDeleting(null);
  };

  const getCategory = (doc: DocumentRecord) => {
    const type = doc.type?.toUpperCase() || '';
    if (['JPG', 'PNG', 'JPEG'].includes(type)) return 'identity';
    if (type === 'PDF') return 'financial';
    return 'policies';
  };

  const filteredDocuments = (activeCategory === 'all'
    ? documents
    : documents.filter((doc) => getCategory(doc) === activeCategory))
    .filter(doc => 
      searchQuery === '' || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleExport = () => {
    if (filteredDocuments.length === 0) {
      alert('No documents to export in the current view.');
      return;
    }

    const headers = ['id', 'name', 'type', 'status', 'created_at', 'url'];
    const rows = filteredDocuments.map((doc) => [
      doc.id,
      doc.name,
      doc.type,
      doc.status,
      doc.created_at,
      doc.url,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `documents-${activeCategory}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const identityCount = documents.filter(d => ['JPG','PNG', 'JPEG'].includes(d.type.toUpperCase())).length;
  const financialCount = documents.filter(d => d.type.toUpperCase() === 'PDF').length;
  const policiesCount = documents.filter(d => !['JPG','PNG', 'JPEG', 'PDF'].includes(d.type.toUpperCase())).length;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Documents Vault</h1>
              <p className="text-[var(--muted-foreground)] mt-2">
                Securely manage your personal files, compliance documentation, and contracts
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleExport}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--muted)] text-[var(--foreground)] rounded-lg hover:bg-[var(--muted)]/80 font-medium transition-colors"
              >
                Export View
              </Button>
              <label className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary)]/90 font-medium transition-colors cursor-pointer ${isUploading ? 'opacity-75 pointer-events-none' : ''}`}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {isUploading ? 'Uploading...' : 'Upload'}
                <Input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.jpg,.png" disabled={isUploading} />
              </label>
            </div>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Identity */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveCategory('identity')}
              className={`h-auto bg-[var(--card)] border-2 rounded-lg p-6 text-left transition-all ${
                activeCategory === 'identity'
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                  : 'border-[var(--border)] hover:border-[var(--primary)]/50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-[var(--primary)]/10 rounded-lg">
                  <FolderLock className="w-5 h-5 text-[var(--primary)]" />
                </div>
              </div>
              <h3 className="font-semibold mb-1">Personal Identity</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {identityCount} file{identityCount !== 1 ? 's' : ''} • Secure vault
              </p>
            </Button>

            {/* Financial */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveCategory('financial')}
              className={`h-auto bg-[var(--card)] border-2 rounded-lg p-6 text-left transition-all ${
                activeCategory === 'financial'
                  ? 'border-[var(--status-warning)] bg-[var(--status-warning)]/5'
                  : 'border-[var(--border)] hover:border-[var(--status-warning)]/50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-[var(--status-warning)]/10 rounded-lg">
                  <FileDigit className="w-5 h-5 text-[var(--status-warning)]" />
                </div>
              </div>
              <h3 className="font-semibold mb-1">Tax & Financial</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {financialCount} file{financialCount !== 1 ? 's' : ''} • Offer letters, W-2s
              </p>
            </Button>

            {/* Policies */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveCategory('policies')}
              className={`h-auto bg-[var(--card)] border-2 rounded-lg p-6 text-left transition-all ${
                activeCategory === 'policies'
                  ? 'border-[var(--status-success)] bg-[var(--status-success)]/5'
                  : 'border-[var(--border)] hover:border-[var(--status-success)]/50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-[var(--status-success)]/10 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-[var(--status-success)]" />
                </div>
              </div>
              <h3 className="font-semibold mb-1">Company Policies</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {policiesCount} file{policiesCount !== 1 ? 's' : ''} • Recorded globally
              </p>
            </Button>
          </div>

          {/* Documents Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <h2 className="text-xl font-semibold">Records</h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by filename..."
                  className="pl-9 w-full bg-[var(--card)] border border-[var(--border)] rounded-lg py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]"
                />
              </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-[var(--primary)]" />
                  <p className="text-[var(--muted-foreground)]">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="p-12 text-center">
                  <FolderLock className="w-8 h-8 mx-auto mb-3 text-[var(--muted-foreground)]/50" />
                  <p className="text-[var(--muted-foreground)]">
                    No documents yet. Upload your first document using the button above.
                  </p>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="p-12 text-center">
                  <FolderLock className="w-8 h-8 mx-auto mb-3 text-[var(--muted-foreground)]/50" />
                  <p className="text-[var(--muted-foreground)]">
                    No documents found in this category.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--muted)]/40 border-b border-[var(--border)]">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-[var(--foreground)]">File</th>
                        <th className="px-6 py-3 text-left font-semibold text-[var(--foreground)]">Category</th>
                        <th className="px-6 py-3 text-left font-semibold text-[var(--foreground)]">Uploaded</th>
                        <th className="px-6 py-3 text-left font-semibold text-[var(--foreground)]">Status</th>
                        <th className="px-6 py-3 text-right font-semibold text-[var(--foreground)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredDocuments.map((doc) => {
                        const isPdf = doc.type.toUpperCase() === 'PDF';
                        const isImg = ['JPG', 'PNG', 'JPEG'].includes(doc.type.toUpperCase());
                        const typeLabel = isPdf ? 'PDF' : isImg ? 'IMG' : doc.type.substring(0, 3).toUpperCase();
                        
                        return (
                          <tr
                            key={doc.id}
                            className={`hover:bg-[var(--muted)]/20 transition-colors ${isDeleting === doc.id ? 'opacity-50' : ''}`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isPdf
                                      ? 'bg-[var(--destructive)]/10 text-[var(--destructive)]'
                                      : isImg
                                      ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                                      : 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                  }`}
                                >
                                  {typeLabel}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-[var(--foreground)] truncate">{doc.name.split('|||')[0]}</p>
                                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{doc.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
                                {isPdf ? 'Financial' : isImg ? 'Identity' : 'General'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[var(--muted-foreground)]">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--status-warning)]/10 text-[var(--status-warning)] uppercase tracking-wide">
                                {doc.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end items-center gap-2">
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded transition-colors"
                                >
                                  View
                                </a>
                                <Button
                                  onClick={() => handleDelete(doc.id)}
                                  disabled={isDeleting === doc.id}
                                  className="px-3 py-1.5 text-xs font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/10 rounded transition-colors"
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

