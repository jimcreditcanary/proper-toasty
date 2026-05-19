// Mustachio-lite subject renderer.
//
// Why we need this rather than relying on Postmark's native renderer:
//
//   Postmark templates have a single Subject field. We set it to the
//   literal placeholder `{{subject}}`, then pass the actual subject
//   text (e.g. `"Quick question, {{first_name}}"`) as a merge
//   variable. Postmark substitutes `{{subject}}` once and emits the
//   result verbatim — it does NOT recursively render placeholders
//   that appear inside a substituted value. So `{{first_name}}` in
//   the subject value leaks through as literal text.
//
//   Pre-rendering the subject server-side, before handing it to
//   Postmark, sidesteps the recursion gap.
//
// Supported syntax (a subset of Postmark's Mustachio):
//
//   `{{var}}`               — replace with vars[var] stringified.
//                             Missing / null → empty string.
//
//   `{{#var}}…{{/var}}`     — render the inner block only when
//                             vars[var] is truthy (non-null,
//                             non-empty string, non-zero). When
//                             false the entire block (including
//                             markers) is dropped. Use for
//                             conditional personalisation:
//
//                               Quick question{{#first_name}}, {{first_name}}{{/first_name}}
//
//                             → "Quick question, James" when known
//                             → "Quick question"        when blank
//
// We don't implement: partials, nested context, inverted sections,
// list iteration. The subject line is one line, the variable set is
// fixed by buildMergeVars, and we own all subject_variants in DB —
// no need for the full Mustache feature set.

export function renderSubjectVars(
  template: string,
  vars: Record<string, string | number | null>,
): string {
  // First pass: handle `{{#var}}...{{/var}}` conditional blocks.
  // Drop the block when var is missing / empty string / 0; otherwise
  // unwrap markers and keep the inner content for pass 2 to
  // substitute.
  let out = template.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_match, varName: string, inner: string) => {
      const v = vars[varName];
      const truthy = v != null && v !== "" && v !== 0;
      return truthy ? inner : "";
    },
  );
  // Second pass: replace `{{var}}` with stringified value (empty
  // string when missing).
  out = out.replace(/\{\{(\w+)\}\}/g, (_m, varName: string) => {
    const v = vars[varName];
    return v == null ? "" : String(v);
  });
  // Final tidy: collapse any double-spaces, dangling spaces before
  // punctuation introduced by removed conditional blocks.
  return out.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").trim();
}
