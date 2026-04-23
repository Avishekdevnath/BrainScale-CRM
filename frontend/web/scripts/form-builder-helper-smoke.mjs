import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const helperPath = path.resolve("frontend/web/src/components/forms/formBuilderStudio.helpers.ts");

const source = await fs.readFile(helperPath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: helperPath,
});

const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
const helpers = await import(moduleUrl);

const {
  buildFormPayload,
  getFieldTypeLabel,
  getVisibleTypeOptions,
  makeField,
  normalizeChoiceOptions,
} = helpers;

assert.deepEqual(
  normalizeChoiceOptions([" Option 1 ", "", "Option 2", "Option 1", "   "]),
  ["Option 1", "Option 2"],
  "choice options should be trimmed, blank values removed, and duplicates de-duplicated by first occurrence"
);

assert.equal(
  getVisibleTypeOptions("quiz").some((option) => option.value === "quiz"),
  true,
  "legacy quiz forms should still surface quiz as a visible type option"
);

assert.equal(
  getFieldTypeLabel("section_break"),
  "Section",
  "section_break should have a visible label for builder controls"
);

assert.equal(
  makeField("section_break", 3).label,
  "Section 3",
  "section break creation should generate a section-oriented label"
);

const payload = buildFormPayload({
  title: "Student Feedback",
  description: "",
  type: "general",
  slug: "student-feedback",
  moduleName: "",
  courseName: "Course 01",
  batchName: "",
  fields: [],
  settings: { confirmationMessage: "Saved" },
});

assert.deepEqual(
  payload.settings,
  { confirmationMessage: "Saved" },
  "payload builder should preserve existing settings"
);

assert.equal(
  payload.slug,
  "student-feedback",
  "payload builder should preserve slug"
);

console.log(`Smoke checks passed for ${pathToFileURL(helperPath).href}`);
