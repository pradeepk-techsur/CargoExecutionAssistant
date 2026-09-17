---
phase: 07
gate_status: passed
build_command: "npm run build"
test_command: "npm test"
last_updated: 2026-09-17T02:13:43Z
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
> tsc -b contract server && npm run build:prompt


> build:prompt
> node server/scripts/copy-prompt-assets.mjs

copy-prompt-assets: /home/daytona/project/server/src/ai/prompt -> /home/daytona/project/server/dist/ai/prompt

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
[32m✓[39m 61 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                [39m[1m[2m  0.92 kB[22m[1m[22m[2m │ gzip:  0.54 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-DhccJLZD.js  [39m[1m[2m256.85 kB[22m[1m[22m[2m │ gzip: 81.19 kB[22m
[32m✓ built in 666ms[39m
[gate] running migrations

> migrate
> node --env-file=.env server/scripts/migrate.mjs

Can't determine timestamp for 0002
Can't determine timestamp for 0001
Can't determine timestamp for 0003
Can't determine timestamp for 0002
Can't determine timestamp for 0004
Can't determine timestamp for 0003
Can't determine timestamp for 0005
Can't determine timestamp for 0004
Can't determine timestamp for 0006
Can't determine timestamp for 0005
Can't determine timestamp for 0007
Can't determine timestamp for 0006
Can't determine timestamp for 0008
Can't determine timestamp for 0007
Can't determine timestamp for 0009
Can't determine timestamp for 0008
Can't determine timestamp for 0010
Can't determine timestamp for 0009
Can't determine timestamp for 0011
Can't determine timestamp for 0010
Can't determine timestamp for 0001
Can't determine timestamp for 0002
Can't determine timestamp for 0003
Can't determine timestamp for 0004
Can't determine timestamp for 0005
Can't determine timestamp for 0006
Can't determine timestamp for 0007
Can't determine timestamp for 0008
Can't determine timestamp for 0009
Can't determine timestamp for 0010
Can't determine timestamp for 0011
No migrations to run!
migrations applied
[gate] wave 1 tests: npm test

> test
> npm run test:unit && npm run test:db && npm run test:api && npm run test:arch


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/validation.engine.spec.ts [2m([22m[2m23 tests[22m[2m)[22m[90m 28[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.rules.spec.ts [2m([22m[2m71 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m server/test/unit/ai/adapter.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 2010[2mms[22m[39m
   [33m[2m✓[22m[39m createHttpProvider — the API key never leaks (FR-9.13 / FR-9.16)[2m > [22m10. the configured apiKey appears in no ProviderResult and no log line across all branches [33m2003[2mms[22m[39m
 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 54[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m51 tests[22m[2m)[22m[90m 6[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.registry.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/errorMapper.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 23[2mms[22m[39m
 [32m✓[39m server/test/unit/ai/outputSchema.spec.ts [2m([22m[2m25 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/headers.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 16[2mms[22m[39m
 [32m✓[39m server/test/unit/throttle.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/redaction.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/ai/fakeProvider.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/cookies.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/ai/promptManifest.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m16 passed[39m[22m[90m (16)[39m
[2m      Tests [22m [1m[32m297 passed[39m[22m[90m (297)[39m
[2m   Start at [22m 01:35:42
[2m   Duration [22m 2.73s[2m (transform 115ms, setup 0ms, collect 471ms, tests 2.16s, environment 0ms, prepare 22ms)[22m


> test:db
> vitest run server/test/db


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/db/chain.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 857[2mms[22m[39m
   [33m[2m✓[22m[39m TEST-DB-13 & TEST-DB-14 — sequencing under concurrency and chain refusal at commit[2m > [22mTEST-DB-13: two concurrent appends produce contiguous sequences 4 and 5 with correct linkage, the second blocked until the first commits [33m431[2mms[22m[39m
 [32m✓[39m server/test/db/immutability.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[90m 226[2mms[22m[39m
 [32m✓[39m server/test/db/exceptionBasis.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 218[2mms[22m[39m
 [32m✓[39m server/test/db/coupling.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 244[2mms[22m[39m
 [32m✓[39m server/test/db/receipt.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 118[2mms[22m[39m
 [32m✓[39m server/test/db/provenance.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 359[2mms[22m[39m
 [32m✓[39m server/test/db/queueService.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 921[2mms[22m[39m
   [33m[2m✓[22m[39m queue/caseRead services — F7 composition (plan 04-02)[2m > [22m3a. 501 open exceptions serve as 500 rows, truncated:true, the 500 lowest receipt_position values [33m738[2mms[22m[39m
{"level":40,"time":1789608948465,"pid":30283,"hostname":"pivota-sandbox-74afd381","exception_id":"29d99c87-310a-4e37-a694-02af41387096","msg":"generation job: no recommendation row, exiting"}
 [32m✓[39m server/test/db/generation.job.spec.ts [2m([22m[2m13 tests[22m[2m)[22m[90m 98[2mms[22m[39m
 [32m✓[39m server/test/db/entries.repo.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 87[2mms[22m[39m
 [32m✓[39m server/test/db/recommendationWrite.repo.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 92[2mms[22m[39m
 [32m✓[39m server/test/db/queueRead.repo.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 130[2mms[22m[39m
 [32m✓[39m server/test/db/hitl.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 177[2mms[22m[39m
 [32m✓[39m server/test/db/receiptAtomicity.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 89[2mms[22m[39m
 [32m✓[39m server/test/db/session.service.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 355[2mms[22m[39m
 [32m✓[39m server/test/db/writer.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 70[2mms[22m[39m
 [32m✓[39m server/test/db/harness.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 94[2mms[22m[39m

[2m Test Files [22m [1m[32m16 passed[39m[22m[90m (16)[39m
[2m      Tests [22m [1m[32m196 passed[39m[22m[90m (196)[39m
[2m   Start at [22m 01:35:45
[2m   Duration [22m 4.51s[2m (transform 165ms, setup 0ms, collect 281ms, tests 4.13s, environment 0ms, prepare 22ms)[22m


> test:api
> vitest run server/test/api


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/api/decision.spec.ts [2m([22m[2m23 tests[22m[2m)[22m[33m 407[2mms[22m[39m
 [32m✓[39m server/test/api/exceptions.spec.ts [2m([22m[2m20 tests[22m[2m)[22m[90m 264[2mms[22m[39m
 [32m✓[39m server/test/api/entries.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[90m 181[2mms[22m[39m
 [32m✓[39m server/test/api/audit.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 218[2mms[22m[39m
 [32m✓[39m server/test/api/guard.spec.ts [2m([22m[2m36 tests[22m[2m)[22m[33m 350[2mms[22m[39m
 [32m✓[39m server/test/api/expiry.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 310[2mms[22m[39m
 [32m✓[39m server/test/api/recommendation.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 123[2mms[22m[39m
 [32m✓[39m server/test/api/session.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 398[2mms[22m[39m
 [32m✓[39m server/test/api/actor.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 129[2mms[22m[39m
 [32m✓[39m server/test/api/recommendationDispatch.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 301[2mms[22m[39m
 [32m✓[39m server/test/api/boot.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 48[2mms[22m[39m

[2m Test Files [22m [1m[32m11 passed[39m[22m[90m (11)[39m
[2m      Tests [22m [1m[32m170 passed[39m[22m[90m (170)[39m
[2m   Start at [22m 01:35:49
[2m   Duration [22m 3.19s[2m (transform 162ms, setup 0ms, collect 364ms, tests 2.73s, environment 0ms, prepare 22ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m54 tests[22m[2m)[22m[90m 30[2mms[22m[39m
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

 [32m✓[39m server/test/architecture/navigation.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 21[2mms[22m[39m
 [32m✓[39m server/test/architecture/receiptPaths.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 16[2mms[22m[39m
 [32m✓[39m server/test/architecture/validation.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 16[2mms[22m[39m
 [32m✓[39m server/test/architecture/headers.spec.ts [2m([22m[2m48 tests[22m[2m)[22m[90m 61[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 77[2mms[22m[39m
 [32m✓[39m server/test/architecture/aiCapability.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 72[2mms[22m[39m

[2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m      Tests [22m [1m[32m155 passed[39m[22m[90m (155)[39m
[2m   Start at [22m 01:35:53
[2m   Duration [22m 698ms[2m (transform 155ms, setup 0ms, collect 312ms, tests 295ms, environment 0ms, prepare 22ms)[22m
```

## Wave 2

- Build: `npm run build` → pass
- Tests: `npm test` → pass
- Fix attempts: 0/3

### Gate output

```
[gate] npm install (carbon deps)
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: undefined,
npm warn EBADENGINE   required: { node: '22.11.0' },
npm warn EBADENGINE   current: { node: 'v20.20.2', npm: '10.8.2' }
npm warn EBADENGINE }
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: '@carbon/themes@11.81.0',
npm warn EBADENGINE   required: { node: '>=22' },
npm warn EBADENGINE   current: { node: 'v20.20.2', npm: '10.8.2' }
npm warn EBADENGINE }

up to date, audited 328 packages in 766ms

46 packages are looking for funding
  run `npm fund` for details

15 vulnerabilities (4 moderate, 10 high, 1 critical)

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
[gate] wave 2 build: npm run build

> build
> npm run build:server && npm run build:web


> build:server
> tsc -b contract server && npm run build:prompt


> build:prompt
> node server/scripts/copy-prompt-assets.mjs

copy-prompt-assets: /home/daytona/project/server/src/ai/prompt -> /home/daytona/project/server/dist/ai/prompt

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

WARNING: 1469 repetitive deprecation warnings omitted.
Run in verbose mode to see all warnings.


> build:assets
> node web/scripts/copy-uswds-assets.mjs && node web/scripts/copy-carbon-assets.mjs

copied /home/daytona/project/node_modules/@uswds/uswds/dist/img -> /home/daytona/project/web/public/assets/img
copied /home/daytona/project/node_modules/@uswds/uswds/dist/fonts -> /home/daytona/project/web/public/assets/fonts
copied /home/daytona/project/node_modules/@uswds/uswds/dist/js -> /home/daytona/project/web/public/assets/js
uswds assets copied
copied /home/daytona/project/node_modules/@ibm/plex/IBM-Plex-Sans -> /home/daytona/project/web/public/assets/fonts/plex/IBM-Plex-Sans
copied /home/daytona/project/node_modules/@ibm/plex/IBM-Plex-Mono -> /home/daytona/project/web/public/assets/fonts/plex/IBM-Plex-Mono
copied /home/daytona/project/node_modules/@ibm/plex/IBM-Plex-Serif -> /home/daytona/project/web/public/assets/fonts/plex/IBM-Plex-Serif
carbon (IBM Plex) assets copied
[36mvite v5.4.11 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 61 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                [39m[1m[2m  0.92 kB[22m[1m[22m[2m │ gzip:  0.54 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-DhccJLZD.js  [39m[1m[2m256.85 kB[22m[1m[22m[2m │ gzip: 81.19 kB[22m
[32m✓ built in 692ms[39m
[gate] wave 2 tests: npm test

> test
> npm run test:unit && npm run test:db && npm run test:api && npm run test:arch


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/validation.engine.spec.ts [2m([22m[2m23 tests[22m[2m)[22m[90m 28[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.rules.spec.ts [2m([22m[2m71 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m server/test/unit/ai/adapter.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 2009[2mms[22m[39m
   [33m[2m✓[22m[39m createHttpProvider — the API key never leaks (FR-9.13 / FR-9.16)[2m > [22m10. the configured apiKey appears in no ProviderResult and no log line across all branches [33m2003[2mms[22m[39m
 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 52[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m51 tests[22m[2m)[22m[90m 5[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.registry.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/errorMapper.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 22[2mms[22m[39m
 [32m✓[39m server/test/unit/ai/outputSchema.spec.ts [2m([22m[2m25 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/headers.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 17[2mms[22m[39m
 [32m✓[39m server/test/unit/throttle.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/redaction.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/ai/fakeProvider.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/cookies.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/ai/promptManifest.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m16 passed[39m[22m[90m (16)[39m
[2m      Tests [22m [1m[32m297 passed[39m[22m[90m (297)[39m
[2m   Start at [22m 01:43:49
[2m   Duration [22m 2.72s[2m (transform 108ms, setup 0ms, collect 462ms, tests 2.15s, environment 0ms, prepare 22ms)[22m


> test:db
> vitest run server/test/db


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/db/chain.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 827[2mms[22m[39m
   [33m[2m✓[22m[39m TEST-DB-13 & TEST-DB-14 — sequencing under concurrency and chain refusal at commit[2m > [22mTEST-DB-13: two concurrent appends produce contiguous sequences 4 and 5 with correct linkage, the second blocked until the first commits [33m432[2mms[22m[39m
 [32m✓[39m server/test/db/immutability.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[90m 229[2mms[22m[39m
 [32m✓[39m server/test/db/exceptionBasis.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 211[2mms[22m[39m
 [32m✓[39m server/test/db/coupling.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 243[2mms[22m[39m
 [32m✓[39m server/test/db/receipt.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 125[2mms[22m[39m
 [32m✓[39m server/test/db/provenance.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 352[2mms[22m[39m
 [32m✓[39m server/test/db/queueService.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 916[2mms[22m[39m
   [33m[2m✓[22m[39m queue/caseRead services — F7 composition (plan 04-02)[2m > [22m3a. 501 open exceptions serve as 500 rows, truncated:true, the 500 lowest receipt_position values [33m735[2mms[22m[39m
{"level":40,"time":1789609436144,"pid":39404,"hostname":"pivota-sandbox-74afd381","exception_id":"8130c282-c18b-4747-81b9-e5bbf9cdbd6b","msg":"generation job: no recommendation row, exiting"}
 [32m✓[39m server/test/db/generation.job.spec.ts [2m([22m[2m13 tests[22m[2m)[22m[90m 99[2mms[22m[39m
 [32m✓[39m server/test/db/entries.repo.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 88[2mms[22m[39m
 [32m✓[39m server/test/db/recommendationWrite.repo.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 93[2mms[22m[39m
 [32m✓[39m server/test/db/queueRead.repo.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 145[2mms[22m[39m
 [32m✓[39m server/test/db/hitl.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 189[2mms[22m[39m
 [32m✓[39m server/test/db/receiptAtomicity.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 95[2mms[22m[39m
 [32m✓[39m server/test/db/session.service.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 350[2mms[22m[39m
 [32m✓[39m server/test/db/writer.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 69[2mms[22m[39m
 [32m✓[39m server/test/db/harness.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 92[2mms[22m[39m

[2m Test Files [22m [1m[32m16 passed[39m[22m[90m (16)[39m
[2m      Tests [22m [1m[32m196 passed[39m[22m[90m (196)[39m
[2m   Start at [22m 01:43:52
[2m   Duration [22m 4.50s[2m (transform 167ms, setup 0ms, collect 279ms, tests 4.12s, environment 0ms, prepare 22ms)[22m


> test:api
> vitest run server/test/api


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/api/decision.spec.ts [2m([22m[2m23 tests[22m[2m)[22m[33m 364[2mms[22m[39m
 [32m✓[39m server/test/api/exceptions.spec.ts [2m([22m[2m20 tests[22m[2m)[22m[90m 265[2mms[22m[39m
 [32m✓[39m server/test/api/entries.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[90m 189[2mms[22m[39m
 [32m✓[39m server/test/api/audit.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 222[2mms[22m[39m
 [32m✓[39m server/test/api/guard.spec.ts [2m([22m[2m36 tests[22m[2m)[22m[33m 346[2mms[22m[39m
 [32m✓[39m server/test/api/expiry.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 308[2mms[22m[39m
 [32m✓[39m server/test/api/recommendation.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 125[2mms[22m[39m
 [32m✓[39m server/test/api/session.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 406[2mms[22m[39m
 [32m✓[39m server/test/api/actor.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 131[2mms[22m[39m
 [32m✓[39m server/test/api/recommendationDispatch.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 306[2mms[22m[39m
 [32m✓[39m server/test/api/boot.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 53[2mms[22m[39m

[2m Test Files [22m [1m[32m11 passed[39m[22m[90m (11)[39m
[2m      Tests [22m [1m[32m170 passed[39m[22m[90m (170)[39m
[2m   Start at [22m 01:43:57
[2m   Duration [22m 3.18s[2m (transform 166ms, setup 0ms, collect 370ms, tests 2.71s, environment 0ms, prepare 22ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m54 tests[22m[2m)[22m[90m 39[2mms[22m[39m
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

 [32m✓[39m server/test/architecture/navigation.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 20[2mms[22m[39m
 [32m✓[39m server/test/architecture/receiptPaths.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 30[2mms[22m[39m
 [32m✓[39m server/test/architecture/validation.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 19[2mms[22m[39m
 [32m✓[39m server/test/architecture/headers.spec.ts [2m([22m[2m48 tests[22m[2m)[22m[90m 61[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 86[2mms[22m[39m
 [32m✓[39m server/test/architecture/aiCapability.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 5[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 77[2mms[22m[39m

[2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m      Tests [22m [1m[32m155 passed[39m[22m[90m (155)[39m
[2m   Start at [22m 01:44:00
[2m   Duration [22m 742ms[2m (transform 154ms, setup 0ms, collect 313ms, tests 336ms, environment 0ms, prepare 22ms)[22m
```

## Wave 3

- Build: `npm run build` → pass
- Tests: `npm test` → pass
- Fix attempts: 0/3

### Gate output

```
[gate] wave 3 build: npm run build

> build
> npm run build:server && npm run build:web


> build:server
> tsc -b contract server && npm run build:prompt


> build:prompt
> node server/scripts/copy-prompt-assets.mjs

copy-prompt-assets: /home/daytona/project/server/src/ai/prompt -> /home/daytona/project/server/dist/ai/prompt

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

WARNING: 1469 repetitive deprecation warnings omitted.
Run in verbose mode to see all warnings.


> build:assets
> node web/scripts/copy-uswds-assets.mjs && node web/scripts/copy-carbon-assets.mjs

copied /home/daytona/project/node_modules/@uswds/uswds/dist/img -> /home/daytona/project/web/public/assets/img
copied /home/daytona/project/node_modules/@uswds/uswds/dist/fonts -> /home/daytona/project/web/public/assets/fonts
copied /home/daytona/project/node_modules/@uswds/uswds/dist/js -> /home/daytona/project/web/public/assets/js
uswds assets copied
copied /home/daytona/project/node_modules/@ibm/plex/IBM-Plex-Sans -> /home/daytona/project/web/public/assets/fonts/plex/IBM-Plex-Sans
copied /home/daytona/project/node_modules/@ibm/plex/IBM-Plex-Mono -> /home/daytona/project/web/public/assets/fonts/plex/IBM-Plex-Mono
copied /home/daytona/project/node_modules/@ibm/plex/IBM-Plex-Serif -> /home/daytona/project/web/public/assets/fonts/plex/IBM-Plex-Serif
carbon (IBM Plex) assets copied
[36mvite v5.4.11 [32mbuilding for production...[36m[39m
transforming...
node_modules/@carbon/react/es/index.js (8:0): Module level directives cause errors when bundled, "use client" in "node_modules/@carbon/react/es/index.js" was ignored.
[32m✓[39m 966 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                [39m[1m[2m  0.92 kB[22m[1m[22m[2m │ gzip:   0.54 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-5xLDlRG4.js  [39m[1m[2m353.71 kB[22m[1m[22m[2m │ gzip: 111.76 kB[22m
[32m✓ built in 1.90s[39m
[gate] wave 3 tests: npm test

> test
> npm run test:unit && npm run test:db && npm run test:api && npm run test:arch


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/validation.engine.spec.ts [2m([22m[2m23 tests[22m[2m)[22m[90m 29[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.rules.spec.ts [2m([22m[2m71 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m server/test/unit/ai/adapter.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 2010[2mms[22m[39m
   [33m[2m✓[22m[39m createHttpProvider — the API key never leaks (FR-9.13 / FR-9.16)[2m > [22m10. the configured apiKey appears in no ProviderResult and no log line across all branches [33m2003[2mms[22m[39m
 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 55[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m51 tests[22m[2m)[22m[90m 5[2mms[22m[39m
 [32m✓[39m server/test/unit/validation.registry.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/errorMapper.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 23[2mms[22m[39m
 [32m✓[39m server/test/unit/ai/outputSchema.spec.ts [2m([22m[2m25 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/headers.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 16[2mms[22m[39m
 [32m✓[39m server/test/unit/throttle.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/redaction.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/ai/fakeProvider.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/cookies.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/ai/promptManifest.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m16 passed[39m[22m[90m (16)[39m
[2m      Tests [22m [1m[32m297 passed[39m[22m[90m (297)[39m
[2m   Start at [22m 02:13:20
[2m   Duration [22m 2.73s[2m (transform 109ms, setup 0ms, collect 475ms, tests 2.16s, environment 0ms, prepare 21ms)[22m


> test:db
> vitest run server/test/db


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/db/chain.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 825[2mms[22m[39m
   [33m[2m✓[22m[39m TEST-DB-13 & TEST-DB-14 — sequencing under concurrency and chain refusal at commit[2m > [22mTEST-DB-13: two concurrent appends produce contiguous sequences 4 and 5 with correct linkage, the second blocked until the first commits [33m433[2mms[22m[39m
 [32m✓[39m server/test/db/immutability.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[90m 230[2mms[22m[39m
 [32m✓[39m server/test/db/exceptionBasis.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 206[2mms[22m[39m
 [32m✓[39m server/test/db/coupling.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 230[2mms[22m[39m
 [32m✓[39m server/test/db/receipt.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 116[2mms[22m[39m
 [32m✓[39m server/test/db/provenance.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 354[2mms[22m[39m
 [32m✓[39m server/test/db/queueService.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 905[2mms[22m[39m
   [33m[2m✓[22m[39m queue/caseRead services — F7 composition (plan 04-02)[2m > [22m3a. 501 open exceptions serve as 500 rows, truncated:true, the 500 lowest receipt_position values [33m726[2mms[22m[39m
{"level":40,"time":1789611207070,"pid":81283,"hostname":"pivota-sandbox-74afd381","exception_id":"db2e2861-4453-46b0-b4a8-2cdf2da48ab2","msg":"generation job: no recommendation row, exiting"}
 [32m✓[39m server/test/db/generation.job.spec.ts [2m([22m[2m13 tests[22m[2m)[22m[90m 99[2mms[22m[39m
 [32m✓[39m server/test/db/entries.repo.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 89[2mms[22m[39m
 [32m✓[39m server/test/db/recommendationWrite.repo.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 90[2mms[22m[39m
 [32m✓[39m server/test/db/queueRead.repo.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 128[2mms[22m[39m
 [32m✓[39m server/test/db/hitl.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 180[2mms[22m[39m
 [32m✓[39m server/test/db/receiptAtomicity.spec.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 88[2mms[22m[39m
 [32m✓[39m server/test/db/session.service.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 351[2mms[22m[39m
 [32m✓[39m server/test/db/writer.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 70[2mms[22m[39m
 [32m✓[39m server/test/db/harness.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 92[2mms[22m[39m

[2m Test Files [22m [1m[32m16 passed[39m[22m[90m (16)[39m
[2m      Tests [22m [1m[32m196 passed[39m[22m[90m (196)[39m
[2m   Start at [22m 02:13:23
[2m   Duration [22m 4.44s[2m (transform 167ms, setup 0ms, collect 284ms, tests 4.05s, environment 0ms, prepare 22ms)[22m


> test:api
> vitest run server/test/api


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/api/decision.spec.ts [2m([22m[2m23 tests[22m[2m)[22m[33m 352[2mms[22m[39m
 [32m✓[39m server/test/api/exceptions.spec.ts [2m([22m[2m20 tests[22m[2m)[22m[90m 269[2mms[22m[39m
 [32m✓[39m server/test/api/entries.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[90m 185[2mms[22m[39m
 [32m✓[39m server/test/api/audit.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 226[2mms[22m[39m
 [32m✓[39m server/test/api/guard.spec.ts [2m([22m[2m36 tests[22m[2m)[22m[33m 342[2mms[22m[39m
 [32m✓[39m server/test/api/expiry.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 321[2mms[22m[39m
 [32m✓[39m server/test/api/recommendation.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 127[2mms[22m[39m
 [32m✓[39m server/test/api/session.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 396[2mms[22m[39m
 [32m✓[39m server/test/api/actor.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 127[2mms[22m[39m
 [32m✓[39m server/test/api/recommendationDispatch.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 302[2mms[22m[39m
 [32m✓[39m server/test/api/boot.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 48[2mms[22m[39m

[2m Test Files [22m [1m[32m11 passed[39m[22m[90m (11)[39m
[2m      Tests [22m [1m[32m170 passed[39m[22m[90m (170)[39m
[2m   Start at [22m 02:13:28
[2m   Duration [22m 3.17s[2m (transform 169ms, setup 0ms, collect 380ms, tests 2.69s, environment 0ms, prepare 23ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m54 tests[22m[2m)[22m[90m 37[2mms[22m[39m
[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — exactly two destinations (FR-2.7, §8.3, criterion 5)[2m > [22m[2mthe rendered <nav aria-label="Primary"> contains exactly two anchors
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at /home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Link.js:23:10
    at li
    at HeaderMenuItem (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderMenuItem.js:26:72)
    at ul
    at nav
    at HeaderNavigation (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderNavigation.js:25:43)
    at Nav
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at /home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Link.js:23:10
    at li
    at HeaderMenuItem (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderMenuItem.js:26:72)
    at ul
    at nav
    at HeaderNavigation (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderNavigation.js:25:43)
    at Nav
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no excluded affordance in any UI destination or control[2m > [22m[2m4c. no rendered <Shell> link/button name outside the footer is an excluded affordance
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at /home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Link.js:23:10
    at HeaderName (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderName.js:25:23)
    at header
    at Header (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Header.js:24:30)
    at Header (/home/daytona/project/web/src/shell/Header.tsx:11:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at /home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Link.js:23:10
    at li
    at HeaderMenuItem (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderMenuItem.js:26:72)
    at ul
    at nav
    at HeaderNavigation (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderNavigation.js:25:43)
    at Nav
    at header
    at Header (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Header.js:24:30)
    at Header (/home/daytona/project/web/src/shell/Header.tsx:11:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at /home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Link.js:23:10
    at li
    at HeaderMenuItem (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderMenuItem.js:26:72)
    at ul
    at nav
    at HeaderNavigation (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderNavigation.js:25:43)
    at Nav
    at header
    at Header (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Header.js:24:30)
    at Header (/home/daytona/project/web/src/shell/Header.tsx:11:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no excluded affordance in any UI destination or control[2m > [22m[2m4d. the footer link set equals the list pinned in Footer.tsx (exemption is auditable)
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at /home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Link.js:23:10
    at HeaderName (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderName.js:25:23)
    at header
    at Header (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Header.js:24:30)
    at Header (/home/daytona/project/web/src/shell/Header.tsx:11:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no second-role affordance; reduced shell has no navigation[2m > [22m[2m6. the authenticated shell contains no supervisory affordance
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at /home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Link.js:23:10
    at HeaderName (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderName.js:25:23)
    at header
    at Header (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Header.js:24:30)
    at Header (/home/daytona/project/web/src/shell/Header.tsx:11:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at /home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Link.js:23:10
    at li
    at HeaderMenuItem (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderMenuItem.js:26:72)
    at ul
    at nav
    at HeaderNavigation (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderNavigation.js:25:43)
    at Nav
    at header
    at Header (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Header.js:24:30)
    at Header (/home/daytona/project/web/src/shell/Header.tsx:11:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at NavLinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:892:25)
    at /home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Link.js:23:10
    at li
    at HeaderMenuItem (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderMenuItem.js:26:72)
    at ul
    at nav
    at HeaderNavigation (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderNavigation.js:25:43)
    at Nav
    at header
    at Header (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Header.js:24:30)
    at Header (/home/daytona/project/web/src/shell/Header.tsx:11:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

 [32m✓[39m server/test/architecture/navigation.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 22[2mms[22m[39m
[90mstderr[2m | server/test/architecture/navigation.spec.ts[2m > [22m[2mnavigation — no second-role affordance; reduced shell has no navigation[2m > [22m[2m7. the reduced (/sign-in) shell renders no primary nav and no sign-out control
[22m[39mWarning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)
Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.
    at LinkWithRef (/home/daytona/project/node_modules/react-router-dom/dist/umd/react-router-dom.development.js:814:9)
    at /home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Link.js:23:10
    at HeaderName (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/HeaderName.js:25:23)
    at header
    at Header (/home/daytona/project/node_modules/@carbon/react/lib/components/UIShell/Header.js:24:30)
    at Header (/home/daytona/project/web/src/shell/Header.tsx:11:11)
    at Shell (/home/daytona/project/web/src/shell/Shell.tsx:14:25)
    at Router (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1207:17)
    at MemoryRouter (/home/daytona/project/node_modules/react-router/dist/umd/react-router.development.js:1101:7)

 [32m✓[39m server/test/architecture/receiptPaths.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 15[2mms[22m[39m
 [32m✓[39m server/test/architecture/validation.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 18[2mms[22m[39m
 [32m✓[39m server/test/architecture/headers.spec.ts [2m([22m[2m48 tests[22m[2m)[22m[90m 63[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 76[2mms[22m[39m
 [32m✓[39m server/test/architecture/aiCapability.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 72[2mms[22m[39m

[2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m      Tests [22m [1m[32m155 passed[39m[22m[90m (155)[39m
[2m   Start at [22m 02:13:31
[2m   Duration [22m 831ms[2m (transform 148ms, setup 0ms, collect 426ms, tests 306ms, environment 0ms, prepare 23ms)[22m
```

