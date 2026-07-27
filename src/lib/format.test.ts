import { describe, expect, it } from "vitest";
import { countWords, makePreview, parseTagsInput } from "./format";

describe("makePreview", () => {
  it("skips headings and joins body lines", () => {
    expect(makePreview("# Title\n\nHello world\nSecond")).toBe("Hello world Second");
  });

  it("handles empty content", () => {
    expect(makePreview("")).toBe("");
  });
});

describe("countWords", () => {
  it("counts cjk characters", () => {
    expect(countWords("你好世界")).toBe(4);
  });

  it("counts latin words", () => {
    expect(countWords("hello world")).toBe(2);
  });
});

describe("parseTagsInput", () => {
  it("splits Chinese and English commas", () => {
    expect(parseTagsInput("工作, 计划，技术")).toEqual(["工作", "计划", "技术"]);
  });
});
