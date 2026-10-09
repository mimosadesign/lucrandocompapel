import { describe, it, expect } from "vitest";
import { novaExpiracao, planoAtivo } from "./plano";

const agora = new Date("2026-10-01T00:00:00Z");

describe("plano Diamante", () => {
  it("mensal vale 30 dias", () => {
    expect(novaExpiracao("1m", null, agora)).toBe("2026-10-31T00:00:00.000Z");
  });
  it("trimestral vale 90 dias", () => {
    expect(novaExpiracao("3m", null, agora)).toBe("2026-12-30T00:00:00.000Z");
  });
  it("renovar antes do vencimento soma aos dias restantes", () => {
    expect(novaExpiracao("1m", "2026-10-11T00:00:00Z", agora)).toBe("2026-11-10T00:00:00.000Z");
  });
  it("vencido sem renovar perde o Diamante", () => {
    expect(planoAtivo("1m", "2026-09-30T00:00:00Z", agora.getTime())).toBe(false);
  });
  it("vitalício nunca expira", () => {
    expect(planoAtivo("lifetime", null, agora.getTime())).toBe(true);
  });
});
