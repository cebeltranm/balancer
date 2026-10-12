import { describe, expect, it } from "vitest";
import { compareText, sortTreeByName } from "@/helpers/ordering";

// RT-041 / specs/architecture.md List Ordering.

function node(key: string, name: string, isCategory = false, children?: any[]) {
  return { key, data: { name, isCategory, values: [{ value: 1 }] }, children };
}

const keys = (nodes: any[]) => nodes.map((n) => n.key);

describe("compareText (List Ordering)", () => {
  it("ignores case and accents and compares digit runs numerically", () => {
    expect(compareText("Álamo", "alamo")).toBe(0);
    expect(compareText("Fund 2", "Fund 10")).toBeLessThan(0);
    expect(compareText("alpha", "Zeta")).toBeLessThan(0);
  });
});

describe("sortTreeByName (RT-041)", () => {
  it("puts categories before accounts, each sorted by name", () => {
    const sorted = sortTreeByName([
      node("b", "Beta"),
      node("z", "Zeta Bank", true),
      node("a", "alpha"),
      node("y", "alpha bank", true),
    ]);
    expect(keys(sorted)).toEqual(["y", "z", "a", "b"]);
  });

  it("sorts every nesting level", () => {
    const sorted = sortTreeByName([
      node("g", "Group", true, [
        node("acc2", "B"),
        node("sub", "Sub", true, [node("s2", "Y"), node("s1", "X")]),
        node("acc1", "A"),
      ]),
    ]);
    expect(keys(sorted[0].children!)).toEqual(["sub", "acc1", "acc2"]);
    expect(keys(sorted[0].children![0].children!)).toEqual(["s1", "s2"]);
  });

  it("breaks name ties by key and puts empty names last", () => {
    const sorted = sortTreeByName([
      node("e", ""),
      node("a1", "Álamo"),
      node("z", "Zeta"),
      node("a0", "alamo"),
    ]);
    expect(keys(sorted)).toEqual(["a0", "a1", "z", "e"]);
  });

  it("does not mutate the input or the node data", () => {
    const input = [node("b", "B"), node("a", "A")];
    const copy = JSON.stringify(input);
    const sorted = sortTreeByName(input);
    expect(JSON.stringify(input)).toBe(copy);
    expect(sorted[0].data).toBe(input[1].data);
  });
});
