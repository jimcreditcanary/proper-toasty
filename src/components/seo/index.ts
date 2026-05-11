// Barrel — pages import from "@/components/seo".
//
// Schema components live under "@/components/seo/schema" and have
// their own barrel; pages typically don't need them directly when
// using AEOPage (it emits the schema for you). Imported here so
// callers can opt into a schema component standalone if they need
// to.

export { AEOPage, type AEOPageProps } from "./AEOPage";
export { DirectAnswer } from "./DirectAnswer";
export { LastUpdated } from "./LastUpdated";
export { AuthorByline } from "./AuthorByline";
export { TLDR } from "./TLDR";
export { SourcesList } from "./SourcesList";
export { ComparisonTable, type ComparisonTableProps } from "./ComparisonTable";

// Re-export schema components for convenience.
export * from "./schema";

// Re-export typed source entry from validators so caller TS imports
// stay in one place.
export type { SourceEntry } from "@/lib/seo/validators";
