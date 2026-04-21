export function isFeatureEnabled(flag: string): boolean {
  return process.env[`FEATURE_${flag.toUpperCase()}`] === "true";
}
