import * as Sentry from '@sentry/nextjs';
import { sentryEdgeOptions } from '@/lib/sentry-config';

Sentry.init(sentryEdgeOptions);
