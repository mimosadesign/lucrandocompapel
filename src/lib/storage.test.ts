import { describe, expect, it } from "vitest";
import { MERGE_KEYS, mergeLists } from "./storage";

describe("sincronização de cadastros", () => {
  it("pedido feito no celular não apaga os pedidos que já estavam no computador", () => {
    const nuvem = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const celular = [{ id: "novo" }];
    const ids = mergeLists(celular, nuvem, new Set()).map((i) => i.id);
    expect(ids.sort()).toEqual(["a", "b", "c", "novo"]);
  });

  it("um item excluído de verdade não volta", () => {
    const nuvem = [{ id: "a" }, { id: "b" }];
    const aparelho = [{ id: "a" }];
    const ids = mergeLists(aparelho, nuvem, new Set(["b"])).map((i) => i.id);
    expect(ids).toEqual(["a"]);
  });

  it("a versão mais nova de um item editado é mantida", () => {
    const novo = [{ id: "a", total: 50 }];
    const antigo = [{ id: "a", total: 10 }];
    expect(mergeLists(novo, antigo, new Set())).toEqual([{ id: "a", total: 50 }]);
  });

  it("pedidos, orçamentos e materiais estão protegidos", () => {
    expect(MERGE_KEYS.test("lcp:pedidos")).toBe(true);
    expect(MERGE_KEYS.test("lcp:orcamentos")).toBe(true);
    expect(MERGE_KEYS.test("lcp:materiais")).toBe(true);
    expect(MERGE_KEYS.test("lcp:materiais:historico")).toBe(false);
  });
});
