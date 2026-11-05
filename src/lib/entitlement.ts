import { planoAtivo } from "./plano";

export const TRIAL_DAYS = 25;

export function trialRemaining(start: string | null | undefined, now = Date.now()): number {
  const timestamp = start ? new Date(start).getTime() : NaN;
  if (!Number.isFinite(timestamp) || timestamp > now) return 0;
  return Math.max(0, Math.ceil(TRIAL_DAYS - (now - timestamp) / 86400000));
}

export function confirmedGrantActive(
  confirmed: boolean,
  grant: { duration: string; expires_at: string | null } | null | undefined,
  now = Date.now(),
): boolean {
  return confirmed && !!grant && planoAtivo(grant.duration, grant.expires_at, now);
}

export function subscriptionActive(
  sub: { status: string; current_period_end: string | null } | null | undefined,
  now = Date.now(),
): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  if (["active", "trialing", "past_due"].includes(sub.status)) return end === null || end > now;
  return sub.status === "canceled" && end !== null && end > now;
}