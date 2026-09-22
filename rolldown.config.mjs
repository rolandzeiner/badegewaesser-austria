// Rolldown, not Rollup. There is no Rollup and no @rollup/plugin-* anywhere
// in this portfolio: rolldown does transpilation, minification, module
// resolution and JSON natively, so the four plugins that stack used to need
// are gone rather than replaced. Rolldown does NOT type-check —
// `tsc --noEmit` is the only type-check in the pipeline, exactly as it was
// under swc.
//
// Decorators are deliberately not configured here. Rolldown reads
// tsconfig.json itself and turns on Lit's legacy (experimental) decorators
// from it, so there is only one copy of those settings.
import { defineConfig } from "rolldown";

// Verified against rolldown 1.2.9: `rolldown -c -w` sets BOTH ROLLDOWN_WATCH
// and ROLLUP_WATCH to "true", and a plain `rolldown -c` sets neither. Reading
// both means this keeps working whichever name rolldown settles on — and the
// failure mode it guards against is silent (dev builds shipping minified,
// prod builds shipping sourcemaps).
const dev = !!(process.env.ROLLDOWN_WATCH || process.env.ROLLUP_WATCH);

// MUST be a legal comment — `/*! ... */`, not `//`. Rolldown's minifier
// strips ordinary comments including a `//` banner, silently; the only way
// to notice is to read the first bytes of the built file.
// `comments: { legal: true }` below is the other half of the requirement.
const banner =
  "/*! Badegewässer Austria — bundled by Rolldown. Edit sources in src/, then `npm run build`. */";

const card = (name) => ({
  input: `src/${name}.ts`,
  output: {
    file: `custom_components/badegewaesser_austria/www/${name}.js`,
    format: "es",
    sourcemap: dev,
    banner,
    // Replaces the deprecated `inlineDynamicImports: true`.
    codeSplitting: false,
    comments: { legal: true },
    minify: dev
      ? false
      : {
          // Keep console.* — do NOT flip this to true. The card's console
          // calls are its only client-side failure signal: most sit in catch
          // blocks, where dropping the call turns a caught error into a
          // silent one, and the console.info version banner is how you
          // confirm which bundle the browser actually loaded — the exact
          // question the stale-cache WebSocket version check exists to
          // answer. Rolldown's dropConsole is a boolean, all-or-nothing
          // (unlike terser's drop_console array), so keeping warn/error
          // means keeping everything.
          compress: { dropConsole: false },
          mangle: true,
          codegen: true,
        },
  },
});

// One card, one entrypoint, one bundle.
export default defineConfig([card("badegewaesser-austria-card")]);
