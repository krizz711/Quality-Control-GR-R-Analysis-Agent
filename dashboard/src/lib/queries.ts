'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { queryKeys } from './query-keys';
import { fetchReviewsClient, fetchViolationsClient } from './prefetch';
import { transformStudyResponseToUI } from './transforms';
import type {
  GRRNarrativeResponse,
  GRRStudyResponse,
  QualityViolationResponse,
  UIGRRStudy,
} from './types';

export function useGRRReviews() {
  return useQuery({
    queryKey: queryKeys.reviews,
    queryFn: fetchReviewsClient,
    // Stable empty array for initial render (matches dehydrated empty state)
    placeholderData: (prev) => prev ?? [],
  });
}

export function useGRRStudy(studyId: string | null) {
  return useQuery({
    queryKey: queryKeys.study(studyId ?? ''),
    queryFn: async () => {
      if (!studyId) return null;
      const response = await api.get<GRRStudyResponse>(`/studies/${studyId}`);
      return transformStudyResponseToUI(studyId, response);
    },
    enabled: !!studyId,
  });
}

export function useGRRNarrative(studyId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.narrative(studyId ?? ''),
    queryFn: async () => {
      if (!studyId) return null;
      return api.post<GRRNarrativeResponse>(`/studies/${studyId}/narrative`);
    },
    enabled: !!studyId && enabled,
  });
}

export function useQualityViolations(
  options: { limit?: number; onlyUnack?: boolean } = {}
) {
  const limit = options.limit ?? 100;
  const onlyUnack = options.onlyUnack ?? true;
  return useQuery({
    queryKey: queryKeys.violations(limit, onlyUnack),
    queryFn: () => fetchViolationsClient(limit, onlyUnack),
    placeholderData: (prev) => prev ?? [],
  });
}

export function useInvalidateReviews() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.reviews });
}

export function useInvalidateViolations(limit = 200, onlyUnack = false) {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({ queryKey: queryKeys.violations(limit, onlyUnack) });
}

export type { UIGRRStudy };
