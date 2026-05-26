import 'server-only';

import { QueryClient, dehydrate } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { serverGet } from './server-api';
import { transformReviewToUIGRRStudy } from './transforms';
import type { ReviewQueueResponse, QualityViolationResponse } from './types';

export async function prefetchDashboardQueries(): Promise<ReturnType<typeof dehydrate>> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  });

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.reviews,
      queryFn: async () => {
        const reviews = await serverGet<ReviewQueueResponse[]>('/reviews', {
          notFoundOn404: false,
        });
        return reviews.map(transformReviewToUIGRRStudy);
      },
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.violations(200, false),
      queryFn: () =>
        serverGet<QualityViolationResponse[]>(
          '/violations?limit=200&only_unack=false',
          { notFoundOn404: false }
        ),
    }),
  ]);

  return dehydrate(queryClient);
}

