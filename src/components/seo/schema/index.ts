// Barrel exports for JSON-LD schema components. Pages import from
// "@/components/seo/schema" and pick the components they need.

export { JsonLd } from "./JsonLd";
export { OrganizationSchema } from "./OrganizationSchema";
export { WebSiteSchema } from "./WebSiteSchema";
export { ArticleSchema, type ArticleSchemaProps } from "./ArticleSchema";
export {
  FaqPageSchema,
  extractFaqsFromHtml,
  type FaqEntry,
  type FaqPageSchemaProps,
} from "./FaqPageSchema";
export {
  BreadcrumbListSchema,
  type BreadcrumbItem,
  type BreadcrumbListSchemaProps,
} from "./BreadcrumbListSchema";
export { PersonSchema, type PersonSchemaProps } from "./PersonSchema";
export {
  HowToSchema,
  type HowToSchemaProps,
  type HowToStep,
} from "./HowToSchema";
