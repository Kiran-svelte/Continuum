import { notFound } from 'next/navigation';
import AdminWhatsAppIntegrationView from '@/components/pages/admin/whatsapp-integration-view';

/**
 * Admin WhatsApp integration page — feature-flagged until Chunk 05 gates pass.
 */
export default function AdminWhatsAppIntegrationPage() {
  if (process.env.NEXT_PUBLIC_WHATSAPP_ENABLED !== 'true') {
    notFound();
  }
  return <AdminWhatsAppIntegrationView />;
}
