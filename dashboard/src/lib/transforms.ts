import type {
  GRRStudyResponse,
  ReviewQueueResponse,
  SPCResponse,
  UISPCChart,
  UIGRRStudy,
} from './types';

export function transformStudyResponseToUI(
  studyId: string,
  response: GRRStudyResponse
): UIGRRStudy {
  const details = (response.details || {}) as Record<string, unknown>;
  return {
    id: studyId,
    equipment_id: (details.equipment_id as string) || 'UNKNOWN',
    characteristic_name: (details.characteristic_name as string) || 'UNKNOWN',
    grr_pct: response.grr_percent ?? 0,
    ndc: response.ndc ?? 0,
    acceptance: response.acceptance || 'conditional',
    ev: (details.ev as number) || 0,
    av: (details.av as number) || 0,
    pv: (details.pv as number) || 0,
    status: (details.status as string) || response.acceptance,
  };
}

export function transformReviewToUIGRRStudy(review: ReviewQueueResponse): UIGRRStudy {
  return {
    id: review.study_id,
    review_id: review.id,
    equipment_id: review.equipment_id || 'UNKNOWN',
    characteristic_name: review.characteristic_name || 'UNKNOWN',
    grr_pct: review.grr_pct ?? 0,
    ndc: review.ndc ?? 0,
    acceptance: 'conditional',
    review_status: review.status,
    created_at: review.created_at ? new Date(review.created_at) : undefined,
  };
}

export function transformSPCResponseToUI(
  response: SPCResponse,
  machineId: string,
  partNumber: string = 'UNKNOWN',
  characteristicName: string = 'UNKNOWN'
): UISPCChart {
  const activeViolations: UISPCChart['active_violations'] = [];
  for (const [rule, indices] of Object.entries(response.nelson_violations || {})) {
    if (indices.length > 0) {
      activeViolations.push({
        rule,
        points: indices,
        severity: rule === 'rule_1' ? 'critical' : 'warning',
      });
    }
  }

  let status: 'stable' | 'warning' | 'critical' = 'stable';
  if (activeViolations.some((v) => v.severity === 'critical')) {
    status = 'critical';
  } else if (activeViolations.length > 0) {
    status = 'warning';
  }

  return {
    id: `spc_${machineId}_${Date.now()}`,
    machine_id: machineId,
    part_number: partNumber,
    characteristic: characteristicName,
    chart_type:
      response.chart_type === 'xbar_r' || response.chart_type === 'i_mr' || response.chart_type === 'p'
        ? response.chart_type
        : 'xbar_r',
    ucl: response.ucl,
    cl: response.cl,
    lcl: response.lcl,
    data: response.out_of_control_indices.map((idx) => ({
      index: idx,
      value: 0,
      violation: 'out_of_control',
    })),
    active_violations: activeViolations,
    status,
  };
}
