import * as Sentry from '@sentry/nextjs';
import { sentryServerOptions } from '@/lib/sentry-config';

Sentry.init(sentryServerOptions);
