// Test helper: lets plain Node import modules that start with `import "server-only"`
// (Next.js resolves that package itself at build time; Node cannot).
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(
      "export async function resolve(s, c, next) { if (s === 'server-only') return { url: 'data:text/javascript,', shortCircuit: true }; return next(s, c); }",
    ),
);
