import { describe, expect, it } from "vitest";
import { confirmedGrantActive, subscriptionActive, trialRemaining } from "./entitlement";

const now = Date.parse("2026-11-05T17:32:00Z");
describe("acesso confirmado e teste grátis", () => {
  it("não libera vitalício para e-mail não confirmado", () => {
    expect(confirmedGrantActive(false, { duration: "lifetime", expires_at: null }, now)).toBe(false);
  });
  it("libera vitalício para e-mail confirmado", () => {
    expect(confirmedGrantActive(true, { duration: "lifetime", expires_at: null }, now)).toBe(true);
  });
  it("não libera um presente mensal vencido", () => {
    expect(confirmedGrantActive(true, { duration: "1m", expires_at: "2026-11-05T17:31:00Z" }, now)).toBe(false);
  });
  it("mantém os 25 dias de teste com data controlada pelo servidor", () => {
    expect(trialRemaining("2026-11-05T17:32:00Z", now)).toBe(25);
    expect(trialRemaining("2026-10-11T17:32:00Z", now)).toBe(0);
  });
  it("data de teste ausente ou futura não concede acesso", () => {
    expect(trialRemaining(undefined, now)).toBe(0);
    expect(trialRemaining("2026-11-06T17:32:00Z", now)).toBe(0);
  });
  it("assinatura paga vale até o vencimento", () => {
    expect(subscriptionActive({ status: "active", current_period_end: "2026-11-06T17:32:00Z" }, now)).toBe(true);
    expect(subscriptionActive({ status: "active", current_period_end: "2026-11-05T17:32:00Z" }, now)).toBe(false);
  });
});