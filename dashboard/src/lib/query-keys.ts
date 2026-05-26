export const queryKeys = {
  reviews: ['grr', 'reviews'] as const,
  study: (studyId: string) => ['grr', 'study', studyId] as const,
  narrative: (studyId: string) => ['grr', 'narrative', studyId] as const,
  violations: (limit: number, onlyUnack: boolean) =>
    ['alerts', 'violations', { limit, onlyUnack }] as const,
};
