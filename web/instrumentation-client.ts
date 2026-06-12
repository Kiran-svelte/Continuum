import * as Sentry from '@sentry/nextjs';
import { sentryClientOptions } from '@/lib/sentry-config';

Sentry.init(sentryClientOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
