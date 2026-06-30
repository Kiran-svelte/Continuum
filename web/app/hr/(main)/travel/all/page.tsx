'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plane } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface TravelRequest {
  id: string;
  purpose: string;
  destination: string;
  departure_date: string;
  return_date: string;
  estimated_cost: number | null;
  currency: string;
  status: string;
  Employee: { first_name: string; last_name: string; department: string | null };
}

export default function TravelHistoryPage() {
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequests() {
      try {
        const response = await fetch('/api/travel-requests', { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        setRequests(data.requests ?? []);
      } finally {
        setLoading(false);
      }
    }

    void loadRequests();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <Link href="/hr/travel" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Travel & Expense
      </Link>
      <PageHeader title="Travel History" description="Review all visible travel requests" icon={<Plane className="w-6 h-6" />} />
      <section className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No travel requests found.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {requests.map((request) => (
              <div key={request.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{request.purpose}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.Employee.first_name} {request.Employee.last_name} · {request.destination} · {new Date(request.departure_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'danger' : 'outline'}>{request.status}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{request.estimated_cost ? `${request.currency} ${request.estimated_cost.toLocaleString()}` : 'No estimate'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
