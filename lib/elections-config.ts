export const VOTER_FEE = 5000;
export const CANDIDATE_FEE = 50000;

export const VOTER_POINTS = 1000;
export const CANDIDATE_POINTS = 3000;

export const VOTER_GOAL = 500;
export const CANDIDATE_GOAL = 50;

export const PM_NOMINATION_DEADLINE = new Date("2026-04-30T23:59:00+04:00");
export const PM_NOMINATION_THRESHOLD = 10;

export function formatAMD(amount: number) {
  return amount.toLocaleString("hy-AM") + " ֏";
}
