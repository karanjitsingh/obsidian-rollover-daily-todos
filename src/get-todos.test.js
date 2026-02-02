import { expect, test } from "vitest";
import { getTodos } from "./get-todos";

test("single todo element should return itself", () => {
  const lines = ["- [ ] tada"];
  const result = getTodos({ lines });
  expect(result).toStrictEqual(["- [ ] tada"]);
});

test("single incomplete element should return itself", () => {
  const lines = ["- [/] tada"];
  const result = getTodos({ lines });
  expect(result).toStrictEqual(["- [/] tada"]);
});

test("single done todo element should not return itself", () => {
  const lines = ["- [x] tada"];
  const result = getTodos({ lines });
  expect(result).toStrictEqual([]);
});

test("single canceled todo element should not return itself", () => {
  const lines = ["- [-] tada"];
  const result = getTodos({ lines });
  expect(result).toStrictEqual([]);
});

test("removes checked checkboxes and keeps unchecked with text", () => {
  const lines = [
    "- [ ] TODO",
    "    - [ ] Next",
    "    - some stuff",
    "- [ ] Another one",
    "    - [ ] More children",
    "    - another child",
    "- this isn't a checkbox",
  ];

  const todos = getTodos({ lines, withChildren: true });

  expect(todos).toStrictEqual([
    "- [ ] TODO",
    "    - [ ] Next",
    "",
    "    - some stuff",
    "",
    "- [ ] Another one",
    "    - [ ] More children",
    "",
    "    - another child",
    "- this isn't a checkbox",
  ]);
});

test("removes checked checkboxes with alternate symbols", () => {
  const lines = [
    "+ [x] Completed TODO",
    "    + [ ] Next",
    "    * some stuff",
    "* [ ] Another one",
    "    - [x] Completed child",
    "    + another child",
  ];

  const todos = getTodos({ lines, withChildren: true });

  expect(todos).toStrictEqual([
    "    + [ ] Next",
    "",
    "    * some stuff",
    "",
    "* [ ] Another one",
    "",
    "    + another child",
  ]);
});

test("supports custom done status markers", () => {
  const lines = [
    "+ [✅] Completed TODO",
    "    + [🟣] Next",
    "    * some stuff",
    "* [🟣] Another one",
    "    - [✅] Completed child",
    "    + another child",
  ];

  const todos = getTodos({
    lines,
    withChildren: true,
    doneStatusMarkers: "✅",
  });

  expect(todos).toStrictEqual([
    "    + [🟣] Next",
    "",
    "    * some stuff",
    "",
    "* [🟣] Another one",
    "",
    "    + another child",
  ]);
});

test("removes empty headings", () => {
  const lines = [
    "# Heading with content",
    "- [ ] todo under heading",
    "# Empty heading",
    "- [x] only checked item",
    "# Another with content",
    "some text here",
  ];

  const todos = getTodos({ lines });

  expect(todos).toStrictEqual([
    "# Heading with content",
    "- [ ] todo under heading",
    "# Another with content",
    "some text here",
  ]);
});

test("removes nested empty headings", () => {
  const lines = [
    "# Top level",
    "## Sub heading with content",
    "- [ ] todo",
    "## Empty sub heading",
    "- [x] checked",
    "# Empty top level",
    "## Also empty",
    "- [x] all checked",
  ];

  const todos = getTodos({ lines });

  expect(todos).toStrictEqual([
    "# Top level",
    "## Sub heading with content",
    "- [ ] todo",
  ]);
});

test("preserves text content under headings", () => {
  const lines = [
    "# Notes",
    "Some important text",
    "More text here",
    "- [ ] a todo",
    "- [x] done todo",
  ];

  const todos = getTodos({ lines });

  expect(todos).toStrictEqual([
    "# Notes",
    "Some important text",
    "More text here",
    "",
    "- [ ] a todo",
  ]);
});

test("adds newlines around checkbox groups", () => {
  const lines = [
    "# Tasks",
    "- [ ] first",
    "- [ ] second",
    "some text",
    "- [ ] third",
  ];

  const todos = getTodos({ lines });

  expect(todos).toStrictEqual([
    "# Tasks",
    "- [ ] first",
    "- [ ] second",
    "",
    "some text",
    "",
    "- [ ] third",
  ]);
});

test("handles document with only checked items", () => {
  const lines = ["# Done", "- [x] task 1", "- [x] task 2"];

  const todos = getTodos({ lines });

  expect(todos).toStrictEqual([]);
});

test("handles mixed content correctly", () => {
  const lines = [
    "# Project",
    "## Tasks",
    "- [ ] incomplete",
    "- [x] complete",
    "## Notes",
    "Remember this",
    "## Empty section",
    "- [x] all done here",
  ];

  const todos = getTodos({ lines });

  expect(todos).toStrictEqual([
    "# Project",
    "## Tasks",
    "- [ ] incomplete",
    "## Notes",
    "Remember this",
  ]);
});

test("supports custom done status markers for filtering", () => {
  const lines = [
    "- [ ] Incomplete task",
    "- [x] Completed task (x)",
    "- [X] Completed task (X)",
    "- [-] Completed task (-)",
    "- [C] Task with custom status (C)",
    "- [?] Task with custom status (?)",
  ];

  // Only consider 'C' and '?' as done
  const todos = getTodos({ lines, doneStatusMarkers: "C?" });

  expect(todos).toStrictEqual([
    "- [ ] Incomplete task",
    "- [x] Completed task (x)",
    "- [X] Completed task (X)",
    "- [-] Completed task (-)",
  ]);
});

test("handles deeply nested headings", () => {
  const lines = [
    "# Level 1",
    "## Level 2",
    "### Level 3",
    "- [ ] deep todo",
    "### Empty Level 3",
    "- [x] done",
    "## Empty Level 2",
    "### Also empty",
    "- [x] done",
  ];

  const todos = getTodos({ lines });

  expect(todos).toStrictEqual([
    "# Level 1",
    "## Level 2",
    "### Level 3",
    "- [ ] deep todo",
  ]);
});

test("preserves content without headings", () => {
  const lines = ["Just some text", "- [ ] a todo", "- [x] done", "More text"];

  const todos = getTodos({ lines });

  expect(todos).toStrictEqual([
    "Just some text",
    "",
    "- [ ] a todo",
    "",
    "More text",
  ]);
});

test("should not match malformed todos", () => {
  const lines = [
    "- [ ] valid todo",
    "- [x] done",
    "- [] empty",
    "- [  ] multiple spaces",
  ];

  const todos = getTodos({ lines });

  expect(todos).toStrictEqual([
    "- [ ] valid todo",
    "",
    "- [] empty",
    "",
    "- [  ] multiple spaces",
  ]);
});
