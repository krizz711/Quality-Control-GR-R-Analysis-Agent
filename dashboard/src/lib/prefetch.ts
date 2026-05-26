import { QueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { ReviewQueueResponse, QualityViolationResponse } from './types';

/** Client-side prefetch helper (same queryFns as hooks). */
export function createClientQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export async function fetchReviewsClient() {
  const reviews = await api.get<ReviewQueueResponse[]>('/reviews');
  const { transformReviewToUIGRRStudy } = await import('./transforms');
  return reviews.map(transformReviewToUIGRRStudy);
}

export async function fetchViolationsClient(limit: number, onlyUnack: boolean) {
  return api.get<QualityViolationResponse[]>(
    `/violations?limit=${encodeURIComponent(String(limit))}&only_unack=${onlyUnack ? 'true' : 'false'}`
  );
}
