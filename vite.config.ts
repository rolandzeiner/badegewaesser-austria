// One config for the whole card toolchain under Vite+ (`vp`): build (Vite 8
// library mode on Rolldown), test (Vitest), lint + type-check (Oxlint with
// tsgolint) and format (Oxfmt). Replaces rolldown.config.mjs.
//
// Decorators are deliberately not configured here. Rolldown reads
// tsconfig.json itself and turns on Lit's legacy (experimental) decorators
// from it, so there is only one copy of those settings; the card suite
// catches a regression.
import { defineConfig } from "vite-plus";

// MUST be a legal comment — `/*! ... */`, not `//`. The minifier strips
// ordinary comments including a `//` banner, silently; the only way to notice
// is to read the first bytes of the built file. `comments: { legal: true }`
// below is the other half of the requirement.
const banner =
  "/*! Badegewässer Austria — bundled by Rolldown. Edit sources in src/, then `npm run build`. */";

// Dev vs prod comes from Vite's mode, not from a watch env var: `npm run dev`
// passes `--mode development`, a plain `vp build` is production.
export default defineConfig(({ mode }) => {
  const dev = mode === "development";
  return {
    build: {
      // Library mode: one ES module, no index.html, no hashed file name.
      // One card, one entrypoint, one bundle.
      lib: {
        entry: "src/badegewaesser-austria-card.ts",
        formats: ["es"],
        fileName: () => "badegewaesser-austria-card.js",
      },
      outDir: "custom_components/badegewaesser_austria/www",
      // www/ sits inside the integration package; never let Vite wipe it.
      emptyOutDir: false,
      copyPublicDir: false,
      target: "es2022",
      sourcemap: dev,
      rolldownOptions: {
        output: {
          banner,
          // HACS users get a single .js file, not a chunked dist/.
          codeSplitting: false,
          comments: { legal: true },
          // Set on the Rolldown output, not `build.minify`: Vite's library
          // mode skips whitespace minification for ES output.
          //
          // Keep console.* — do NOT flip dropConsole to true. The card's
          // console calls are its only client-side failure signal: most sit
          // in catch blocks, where dropping the call turns a caught error
          // into a silent one, and the console.info version banner is how
          // you confirm which bundle the browser actually loaded. Rolldown's
          // dropConsole is all-or-nothing, so keeping warn/error means
          // keeping everything.
          minify: dev ? false : { compress: { dropConsole: false }, mangle: true, codegen: true },
        },
      },
    },
    fmt: {
      // Leave Lit html/css templates alone. Formatting them rewrites the
      // whitespace inside rendered elements, which changes the DOM.
      embeddedLanguageFormatting: "off",
      // Format the card source only. The bundle is build output, tests/ is
      // the Python suite (its JSON fixture is AGES data as served), and
      // Markdown, YAML and TOML keep their hand formatting.
      ignorePatterns: [
        "custom_components/**",
        "tests/**",
        "**/*.md",
        ".github/**",
        "*.toml",
        "**/__snapshots__/**",
      ],
    },
    lint: {
      ignorePatterns: ["custom_components/**/www/**"],
      jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
      rules: {
        "vite-plus/prefer-vite-plus-imports": "error",
        // Opt-in rules from the `suspicious` category; the rest of that
        // category is mostly noise for Lit code (e.g. `_private` names).
        "typescript/no-unnecessary-type-assertion": "error",
        "eslint/no-shadow": "error",
        "unicorn/no-array-sort": "error",
      },
      // typeCheck makes `vp check` report tsc's errors (strict tsconfig
      // included), so it can stand in for `tsc --noEmit`.
      // denyWarnings: a warning fails `vp check` (and CI) instead of
      // scrolling past with exit 0.
      options: { typeAware: true, typeCheck: true, denyWarnings: true },
    },
  };
});
