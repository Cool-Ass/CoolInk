import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import { globalIgnores } from "eslint/config";

const config = [
  ...nextCoreWebVitals,
  { rules: { "@next/next/no-html-link-for-pages": "warn" } },
  globalIgnores([".next/**", "node_modules/**", "prisma/generated/**"]),
];

export default config;
