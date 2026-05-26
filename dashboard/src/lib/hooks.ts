/**
 * API action hooks and mutations.
 * Data-fetching hooks live in ./queries.ts (TanStack Query).
 */

import { api } from './api';
import type {
  SPCResponse,
  SPCInterpretResponse,
  PredictResponse,
} from './types';

export {
  useGRRReviews,
  useGRRStudy,
  useGRRNarrative,
  useQualityViolations,
  useInvalidateReviews,
  useInvalidateViolations,
} from './queries';

export { transformSPCResponseToUI } from './transforms';

export async function downloadGRRReport(studyId: string) {
  const blob = await api.getFile(`/studies/${studyId}/report`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grr_report_${studyId.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function analyzeSPC(
  values: number[],
  chartType: string = 'xbar_r',
  options: {
    subgroupSize?: number;
    partNumber?: string;
    characteristicName?: string;
  } = {}
) {
  return api.post<SPCResponse>('/spc/analyze', {
    values,
    chart_type: chartType,
    subgroup_size: options.subgroupSize ?? 5,
    part_number: options.partNumber ?? 'UNKNOWN',
    characteristic_name: options.characteristicName ?? 'UNKNOWN',
  });
}

export async function interpretSPCViolations(
  chartType: string,
  violatedRules: Record<string, number[]>,
  ucl: number,
  cl: number,
  lcl: number,
  recentValues: number[]
) {
  return api.post<SPCInterpretResponse>('/spc/interpret', {
    chart_type: chartType,
    violated_rules: violatedRules,
    ucl,
    cl,
    lcl,
    recent_values: recentValues,
  });
}

export async function predictSPCViolations(
  partNumber: string,
  characteristicName: string,
  valuesHistory: number[],
  ucl: number,
  cl: number,
  lcl: number,
  recentGrrPct?: number
) {
  return api.post<PredictResponse>('/spc/predict', {
    part_number: partNumber,
    characteristic_name: characteristicName,
    values_history: valuesHistory,
    ucl,
    cl,
    lcl,
    recent_grr_pct: recentGrrPct,
  });
}

export async function submitReviewDecision(
  reviewId: string,
  decision: 'approved' | 'rejected',
  notes: string = '',
  decidedBy: string = 'quality-engineer'
) {
  return api.patch(`/reviews/${reviewId}`, {
    decision,
    notes,
    decided_by: decidedBy,
  });
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithAgent(
  question: string,
  conversationHistory: ChatMessage[] = []
) {
  return api.post('/chat', {
    question,
    conversation_history: conversationHistory,
  });
}

export async function acknowledgeViolation(
  violationId: string,
  acknowledgedBy: string = 'quality-engineer'
) {
  return api.patch(
    `/violations/${violationId}/ack?acknowledged_by=${encodeURIComponent(acknowledgedBy)}`
  );
}
