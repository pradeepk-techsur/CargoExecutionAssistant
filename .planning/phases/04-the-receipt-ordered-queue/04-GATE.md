---
phase: 04
gate_status: passed
build_command: "npm run build"
test_command: "npm test"
last_updated: 2026-09-15T20:28:09Z
tests_disabled_during_fixes: none
shadowed_sources: 0
waves:
  - wave: 1
    build: pass
    tests: pass
    fix_attempts: 0
  - wave: 2
    build: pass
    tests: pass
    fix_attempts: 0
  - wave: 3
    build: pass
    tests: pass
    fix_attempts: 0
  - wave: 4
    build: pass
    tests: pass
    fix_attempts: 0
---

## Wave 1

- Build: `npm run build` → pass
- Tests: `npm test` → pass
- Fix attempts: 0/3

### Gate output

```
> build
> npm run build:server && npm run build:web


> build:server
> tsc -b contract server


> build:web
> npm run build:css && npm run build:assets && vite build -c web/vite.config.ts


> build:css
> sass --no-source-map --load-path=node_modules --load-path=node_modules/@uswds/uswds/packages web/styles/app.scss web/public/assets/uswds.css

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use math.unit instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
14 │   @if unit($grid-in-rem) != "rem" {
   │       ^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/functions/units/rem-to-user-em.scss 14:7  rem-to-user-em()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/at-media.scss 17:12        at-media()
    node_modules/@uswds/uswds/packages/usa-display/src/styles/_usa-display.scss 7:3                    @forward
    node_modules/@uswds/uswds/packages/usa-display/src/styles/_index.scss 4:1                          @forward
    _index.scss 5:1                                                                                    @forward
    _index.scss 5:1                                                                                    @forward
    _index.scss 13:1                                                                                   @forward
    web/styles/app.scss 29:1                                                                           root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
34  │       content: "";
    │       ^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 34:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
35  │       display: inline;
    │       ^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 35:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
36  │       margin-top: 0.7ex;
    │       ^^^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 36:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
37  │       margin-left: 2px;
    │       ^^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 37:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
38  │       padding-left: 1.75ex;
    │       ^^^^^^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 38:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.has-key instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
45 │   @if map-has-key($our-breakpoints, $quoted-bp) {
   │       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/at-media.scss 45:7             at-media-max()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/typography/usa-table-styles.scss 18:5  usa-table-styles()
    node_modules/@uswds/uswds/packages/usa-prose/src/styles/_usa-prose.scss 8:5                            @forward
    node_modules/@uswds/uswds/packages/usa-prose/src/styles/_index.scss 4:1                                @forward
    _index.scss 5:1                                                                                        @forward
    _index.scss 10:1                                                                                       @forward
    _index.scss 13:1                                                                                       @forward
    web/styles/app.scss 29:1                                                                               root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.merge instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
24 │   $accordion-button-unopen-hc-icon: map-merge(
   │ ┌───────────────────────────────────^
25 │ │   $accordion-icon-map-defaults,
26 │ │   (
27 │ │     "name": "add",
28 │ │   )
29 │ │ );
   │ └─^
   ╵
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 24:35  @forward
    usa-accordion/src/_index.scss 1:1                                                      @forward
    _index.scss 14:1                                                                       @forward
    web/styles/app.scss 29:1                                                               root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.merge instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
31 │   $accordion-button-open-hc-icon: map-merge(
   │ ┌─────────────────────────────────^
32 │ │   $accordion-icon-map-defaults,
33 │ │   (
34 │ │     "name": "remove",
35 │ │   )
36 │ │ );
   │ └─^
   ╵
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 31:33  @forward
    usa-accordion/src/_index.scss 1:1                                                      @forward
    _index.scss 14:1                                                                       @forward
    web/styles/app.scss 29:1                                                               root stylesheet

DEPRECATION WARNING: color.lightness() is deprecated. Suggestion:

color.channel($color, "lightness", $space: hsl)

More info: https://sass-lang.com/d/color-functions

   ╷
16 │   @return if(color.lightness(color($token-from-bg)) > 50%, true, false);
   │              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/functions/color/is-color-dark.scss 16:14    is-color-dark()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/set-icon-from-bg.scss 12:24  set-icon-from-bg()
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 61:3                 accordion-button-styles()
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 193:3                @forward
    usa-accordion/src/_index.scss 1:1                                                                    @forward
    _index.scss 14:1                                                                                     @forward
    web/styles/app.scss 29:1                                                                             root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.merge instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
24 │   $banner-icon-chevron-up: map-merge(
   │ ┌──────────────────────────^
25 │ │   $banner-icon-chevron,
26 │ │   (
27 │ │     "name": "expand_less",
28 │ │   )
29 │ │ );
   │ └─^
   ╵
    node_modules/@uswds/uswds/packages/usa-banner/src/styles/_usa-banner.scss 24:26  @forward
    usa-banner/src/_index.scss 4:1                                                   @forward
    _index.scss 16:1                                                                 @forward
    web/styles/app.scss 29:1                                                         root stylesheet

DEPRECATION WARNING: color.lightness() is deprecated. Suggestion:

color.channel($color, "lightness", $space: hsl)

More info: https://sass-lang.com/d/color-functions

   ╷
68 │     color.lightness(color($input-bg-color)) < 50%,
   │     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/checkbox-and-radio-colors.scss 68:5  -checkbox-and-radio-colors()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/checkbox-and-radio-colors.scss 12:3  checkbox-colors()
    node_modules/@uswds/uswds/packages/usa-checkbox/src/styles/_usa-checkbox.scss 5:1                            @forward
    node_modules/@uswds/uswds/packages/usa-checkbox/src/styles/_index.scss 4:1                                   @forward
    _index.scss 8:1                                                                                              @forward
    _index.scss 4:1                                                                                              @forward
    _index.scss 51:1                                                                                             @forward
    web/styles/app.scss 29:1                                                                                     root stylesheet

WARNING: 446 repetitive deprecation warnings omitted.
Run in verbose mode to see all warnings.


> build:assets
> node web/scripts/copy-uswds-assets.mjs

copied /home/daytona/project/node_modules/@uswds/uswds/dist/img -> /home/daytona/project/web/public/assets/img
copied /home/daytona/project/node_modules/@uswds/uswds/dist/fonts -> /home/daytona/project/web/public/assets/fonts
copied /home/daytona/project/node_modules/@uswds/uswds/dist/js -> /home/daytona/project/web/public/assets/js
uswds assets copied
[36mvite v5.4.11 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 54 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                [39m[1m[2m  0.92 kB[22m[1m[22m[2m │ gzip:  0.54 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-Dn9JTG7r.js  [39m[1m[2m225.52 kB[22m[1m[22m[2m │ gzip: 73.12 kB[22m
[32m✓ built in 555ms[39m

> test
> npm run test:unit && npm run test:db && npm run test:api && npm run test:arch


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/validation.engine.spec.ts [2m([22m[2m23 tests[22m[2m)[22m[90m 29[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.rules.spec.ts [2m([22m[2m71 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 55[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.registry.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 4[2mms[22m[39m
 [32m✓[39m server/test/unit/errorMapper.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 24[2mms[22m[39m
 [32m✓[39m server/test/unit/headers.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 17[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m28 tests[22m[2m)[22m[90m 2[2mms[22m[39m
 [32m✓[39m server/test/unit/throttle.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/redaction.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/cookies.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m12 passed[39m[22m[90m (12)[39m
[2m      Tests [22m [1m[32m218 passed[39m[22m[90m (218)[39m
[2m   Start at [22m 19:52:28
[2m   Duration [22m 667ms[2m (transform 92ms, setup 0ms, collect 433ms, tests 143ms, environment 0ms, prepare 22ms)[22m


> test:db
> vitest run server/test/db


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/db/chain.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 826[2mms[22m[39m
   [33m[2m✓[22m[39m TEST-DB-13 & TEST-DB-14 — sequencing under concurrency and chain refusal at commit[2m > [22mTEST-DB-13: two concurrent appends produce contiguous sequences 4 and 5 with correct linkage, the second blocked until the first commits [33m431[2mms[22m[39m
 [32m✓[39m server/test/db/immutability.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[90m 232[2mms[22m[39m
 [32m✓[39m server/test/db/exceptionBasis.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 205[2mms[22m[39m
 [32m✓[39m server/test/db/coupling.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 236[2mms[22m[39m
 [32m✓[39m server/test/db/receipt.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 124[2mms[22m[39m
 [32m✓[39m server/test/db/provenance.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 354[2mms[22m[39m
 [32m✓[39m server/test/db/entries.repo.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 87[2mms[22m[39m
 [32m✓[39m server/test/db/queueRead.repo.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 130[2mms[22m[39m
 [32m✓[39m server/test/db/hitl.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 180[2mms[22m[39m
 [32m✓[39m server/test/db/receiptAtomicity.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 87[2mms[22m[39m
 [32m✓[39m server/test/db/session.service.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 348[2mms[22m[39m
 [32m✓[39m server/test/db/writer.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 72[2mms[22m[39m
 [32m✓[39m server/test/db/harness.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 93[2mms[22m[39m

[2m Test Files [22m [1m[32m13 passed[39m[22m[90m (13)[39m
[2m      Tests [22m [1m[32m167 passed[39m[22m[90m (167)[39m
[2m   Start at [22m 19:52:29
[2m   Duration [22m 3.31s[2m (transform 141ms, setup 0ms, collect 239ms, tests 2.98s, environment 0ms, prepare 23ms)[22m


> test:api
> vitest run server/test/api


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/api/entries.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[90m 243[2mms[22m[39m
 [32m✓[39m server/test/api/guard.spec.ts [2m([22m[2m36 tests[22m[2m)[22m[33m 364[2mms[22m[39m
 [32m✓[39m server/test/api/expiry.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 316[2mms[22m[39m
 [32m✓[39m server/test/api/session.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 399[2mms[22m[39m
 [32m✓[39m server/test/api/actor.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 129[2mms[22m[39m
 [32m✓[39m server/test/api/boot.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 47[2mms[22m[39m

[2m Test Files [22m [1m[32m6 passed[39m[22m[90m (6)[39m
[2m      Tests [22m [1m[32m104 passed[39m[22m[90m (104)[39m
[2m   Start at [22m 19:52:33
[2m   Duration [22m 1.84s[2m (transform 115ms, setup 0ms, collect 249ms, tests 1.50s, environment 0ms, prepare 22ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — exactly two destinations (FR-2.7, §8.3, criterion 5)[2m > [22m[2mthe rendered <nav aria-label="Primary"> contains exactly two anchors
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no excluded affordance in any UI destination or control[2m > [22m[2m4c. no rendered <Shell> link/button name outside the footer is an excluded affordance
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no excluded affordance in any UI destination or control[2m > [22m[2m4d. the footer link set equals the list pinned in Footer.tsx (exemption is auditable)
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no second-role affordance; reduced shell has no navigation[2m > [22m[2m6. the authenticated shell contains no supervisory affordance
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no second-role affordance; reduced shell has no navigation[2m > [22m[2m7. the reduced (/sign-in) shell renders no primary nav and no sign-out control
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

 [32m✓[39m server/test/architecture/navigation.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 30[2mms[22m[39m
 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m53 tests[22m[2m)[22m[90m 23[2mms[22m[39m
 [32m✓[39m server/test/architecture/receiptPaths.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 12[2mms[22m[39m
 [32m✓[39m server/test/architecture/headers.spec.ts [2m([22m[2m48 tests[22m[2m)[22m[90m 61[2mms[22m[39m
 [32m✓[39m server/test/architecture/validation.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 8[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 77[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 71[2mms[22m[39m

[2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[32m148 passed[39m[22m[90m (148)[39m
[2m   Start at [22m 19:52:35
[2m   Duration [22m 658ms[2m (transform 124ms, setup 0ms, collect 271ms, tests 281ms, environment 0ms, prepare 29ms)[22m
```

## Wave 2

- Build: `npm run build` → pass
- Tests: `npm test` → pass
- Fix attempts: 0/3

### Gate output

```
> build
> npm run build:server && npm run build:web


> build:server
> tsc -b contract server


> build:web
> npm run build:css && npm run build:assets && vite build -c web/vite.config.ts


> build:css
> sass --no-source-map --load-path=node_modules --load-path=node_modules/@uswds/uswds/packages web/styles/app.scss web/public/assets/uswds.css

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use math.unit instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
14 │   @if unit($grid-in-rem) != "rem" {
   │       ^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/functions/units/rem-to-user-em.scss 14:7  rem-to-user-em()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/at-media.scss 17:12        at-media()
    node_modules/@uswds/uswds/packages/usa-display/src/styles/_usa-display.scss 7:3                    @forward
    node_modules/@uswds/uswds/packages/usa-display/src/styles/_index.scss 4:1                          @forward
    _index.scss 5:1                                                                                    @forward
    _index.scss 5:1                                                                                    @forward
    _index.scss 13:1                                                                                   @forward
    web/styles/app.scss 29:1                                                                           root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
34  │       content: "";
    │       ^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 34:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
35  │       display: inline;
    │       ^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 35:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
36  │       margin-top: 0.7ex;
    │       ^^^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 36:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
37  │       margin-left: 2px;
    │       ^^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 37:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
38  │       padding-left: 1.75ex;
    │       ^^^^^^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 38:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.has-key instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
45 │   @if map-has-key($our-breakpoints, $quoted-bp) {
   │       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/at-media.scss 45:7             at-media-max()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/typography/usa-table-styles.scss 18:5  usa-table-styles()
    node_modules/@uswds/uswds/packages/usa-prose/src/styles/_usa-prose.scss 8:5                            @forward
    node_modules/@uswds/uswds/packages/usa-prose/src/styles/_index.scss 4:1                                @forward
    _index.scss 5:1                                                                                        @forward
    _index.scss 10:1                                                                                       @forward
    _index.scss 13:1                                                                                       @forward
    web/styles/app.scss 29:1                                                                               root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.merge instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
24 │   $accordion-button-unopen-hc-icon: map-merge(
   │ ┌───────────────────────────────────^
25 │ │   $accordion-icon-map-defaults,
26 │ │   (
27 │ │     "name": "add",
28 │ │   )
29 │ │ );
   │ └─^
   ╵
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 24:35  @forward
    usa-accordion/src/_index.scss 1:1                                                      @forward
    _index.scss 14:1                                                                       @forward
    web/styles/app.scss 29:1                                                               root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.merge instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
31 │   $accordion-button-open-hc-icon: map-merge(
   │ ┌─────────────────────────────────^
32 │ │   $accordion-icon-map-defaults,
33 │ │   (
34 │ │     "name": "remove",
35 │ │   )
36 │ │ );
   │ └─^
   ╵
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 31:33  @forward
    usa-accordion/src/_index.scss 1:1                                                      @forward
    _index.scss 14:1                                                                       @forward
    web/styles/app.scss 29:1                                                               root stylesheet

DEPRECATION WARNING: color.lightness() is deprecated. Suggestion:

color.channel($color, "lightness", $space: hsl)

More info: https://sass-lang.com/d/color-functions

   ╷
16 │   @return if(color.lightness(color($token-from-bg)) > 50%, true, false);
   │              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/functions/color/is-color-dark.scss 16:14    is-color-dark()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/set-icon-from-bg.scss 12:24  set-icon-from-bg()
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 61:3                 accordion-button-styles()
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 193:3                @forward
    usa-accordion/src/_index.scss 1:1                                                                    @forward
    _index.scss 14:1                                                                                     @forward
    web/styles/app.scss 29:1                                                                             root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.merge instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
24 │   $banner-icon-chevron-up: map-merge(
   │ ┌──────────────────────────^
25 │ │   $banner-icon-chevron,
26 │ │   (
27 │ │     "name": "expand_less",
28 │ │   )
29 │ │ );
   │ └─^
   ╵
    node_modules/@uswds/uswds/packages/usa-banner/src/styles/_usa-banner.scss 24:26  @forward
    usa-banner/src/_index.scss 4:1                                                   @forward
    _index.scss 16:1                                                                 @forward
    web/styles/app.scss 29:1                                                         root stylesheet

DEPRECATION WARNING: color.lightness() is deprecated. Suggestion:

color.channel($color, "lightness", $space: hsl)

More info: https://sass-lang.com/d/color-functions

   ╷
68 │     color.lightness(color($input-bg-color)) < 50%,
   │     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/checkbox-and-radio-colors.scss 68:5  -checkbox-and-radio-colors()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/checkbox-and-radio-colors.scss 12:3  checkbox-colors()
    node_modules/@uswds/uswds/packages/usa-checkbox/src/styles/_usa-checkbox.scss 5:1                            @forward
    node_modules/@uswds/uswds/packages/usa-checkbox/src/styles/_index.scss 4:1                                   @forward
    _index.scss 8:1                                                                                              @forward
    _index.scss 4:1                                                                                              @forward
    _index.scss 51:1                                                                                             @forward
    web/styles/app.scss 29:1                                                                                     root stylesheet

WARNING: 446 repetitive deprecation warnings omitted.
Run in verbose mode to see all warnings.


> build:assets
> node web/scripts/copy-uswds-assets.mjs

copied /home/daytona/project/node_modules/@uswds/uswds/dist/img -> /home/daytona/project/web/public/assets/img
copied /home/daytona/project/node_modules/@uswds/uswds/dist/fonts -> /home/daytona/project/web/public/assets/fonts
copied /home/daytona/project/node_modules/@uswds/uswds/dist/js -> /home/daytona/project/web/public/assets/js
uswds assets copied
[36mvite v5.4.11 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 54 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                [39m[1m[2m  0.92 kB[22m[1m[22m[2m │ gzip:  0.54 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-Dn9JTG7r.js  [39m[1m[2m225.52 kB[22m[1m[22m[2m │ gzip: 73.12 kB[22m
[32m✓ built in 648ms[39m

> test
> npm run test:unit && npm run test:db && npm run test:api && npm run test:arch


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/validation.engine.spec.ts [2m([22m[2m23 tests[22m[2m)[22m[90m 37[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.rules.spec.ts [2m([22m[2m71 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 55[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.registry.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/errorMapper.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 24[2mms[22m[39m
 [32m✓[39m server/test/unit/headers.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 16[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m28 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/throttle.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/redaction.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/cookies.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m12 passed[39m[22m[90m (12)[39m
[2m      Tests [22m [1m[32m218 passed[39m[22m[90m (218)[39m
[2m   Start at [22m 20:01:36
[2m   Duration [22m 688ms[2m (transform 100ms, setup 0ms, collect 441ms, tests 149ms, environment 0ms, prepare 23ms)[22m


> test:db
> vitest run server/test/db


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/db/chain.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 825[2mms[22m[39m
   [33m[2m✓[22m[39m TEST-DB-13 & TEST-DB-14 — sequencing under concurrency and chain refusal at commit[2m > [22mTEST-DB-13: two concurrent appends produce contiguous sequences 4 and 5 with correct linkage, the second blocked until the first commits [33m432[2mms[22m[39m
 [32m✓[39m server/test/db/immutability.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[90m 228[2mms[22m[39m
 [32m✓[39m server/test/db/exceptionBasis.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 204[2mms[22m[39m
 [32m✓[39m server/test/db/coupling.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 236[2mms[22m[39m
 [32m✓[39m server/test/db/receipt.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 130[2mms[22m[39m
 [32m✓[39m server/test/db/provenance.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 355[2mms[22m[39m
 [32m✓[39m server/test/db/queueService.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 856[2mms[22m[39m
   [33m[2m✓[22m[39m queue/caseRead services — F7 composition (plan 04-02)[2m > [22m3a. 501 open exceptions serve as 500 rows, truncated:true, the 500 lowest receipt_position values [33m677[2mms[22m[39m
 [32m✓[39m server/test/db/entries.repo.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 88[2mms[22m[39m
 [32m✓[39m server/test/db/queueRead.repo.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 131[2mms[22m[39m
 [32m✓[39m server/test/db/hitl.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 185[2mms[22m[39m
 [32m✓[39m server/test/db/receiptAtomicity.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 95[2mms[22m[39m
 [32m✓[39m server/test/db/session.service.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 347[2mms[22m[39m
 [32m✓[39m server/test/db/writer.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 70[2mms[22m[39m
 [32m✓[39m server/test/db/harness.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 94[2mms[22m[39m

[2m Test Files [22m [1m[32m14 passed[39m[22m[90m (14)[39m
[2m      Tests [22m [1m[32m175 passed[39m[22m[90m (175)[39m
[2m   Start at [22m 20:01:37
[2m   Duration [22m 4.22s[2m (transform 173ms, setup 0ms, collect 276ms, tests 3.84s, environment 0ms, prepare 22ms)[22m


> test:api
> vitest run server/test/api


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/api/entries.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[90m 233[2mms[22m[39m
 [32m✓[39m server/test/api/guard.spec.ts [2m([22m[2m36 tests[22m[2m)[22m[33m 359[2mms[22m[39m
 [32m✓[39m server/test/api/expiry.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 322[2mms[22m[39m
 [32m✓[39m server/test/api/session.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 398[2mms[22m[39m
 [32m✓[39m server/test/api/actor.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 137[2mms[22m[39m
 [32m✓[39m server/test/api/boot.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 51[2mms[22m[39m

[2m Test Files [22m [1m[32m6 passed[39m[22m[90m (6)[39m
[2m      Tests [22m [1m[32m104 passed[39m[22m[90m (104)[39m
[2m   Start at [22m 20:01:41
[2m   Duration [22m 1.86s[2m (transform 122ms, setup 0ms, collect 272ms, tests 1.50s, environment 0ms, prepare 22ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — exactly two destinations (FR-2.7, §8.3, criterion 5)[2m > [22m[2mthe rendered <nav aria-label="Primary"> contains exactly two anchors
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no excluded affordance in any UI destination or control[2m > [22m[2m4c. no rendered <Shell> link/button name outside the footer is an excluded affordance
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no excluded affordance in any UI destination or control[2m > [22m[2m4d. the footer link set equals the list pinned in Footer.tsx (exemption is auditable)
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no second-role affordance; reduced shell has no navigation[2m > [22m[2m6. the authenticated shell contains no supervisory affordance
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

 [32m✓[39m server/test/architecture/navigation.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 34[2mms[22m[39m
[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no second-role affordance; reduced shell has no navigation[2m > [22m[2m7. the reduced (/sign-in) shell renders no primary nav and no sign-out control
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m53 tests[22m[2m)[22m[90m 20[2mms[22m[39m
 [32m✓[39m server/test/architecture/receiptPaths.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 12[2mms[22m[39m
 [32m✓[39m server/test/architecture/headers.spec.ts [2m([22m[2m48 tests[22m[2m)[22m[90m 62[2mms[22m[39m
 [32m✓[39m server/test/architecture/validation.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 75[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 71[2mms[22m[39m

[2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[32m148 passed[39m[22m[90m (148)[39m
[2m   Start at [22m 20:01:43
[2m   Duration [22m 650ms[2m (transform 137ms, setup 0ms, collect 280ms, tests 279ms, environment 0ms, prepare 22ms)[22m
```

## Wave 3

- Build: `npm run build` → pass
- Tests: `npm test` → pass
- Fix attempts: 0/3

### Gate output

```
> build
> npm run build:server && npm run build:web


> build:server
> tsc -b contract server


> build:web
> npm run build:css && npm run build:assets && vite build -c web/vite.config.ts


> build:css
> sass --no-source-map --load-path=node_modules --load-path=node_modules/@uswds/uswds/packages web/styles/app.scss web/public/assets/uswds.css

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use math.unit instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
14 │   @if unit($grid-in-rem) != "rem" {
   │       ^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/functions/units/rem-to-user-em.scss 14:7  rem-to-user-em()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/at-media.scss 17:12        at-media()
    node_modules/@uswds/uswds/packages/usa-display/src/styles/_usa-display.scss 7:3                    @forward
    node_modules/@uswds/uswds/packages/usa-display/src/styles/_index.scss 4:1                          @forward
    _index.scss 5:1                                                                                    @forward
    _index.scss 5:1                                                                                    @forward
    _index.scss 13:1                                                                                   @forward
    web/styles/app.scss 29:1                                                                           root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
34  │       content: "";
    │       ^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 34:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
35  │       display: inline;
    │       ^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 35:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
36  │       margin-top: 0.7ex;
    │       ^^^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 36:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
37  │       margin-left: 2px;
    │       ^^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 37:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
38  │       padding-left: 1.75ex;
    │       ^^^^^^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 38:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.has-key instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
45 │   @if map-has-key($our-breakpoints, $quoted-bp) {
   │       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/at-media.scss 45:7             at-media-max()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/typography/usa-table-styles.scss 18:5  usa-table-styles()
    node_modules/@uswds/uswds/packages/usa-prose/src/styles/_usa-prose.scss 8:5                            @forward
    node_modules/@uswds/uswds/packages/usa-prose/src/styles/_index.scss 4:1                                @forward
    _index.scss 5:1                                                                                        @forward
    _index.scss 10:1                                                                                       @forward
    _index.scss 13:1                                                                                       @forward
    web/styles/app.scss 29:1                                                                               root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.merge instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
24 │   $accordion-button-unopen-hc-icon: map-merge(
   │ ┌───────────────────────────────────^
25 │ │   $accordion-icon-map-defaults,
26 │ │   (
27 │ │     "name": "add",
28 │ │   )
29 │ │ );
   │ └─^
   ╵
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 24:35  @forward
    usa-accordion/src/_index.scss 1:1                                                      @forward
    _index.scss 14:1                                                                       @forward
    web/styles/app.scss 29:1                                                               root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.merge instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
31 │   $accordion-button-open-hc-icon: map-merge(
   │ ┌─────────────────────────────────^
32 │ │   $accordion-icon-map-defaults,
33 │ │   (
34 │ │     "name": "remove",
35 │ │   )
36 │ │ );
   │ └─^
   ╵
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 31:33  @forward
    usa-accordion/src/_index.scss 1:1                                                      @forward
    _index.scss 14:1                                                                       @forward
    web/styles/app.scss 29:1                                                               root stylesheet

DEPRECATION WARNING: color.lightness() is deprecated. Suggestion:

color.channel($color, "lightness", $space: hsl)

More info: https://sass-lang.com/d/color-functions

   ╷
16 │   @return if(color.lightness(color($token-from-bg)) > 50%, true, false);
   │              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/functions/color/is-color-dark.scss 16:14    is-color-dark()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/set-icon-from-bg.scss 12:24  set-icon-from-bg()
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 61:3                 accordion-button-styles()
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 193:3                @forward
    usa-accordion/src/_index.scss 1:1                                                                    @forward
    _index.scss 14:1                                                                                     @forward
    web/styles/app.scss 29:1                                                                             root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.merge instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
24 │   $banner-icon-chevron-up: map-merge(
   │ ┌──────────────────────────^
25 │ │   $banner-icon-chevron,
26 │ │   (
27 │ │     "name": "expand_less",
28 │ │   )
29 │ │ );
   │ └─^
   ╵
    node_modules/@uswds/uswds/packages/usa-banner/src/styles/_usa-banner.scss 24:26  @forward
    usa-banner/src/_index.scss 4:1                                                   @forward
    _index.scss 16:1                                                                 @forward
    web/styles/app.scss 29:1                                                         root stylesheet

DEPRECATION WARNING: color.lightness() is deprecated. Suggestion:

color.channel($color, "lightness", $space: hsl)

More info: https://sass-lang.com/d/color-functions

   ╷
68 │     color.lightness(color($input-bg-color)) < 50%,
   │     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/checkbox-and-radio-colors.scss 68:5  -checkbox-and-radio-colors()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/checkbox-and-radio-colors.scss 12:3  checkbox-colors()
    node_modules/@uswds/uswds/packages/usa-checkbox/src/styles/_usa-checkbox.scss 5:1                            @forward
    node_modules/@uswds/uswds/packages/usa-checkbox/src/styles/_index.scss 4:1                                   @forward
    _index.scss 8:1                                                                                              @forward
    _index.scss 4:1                                                                                              @forward
    _index.scss 51:1                                                                                             @forward
    web/styles/app.scss 29:1                                                                                     root stylesheet

WARNING: 446 repetitive deprecation warnings omitted.
Run in verbose mode to see all warnings.


> build:assets
> node web/scripts/copy-uswds-assets.mjs

copied /home/daytona/project/node_modules/@uswds/uswds/dist/img -> /home/daytona/project/web/public/assets/img
copied /home/daytona/project/node_modules/@uswds/uswds/dist/fonts -> /home/daytona/project/web/public/assets/fonts
copied /home/daytona/project/node_modules/@uswds/uswds/dist/js -> /home/daytona/project/web/public/assets/js
uswds assets copied
[36mvite v5.4.11 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 54 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                [39m[1m[2m  0.92 kB[22m[1m[22m[2m │ gzip:  0.54 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-Dn9JTG7r.js  [39m[1m[2m225.52 kB[22m[1m[22m[2m │ gzip: 73.12 kB[22m
[32m✓ built in 589ms[39m

> test
> npm run test:unit && npm run test:db && npm run test:api && npm run test:arch


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/validation.engine.spec.ts [2m([22m[2m23 tests[22m[2m)[22m[90m 31[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.rules.spec.ts [2m([22m[2m71 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 55[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.registry.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 4[2mms[22m[39m
 [32m✓[39m server/test/unit/errorMapper.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 25[2mms[22m[39m
 [32m✓[39m server/test/unit/headers.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 18[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m28 tests[22m[2m)[22m[90m 2[2mms[22m[39m
 [32m✓[39m server/test/unit/throttle.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/redaction.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/cookies.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m12 passed[39m[22m[90m (12)[39m
[2m      Tests [22m [1m[32m218 passed[39m[22m[90m (218)[39m
[2m   Start at [22m 20:12:09
[2m   Duration [22m 671ms[2m (transform 92ms, setup 0ms, collect 431ms, tests 146ms, environment 0ms, prepare 22ms)[22m


> test:db
> vitest run server/test/db


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/db/chain.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 837[2mms[22m[39m
   [33m[2m✓[22m[39m TEST-DB-13 & TEST-DB-14 — sequencing under concurrency and chain refusal at commit[2m > [22mTEST-DB-13: two concurrent appends produce contiguous sequences 4 and 5 with correct linkage, the second blocked until the first commits [33m433[2mms[22m[39m
 [32m✓[39m server/test/db/immutability.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[90m 231[2mms[22m[39m
 [32m✓[39m server/test/db/exceptionBasis.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 203[2mms[22m[39m
 [32m✓[39m server/test/db/coupling.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 242[2mms[22m[39m
 [32m✓[39m server/test/db/receipt.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 119[2mms[22m[39m
 [32m✓[39m server/test/db/provenance.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 372[2mms[22m[39m
 [32m✓[39m server/test/db/queueService.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 911[2mms[22m[39m
   [33m[2m✓[22m[39m queue/caseRead services — F7 composition (plan 04-02)[2m > [22m3a. 501 open exceptions serve as 500 rows, truncated:true, the 500 lowest receipt_position values [33m722[2mms[22m[39m
 [32m✓[39m server/test/db/entries.repo.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 88[2mms[22m[39m
 [32m✓[39m server/test/db/queueRead.repo.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 131[2mms[22m[39m
 [32m✓[39m server/test/db/hitl.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 180[2mms[22m[39m
 [32m✓[39m server/test/db/receiptAtomicity.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 93[2mms[22m[39m
 [32m✓[39m server/test/db/session.service.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 352[2mms[22m[39m
 [32m✓[39m server/test/db/writer.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 69[2mms[22m[39m
 [32m✓[39m server/test/db/harness.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 96[2mms[22m[39m

[2m Test Files [22m [1m[32m14 passed[39m[22m[90m (14)[39m
[2m      Tests [22m [1m[32m175 passed[39m[22m[90m (175)[39m
[2m   Start at [22m 20:12:10
[2m   Duration [22m 4.32s[2m (transform 165ms, setup 0ms, collect 303ms, tests 3.92s, environment 0ms, prepare 24ms)[22m


> test:api
> vitest run server/test/api


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/api/exceptions.spec.ts [2m([22m[2m20 tests[22m[2m)[22m[33m 315[2mms[22m[39m
 [32m✓[39m server/test/api/entries.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[90m 194[2mms[22m[39m
 [32m✓[39m server/test/api/guard.spec.ts [2m([22m[2m36 tests[22m[2m)[22m[33m 355[2mms[22m[39m
 [32m✓[39m server/test/api/expiry.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 325[2mms[22m[39m
 [32m✓[39m server/test/api/session.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 406[2mms[22m[39m
 [32m✓[39m server/test/api/actor.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 128[2mms[22m[39m
 [32m✓[39m server/test/api/boot.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 48[2mms[22m[39m

[2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[32m124 passed[39m[22m[90m (124)[39m
[2m   Start at [22m 20:12:15
[2m   Duration [22m 2.17s[2m (transform 144ms, setup 0ms, collect 300ms, tests 1.77s, environment 0ms, prepare 25ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — exactly two destinations (FR-2.7, §8.3, criterion 5)[2m > [22m[2mthe rendered <nav aria-label="Primary"> contains exactly two anchors
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no excluded affordance in any UI destination or control[2m > [22m[2m4c. no rendered <Shell> link/button name outside the footer is an excluded affordance
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no excluded affordance in any UI destination or control[2m > [22m[2m4d. the footer link set equals the list pinned in Footer.tsx (exemption is auditable)
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no second-role affordance; reduced shell has no navigation[2m > [22m[2m6. the authenticated shell contains no supervisory affordance
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no second-role affordance; reduced shell has no navigation[2m > [22m[2m7. the reduced (/sign-in) shell renders no primary nav and no sign-out control
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

 [32m✓[39m server/test/architecture/navigation.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 31[2mms[22m[39m
 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m53 tests[22m[2m)[22m[90m 19[2mms[22m[39m
 [32m✓[39m server/test/architecture/receiptPaths.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 12[2mms[22m[39m
 [32m✓[39m server/test/architecture/headers.spec.ts [2m([22m[2m48 tests[22m[2m)[22m[90m 61[2mms[22m[39m
 [32m✓[39m server/test/architecture/validation.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 74[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 79[2mms[22m[39m

[2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[32m148 passed[39m[22m[90m (148)[39m
[2m   Start at [22m 20:12:17
[2m   Duration [22m 655ms[2m (transform 133ms, setup 0ms, collect 281ms, tests 283ms, environment 0ms, prepare 26ms)[22m
```

## Wave 4

- Build: `npm run build` → pass
- Tests: `npm test` → pass
- Fix attempts: 0/3

### Gate output

```
> build
> npm run build:server && npm run build:web


> build:server
> tsc -b contract server


> build:web
> npm run build:css && npm run build:assets && vite build -c web/vite.config.ts


> build:css
> sass --no-source-map --load-path=node_modules --load-path=node_modules/@uswds/uswds/packages web/styles/app.scss web/public/assets/uswds.css

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use math.unit instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
14 │   @if unit($grid-in-rem) != "rem" {
   │       ^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/functions/units/rem-to-user-em.scss 14:7  rem-to-user-em()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/at-media.scss 17:12        at-media()
    node_modules/@uswds/uswds/packages/usa-display/src/styles/_usa-display.scss 7:3                    @forward
    node_modules/@uswds/uswds/packages/usa-display/src/styles/_index.scss 4:1                          @forward
    _index.scss 5:1                                                                                    @forward
    _index.scss 5:1                                                                                    @forward
    _index.scss 13:1                                                                                   @forward
    web/styles/app.scss 29:1                                                                           root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
34  │       content: "";
    │       ^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 34:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
35  │       display: inline;
    │       ^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 35:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
36  │       margin-top: 0.7ex;
    │       ^^^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 36:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
37  │       margin-left: 2px;
    │       ^^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 37:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Sass's behavior for declarations that appear after nested
rules will be changing to match the behavior specified by CSS in an upcoming
version. To keep the existing behavior, move the declaration above the nested
rule. To opt into the new behavior, wrap the declaration in `& {}`.

More info: https://sass-lang.com/d/mixed-decls

    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss
38  │       padding-left: 1.75ex;
    │       ^^^^^^^^^^^^^^^^^^^^ declaration
    ╵
    ┌──> node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/icon.scss
158 │ ┌   @supports (mask: url("")) {
159 │ │     background: none;
160 │ │     background-color: if($color == currentColor, $color, color($color));
161 │ │     mask-image: url("#{$path}/usa-icons/#{$filename-base}.svg"),
162 │ │       linear-gradient(transparent, transparent);
163 │ │     mask-position: $position-x $position-y;
164 │ │     mask-repeat: no-repeat;
165 │ │     mask-size: $width $height;
166 │ │ 
167 │ │     @if $color-hover {
168 │ │       &:hover {
169 │ │         background-color: color($color-hover);
170 │ │       }
171 │ │     }
172 │ │   }
    │ └─── nested rule
    ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/general/external-link.scss 38:5  external-link()
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_usa-link.scss 12:3                       @forward
    node_modules/@uswds/uswds/packages/usa-link/src/styles/_index.scss 4:1                           @forward
    _index.scss 6:1                                                                                  @forward
    _index.scss 7:1                                                                                  @forward
    _index.scss 13:1                                                                                 @forward
    web/styles/app.scss 29:1                                                                         root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.has-key instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
45 │   @if map-has-key($our-breakpoints, $quoted-bp) {
   │       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/at-media.scss 45:7             at-media-max()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/typography/usa-table-styles.scss 18:5  usa-table-styles()
    node_modules/@uswds/uswds/packages/usa-prose/src/styles/_usa-prose.scss 8:5                            @forward
    node_modules/@uswds/uswds/packages/usa-prose/src/styles/_index.scss 4:1                                @forward
    _index.scss 5:1                                                                                        @forward
    _index.scss 10:1                                                                                       @forward
    _index.scss 13:1                                                                                       @forward
    web/styles/app.scss 29:1                                                                               root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.merge instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
24 │   $accordion-button-unopen-hc-icon: map-merge(
   │ ┌───────────────────────────────────^
25 │ │   $accordion-icon-map-defaults,
26 │ │   (
27 │ │     "name": "add",
28 │ │   )
29 │ │ );
   │ └─^
   ╵
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 24:35  @forward
    usa-accordion/src/_index.scss 1:1                                                      @forward
    _index.scss 14:1                                                                       @forward
    web/styles/app.scss 29:1                                                               root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.merge instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
31 │   $accordion-button-open-hc-icon: map-merge(
   │ ┌─────────────────────────────────^
32 │ │   $accordion-icon-map-defaults,
33 │ │   (
34 │ │     "name": "remove",
35 │ │   )
36 │ │ );
   │ └─^
   ╵
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 31:33  @forward
    usa-accordion/src/_index.scss 1:1                                                      @forward
    _index.scss 14:1                                                                       @forward
    web/styles/app.scss 29:1                                                               root stylesheet

DEPRECATION WARNING: color.lightness() is deprecated. Suggestion:

color.channel($color, "lightness", $space: hsl)

More info: https://sass-lang.com/d/color-functions

   ╷
16 │   @return if(color.lightness(color($token-from-bg)) > 50%, true, false);
   │              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/functions/color/is-color-dark.scss 16:14    is-color-dark()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/set-icon-from-bg.scss 12:24  set-icon-from-bg()
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 61:3                 accordion-button-styles()
    node_modules/@uswds/uswds/packages/usa-accordion/src/styles/_usa-accordion.scss 193:3                @forward
    usa-accordion/src/_index.scss 1:1                                                                    @forward
    _index.scss 14:1                                                                                     @forward
    web/styles/app.scss 29:1                                                                             root stylesheet

DEPRECATION WARNING: Global built-in functions are deprecated and will be removed in Dart Sass 3.0.0.
Use map.merge instead.

More info and automated migrator: https://sass-lang.com/d/import

   ╷
24 │   $banner-icon-chevron-up: map-merge(
   │ ┌──────────────────────────^
25 │ │   $banner-icon-chevron,
26 │ │   (
27 │ │     "name": "expand_less",
28 │ │   )
29 │ │ );
   │ └─^
   ╵
    node_modules/@uswds/uswds/packages/usa-banner/src/styles/_usa-banner.scss 24:26  @forward
    usa-banner/src/_index.scss 4:1                                                   @forward
    _index.scss 16:1                                                                 @forward
    web/styles/app.scss 29:1                                                         root stylesheet

DEPRECATION WARNING: color.lightness() is deprecated. Suggestion:

color.channel($color, "lightness", $space: hsl)

More info: https://sass-lang.com/d/color-functions

   ╷
68 │     color.lightness(color($input-bg-color)) < 50%,
   │     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/checkbox-and-radio-colors.scss 68:5  -checkbox-and-radio-colors()
    node_modules/@uswds/uswds/packages/uswds-core/src/styles/mixins/helpers/checkbox-and-radio-colors.scss 12:3  checkbox-colors()
    node_modules/@uswds/uswds/packages/usa-checkbox/src/styles/_usa-checkbox.scss 5:1                            @forward
    node_modules/@uswds/uswds/packages/usa-checkbox/src/styles/_index.scss 4:1                                   @forward
    _index.scss 8:1                                                                                              @forward
    _index.scss 4:1                                                                                              @forward
    _index.scss 51:1                                                                                             @forward
    web/styles/app.scss 29:1                                                                                     root stylesheet

WARNING: 446 repetitive deprecation warnings omitted.
Run in verbose mode to see all warnings.


> build:assets
> node web/scripts/copy-uswds-assets.mjs

copied /home/daytona/project/node_modules/@uswds/uswds/dist/img -> /home/daytona/project/web/public/assets/img
copied /home/daytona/project/node_modules/@uswds/uswds/dist/fonts -> /home/daytona/project/web/public/assets/fonts
copied /home/daytona/project/node_modules/@uswds/uswds/dist/js -> /home/daytona/project/web/public/assets/js
uswds assets copied
[36mvite v5.4.11 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 57 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                [39m[1m[2m  0.92 kB[22m[1m[22m[2m │ gzip:  0.54 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-BuofB0II.js  [39m[1m[2m230.14 kB[22m[1m[22m[2m │ gzip: 74.35 kB[22m
[32m✓ built in 616ms[39m

> test
> npm run test:unit && npm run test:db && npm run test:api && npm run test:arch


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/validation.engine.spec.ts [2m([22m[2m23 tests[22m[2m)[22m[90m 27[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.rules.spec.ts [2m([22m[2m71 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 57[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.registry.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 4[2mms[22m[39m
 [32m✓[39m server/test/unit/errorMapper.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 24[2mms[22m[39m
 [32m✓[39m server/test/unit/headers.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 16[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m28 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/throttle.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/redaction.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/cookies.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m12 passed[39m[22m[90m (12)[39m
[2m      Tests [22m [1m[32m218 passed[39m[22m[90m (218)[39m
[2m   Start at [22m 20:27:56
[2m   Duration [22m 675ms[2m (transform 94ms, setup 0ms, collect 432ms, tests 142ms, environment 0ms, prepare 23ms)[22m


> test:db
> vitest run server/test/db


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/db/chain.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 822[2mms[22m[39m
   [33m[2m✓[22m[39m TEST-DB-13 & TEST-DB-14 — sequencing under concurrency and chain refusal at commit[2m > [22mTEST-DB-13: two concurrent appends produce contiguous sequences 4 and 5 with correct linkage, the second blocked until the first commits [33m431[2mms[22m[39m
 [32m✓[39m server/test/db/immutability.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[90m 227[2mms[22m[39m
 [32m✓[39m server/test/db/exceptionBasis.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 207[2mms[22m[39m
 [32m✓[39m server/test/db/coupling.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 239[2mms[22m[39m
 [32m✓[39m server/test/db/receipt.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 122[2mms[22m[39m
 [32m✓[39m server/test/db/provenance.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 359[2mms[22m[39m
 [32m✓[39m server/test/db/queueService.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 892[2mms[22m[39m
   [33m[2m✓[22m[39m queue/caseRead services — F7 composition (plan 04-02)[2m > [22m3a. 501 open exceptions serve as 500 rows, truncated:true, the 500 lowest receipt_position values [33m702[2mms[22m[39m
 [32m✓[39m server/test/db/entries.repo.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 89[2mms[22m[39m
 [32m✓[39m server/test/db/queueRead.repo.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 130[2mms[22m[39m
 [32m✓[39m server/test/db/hitl.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 182[2mms[22m[39m
 [32m✓[39m server/test/db/receiptAtomicity.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 91[2mms[22m[39m
 [32m✓[39m server/test/db/session.service.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 349[2mms[22m[39m
 [32m✓[39m server/test/db/writer.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 78[2mms[22m[39m
 [32m✓[39m server/test/db/harness.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 93[2mms[22m[39m

[2m Test Files [22m [1m[32m14 passed[39m[22m[90m (14)[39m
[2m      Tests [22m [1m[32m175 passed[39m[22m[90m (175)[39m
[2m   Start at [22m 20:27:57
[2m   Duration [22m 4.25s[2m (transform 157ms, setup 0ms, collect 268ms, tests 3.88s, environment 0ms, prepare 23ms)[22m


> test:api
> vitest run server/test/api


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/api/exceptions.spec.ts [2m([22m[2m20 tests[22m[2m)[22m[33m 312[2mms[22m[39m
 [32m✓[39m server/test/api/entries.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[90m 192[2mms[22m[39m
 [32m✓[39m server/test/api/guard.spec.ts [2m([22m[2m36 tests[22m[2m)[22m[33m 349[2mms[22m[39m
 [32m✓[39m server/test/api/expiry.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 326[2mms[22m[39m
 [32m✓[39m server/test/api/session.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 399[2mms[22m[39m
 [32m✓[39m server/test/api/actor.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 133[2mms[22m[39m
 [32m✓[39m server/test/api/boot.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 48[2mms[22m[39m

[2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[32m124 passed[39m[22m[90m (124)[39m
[2m   Start at [22m 20:28:01
[2m   Duration [22m 2.14s[2m (transform 141ms, setup 0ms, collect 286ms, tests 1.76s, environment 0ms, prepare 22ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — exactly two destinations (FR-2.7, §8.3, criterion 5)[2m > [22m[2mthe rendered <nav aria-label="Primary"> contains exactly two anchors
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no excluded affordance in any UI destination or control[2m > [22m[2m4c. no rendered <Shell> link/button name outside the footer is an excluded affordance
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no excluded affordance in any UI destination or control[2m > [22m[2m4d. the footer link set equals the list pinned in Footer.tsx (exemption is auditable)
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no second-role affordance; reduced shell has no navigation[2m > [22m[2m6. the authenticated shell contains no supervisory affordance
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at li
    at ul
    at nav
    at Nav
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no second-role affordance; reduced shell has no navigation[2m > [22m[2m7. the reduced (/sign-in) shell renders no primary nav and no sign-out control
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at em
    at span
    at div
    at div
    at header
    at Header (/home/daytona/project/web/src/shell/Header.tsx:8:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

 [32m✓[39m server/test/architecture/navigation.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 22[2mms[22m[39m
 [32m✓[39m server/test/architecture/receiptPaths.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 29[2mms[22m[39m
 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m53 tests[22m[2m)[22m[90m 20[2mms[22m[39m
 [32m✓[39m server/test/architecture/headers.spec.ts [2m([22m[2m48 tests[22m[2m)[22m[90m 61[2mms[22m[39m
 [32m✓[39m server/test/architecture/validation.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 79[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 71[2mms[22m[39m

[2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[32m148 passed[39m[22m[90m (148)[39m
[2m   Start at [22m 20:28:04
[2m   Duration [22m 675ms[2m (transform 150ms, setup 0ms, collect 297ms, tests 289ms, environment 0ms, prepare 22ms)[22m
```

