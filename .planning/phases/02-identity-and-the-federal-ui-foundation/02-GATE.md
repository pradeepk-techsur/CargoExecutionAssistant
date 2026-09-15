---
phase: 02
gate_status: passed
build_command: "npm run build"
test_command: "npm test"
last_updated: 2026-09-15T00:14:00Z
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
  - wave: 5
    build: pass
    tests: pass
    fix_attempts: 0
  - wave: 6
    build: pass
    tests: pass
    fix_attempts: 0
---

## Wave 1

- Build: `npm run build:server` → pass
- Tests: `npm run test:unit && npm run test:arch` → pass
- Fix attempts: 0/3 — Wave 1 gates server build + unit/arch suites; web build & db/api/e2e suites deferred to later plans that provide their inputs

### Gate output

```
> build:server
> tsc -b contract server


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 57[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m28 tests[22m[2m)[22m[90m 2[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m4 passed[39m[22m[90m (4)[39m
[2m      Tests [22m [1m[32m56 passed[39m[22m[90m (56)[39m
[2m   Start at [22m 22:00:17
[2m   Duration [22m 457ms[2m (transform 38ms, setup 0ms, collect 316ms, tests 60ms, environment 0ms, prepare 22ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m49 tests[22m[2m)[22m[90m 6[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 77[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 72[2mms[22m[39m

[2m Test Files [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m      Tests [22m [1m[32m67 passed[39m[22m[90m (67)[39m
[2m   Start at [22m 22:00:18
[2m   Duration [22m 300ms[2m (transform 32ms, setup 0ms, collect 64ms, tests 154ms, environment 0ms, prepare 23ms)[22m
```

## Wave 2

- Build: `npm run build:server` → pass
- Tests: `npm run test:unit && npm run test:db && npm run test:arch` → pass
- Fix attempts: 0/3 — Wave 2: unit 111 + db 114 + arch 67 green; api suite deferred to 02-04 (HTTP app), web/e2e to later plans

### Gate output

```
> build:server
> tsc -b contract server


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 56[2mms[22m[39m
 [32m✓[39m server/test/unit/errorMapper.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 24[2mms[22m[39m
 [32m✓[39m server/test/unit/headers.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 16[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m28 tests[22m[2m)[22m[90m 2[2mms[22m[39m
 [32m✓[39m server/test/unit/throttle.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/redaction.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/cookies.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 0[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m9 passed[39m[22m[90m (9)[39m
[2m      Tests [22m [1m[32m111 passed[39m[22m[90m (111)[39m
[2m   Start at [22m 22:14:56
[2m   Duration [22m 594ms[2m (transform 66ms, setup 0ms, collect 400ms, tests 105ms, environment 0ms, prepare 24ms)[22m


> test:db
> vitest run server/test/db


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/db/chain.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 820[2mms[22m[39m
   [33m[2m✓[22m[39m TEST-DB-13 & TEST-DB-14 — sequencing under concurrency and chain refusal at commit[2m > [22mTEST-DB-13: two concurrent appends produce contiguous sequences 4 and 5 with correct linkage, the second blocked until the first commits [33m431[2mms[22m[39m
 [32m✓[39m server/test/db/immutability.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[90m 227[2mms[22m[39m
 [32m✓[39m server/test/db/coupling.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 234[2mms[22m[39m
 [32m✓[39m server/test/db/provenance.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 363[2mms[22m[39m
 [32m✓[39m server/test/db/hitl.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 187[2mms[22m[39m
 [32m✓[39m server/test/db/session.service.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 363[2mms[22m[39m
 [32m✓[39m server/test/db/writer.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 71[2mms[22m[39m
 [32m✓[39m server/test/db/harness.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 96[2mms[22m[39m

[2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m      Tests [22m [1m[32m114 passed[39m[22m[90m (114)[39m
[2m   Start at [22m 22:14:57
[2m   Duration [22m 2.61s[2m (transform 101ms, setup 0ms, collect 166ms, tests 2.36s, environment 0ms, prepare 22ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m49 tests[22m[2m)[22m[90m 6[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 78[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 73[2mms[22m[39m

[2m Test Files [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m      Tests [22m [1m[32m67 passed[39m[22m[90m (67)[39m
[2m   Start at [22m 22:15:00
[2m   Duration [22m 300ms[2m (transform 36ms, setup 0ms, collect 63ms, tests 158ms, environment 0ms, prepare 22ms)[22m
```

## Wave 3

- Build: `npm run build:server` → pass
- Tests: `npm run test:unit && npm run test:db && npm run test:api && npm run test:arch` → pass
- Fix attempts: 0/3 — Wave 3: unit 111 + db 114 + api 15 + arch 67 green; server boots and answers 401 unauth. web build & e2e deferred to 02-05/02-07

### Gate output

```
> build:server
> tsc -b contract server


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 57[2mms[22m[39m
 [32m✓[39m server/test/unit/errorMapper.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 24[2mms[22m[39m
 [32m✓[39m server/test/unit/headers.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 16[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m28 tests[22m[2m)[22m[90m 2[2mms[22m[39m
 [32m✓[39m server/test/unit/throttle.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/redaction.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/cookies.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 0[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m9 passed[39m[22m[90m (9)[39m
[2m      Tests [22m [1m[32m111 passed[39m[22m[90m (111)[39m
[2m   Start at [22m 22:30:20
[2m   Duration [22m 595ms[2m (transform 68ms, setup 0ms, collect 401ms, tests 105ms, environment 0ms, prepare 23ms)[22m


> test:db
> vitest run server/test/db


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/db/chain.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 823[2mms[22m[39m
   [33m[2m✓[22m[39m TEST-DB-13 & TEST-DB-14 — sequencing under concurrency and chain refusal at commit[2m > [22mTEST-DB-13: two concurrent appends produce contiguous sequences 4 and 5 with correct linkage, the second blocked until the first commits [33m434[2mms[22m[39m
 [32m✓[39m server/test/db/immutability.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[90m 227[2mms[22m[39m
 [32m✓[39m server/test/db/coupling.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 236[2mms[22m[39m
 [32m✓[39m server/test/db/provenance.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 375[2mms[22m[39m
 [32m✓[39m server/test/db/hitl.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 185[2mms[22m[39m
 [32m✓[39m server/test/db/session.service.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 358[2mms[22m[39m
 [32m✓[39m server/test/db/writer.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 70[2mms[22m[39m
 [32m✓[39m server/test/db/harness.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 117[2mms[22m[39m

[2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m      Tests [22m [1m[32m114 passed[39m[22m[90m (114)[39m
[2m   Start at [22m 22:30:21
[2m   Duration [22m 2.64s[2m (transform 100ms, setup 0ms, collect 161ms, tests 2.39s, environment 0ms, prepare 25ms)[22m


> test:api
> vitest run server/test/api


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/api/session.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 482[2mms[22m[39m
 [32m✓[39m server/test/api/boot.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 53[2mms[22m[39m

[2m Test Files [22m [1m[32m2 passed[39m[22m[90m (2)[39m
[2m      Tests [22m [1m[32m15 passed[39m[22m[90m (15)[39m
[2m   Start at [22m 22:30:24
[2m   Duration [22m 765ms[2m (transform 64ms, setup 0ms, collect 152ms, tests 535ms, environment 0ms, prepare 22ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m49 tests[22m[2m)[22m[90m 6[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 82[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 77[2mms[22m[39m

[2m Test Files [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m      Tests [22m [1m[32m67 passed[39m[22m[90m (67)[39m
[2m   Start at [22m 22:30:25
[2m   Duration [22m 306ms[2m (transform 34ms, setup 0ms, collect 64ms, tests 166ms, environment 0ms, prepare 22ms)[22m
```

## Wave 4

- Build: `npm run build` → pass
- Tests: `npm test` → pass
- Fix attempts: 0/3 — Wave 4: full build (server+web) green; 367 tests (unit 111 + db 114 + api 75 + arch 67). E2E shell suite 16/16 run by executor (deferred from gate). Carry-forward: 02-06 Rule-4 discovery — no unified API auth gate; 7 unimplemented pairs return 404 and DELETE 403, so 'all ten pairs 401 unauth' is partially met (surface proven closed). Flagged for review/verify.

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
[32m✓[39m 45 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                [39m[1m[2m  0.92 kB[22m[1m[22m[2m │ gzip:  0.54 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-xEB0qmgv.js  [39m[1m[2m216.45 kB[22m[1m[22m[2m │ gzip: 70.24 kB[22m
[32m✓ built in 588ms[39m

> test
> npm run test:unit && npm run test:db && npm run test:api && npm run test:arch


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 57[2mms[22m[39m
 [32m✓[39m server/test/unit/errorMapper.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 25[2mms[22m[39m
 [32m✓[39m server/test/unit/headers.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 18[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m28 tests[22m[2m)[22m[90m 2[2mms[22m[39m
 [32m✓[39m server/test/unit/throttle.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/redaction.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/cookies.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 0[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m9 passed[39m[22m[90m (9)[39m
[2m      Tests [22m [1m[32m111 passed[39m[22m[90m (111)[39m
[2m   Start at [22m 22:56:22
[2m   Duration [22m 601ms[2m (transform 68ms, setup 0ms, collect 401ms, tests 108ms, environment 0ms, prepare 22ms)[22m


> test:db
> vitest run server/test/db


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/db/chain.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 825[2mms[22m[39m
   [33m[2m✓[22m[39m TEST-DB-13 & TEST-DB-14 — sequencing under concurrency and chain refusal at commit[2m > [22mTEST-DB-13: two concurrent appends produce contiguous sequences 4 and 5 with correct linkage, the second blocked until the first commits [33m435[2mms[22m[39m
 [32m✓[39m server/test/db/immutability.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[90m 227[2mms[22m[39m
 [32m✓[39m server/test/db/coupling.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 237[2mms[22m[39m
 [32m✓[39m server/test/db/provenance.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 365[2mms[22m[39m
 [32m✓[39m server/test/db/hitl.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 181[2mms[22m[39m
 [32m✓[39m server/test/db/session.service.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 363[2mms[22m[39m
 [32m✓[39m server/test/db/writer.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 70[2mms[22m[39m
 [32m✓[39m server/test/db/harness.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 96[2mms[22m[39m

[2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m      Tests [22m [1m[32m114 passed[39m[22m[90m (114)[39m
[2m   Start at [22m 22:56:23
[2m   Duration [22m 2.61s[2m (transform 96ms, setup 0ms, collect 161ms, tests 2.36s, environment 0ms, prepare 22ms)[22m


> test:api
> vitest run server/test/api


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/api/guard.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[33m 376[2mms[22m[39m
 [32m✓[39m server/test/api/expiry.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 328[2mms[22m[39m
 [32m✓[39m server/test/api/session.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 390[2mms[22m[39m
 [32m✓[39m server/test/api/actor.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 137[2mms[22m[39m
 [32m✓[39m server/test/api/boot.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 50[2mms[22m[39m

[2m Test Files [22m [1m[32m5 passed[39m[22m[90m (5)[39m
[2m      Tests [22m [1m[32m75 passed[39m[22m[90m (75)[39m
[2m   Start at [22m 22:56:26
[2m   Duration [22m 1.63s[2m (transform 105ms, setup 0ms, collect 241ms, tests 1.28s, environment 0ms, prepare 22ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m49 tests[22m[2m)[22m[90m 15[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 82[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 75[2mms[22m[39m

[2m Test Files [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m      Tests [22m [1m[32m67 passed[39m[22m[90m (67)[39m
[2m   Start at [22m 22:56:28
[2m   Duration [22m 313ms[2m (transform 33ms, setup 0ms, collect 57ms, tests 172ms, environment 0ms, prepare 23ms)[22m
```

## Wave 5

- Build: `npm run build` → pass
- Tests: `npm test` → pass
- Fix attempts: 0/3 — Wave 5: full build green; 367 tests. Transient DB-container outage (ECONNREFUSED) mid-gate — restored via 'docker compose up -d db' + migrate (environment repair, not a code fix); suite re-run clean. E2E sign-in+shell 29/29 per executor.

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
[2mdist/[22m[2massets/[22m[36mindex-DpG5ONGu.js  [39m[1m[2m224.88 kB[22m[1m[22m[2m │ gzip: 72.95 kB[22m
[32m✓ built in 606ms[39m

> test
> npm run test:unit && npm run test:db && npm run test:api && npm run test:arch


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 57[2mms[22m[39m
 [32m✓[39m server/test/unit/errorMapper.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 24[2mms[22m[39m
 [32m✓[39m server/test/unit/headers.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 16[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m28 tests[22m[2m)[22m[90m 2[2mms[22m[39m
 [32m✓[39m server/test/unit/throttle.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/redaction.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/cookies.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 0[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m9 passed[39m[22m[90m (9)[39m
[2m      Tests [22m [1m[32m111 passed[39m[22m[90m (111)[39m
[2m   Start at [22m 00:03:25
[2m   Duration [22m 602ms[2m (transform 68ms, setup 0ms, collect 405ms, tests 106ms, environment 0ms, prepare 23ms)[22m


> test:db
> vitest run server/test/db


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/db/chain.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 844[2mms[22m[39m
   [33m[2m✓[22m[39m TEST-DB-13 & TEST-DB-14 — sequencing under concurrency and chain refusal at commit[2m > [22mTEST-DB-13: two concurrent appends produce contiguous sequences 4 and 5 with correct linkage, the second blocked until the first commits [33m434[2mms[22m[39m
 [32m✓[39m server/test/db/immutability.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[90m 232[2mms[22m[39m
 [32m✓[39m server/test/db/coupling.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 242[2mms[22m[39m
 [32m✓[39m server/test/db/provenance.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 371[2mms[22m[39m
 [32m✓[39m server/test/db/hitl.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 187[2mms[22m[39m
 [32m✓[39m server/test/db/session.service.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 363[2mms[22m[39m
 [32m✓[39m server/test/db/writer.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 72[2mms[22m[39m
 [32m✓[39m server/test/db/harness.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 96[2mms[22m[39m

[2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m      Tests [22m [1m[32m114 passed[39m[22m[90m (114)[39m
[2m   Start at [22m 00:03:26
[2m   Duration [22m 2.66s[2m (transform 100ms, setup 0ms, collect 163ms, tests 2.41s, environment 0ms, prepare 23ms)[22m


> test:api
> vitest run server/test/api


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/api/guard.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[33m 399[2mms[22m[39m
 [32m✓[39m server/test/api/expiry.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 343[2mms[22m[39m
 [32m✓[39m server/test/api/session.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 395[2mms[22m[39m
 [32m✓[39m server/test/api/actor.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 139[2mms[22m[39m
 [32m✓[39m server/test/api/boot.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 51[2mms[22m[39m

[2m Test Files [22m [1m[32m5 passed[39m[22m[90m (5)[39m
[2m      Tests [22m [1m[32m75 passed[39m[22m[90m (75)[39m
[2m   Start at [22m 00:03:28
[2m   Duration [22m 1.60s[2m (transform 79ms, setup 0ms, collect 187ms, tests 1.33s, environment 0ms, prepare 22ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m49 tests[22m[2m)[22m[90m 15[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 80[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 75[2mms[22m[39m

[2m Test Files [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m      Tests [22m [1m[32m67 passed[39m[22m[90m (67)[39m
[2m   Start at [22m 00:03:30
[2m   Duration [22m 311ms[2m (transform 33ms, setup 0ms, collect 60ms, tests 170ms, environment 0ms, prepare 22ms)[22m
```

## Wave 6

- Build: `npm run build` → pass
- Tests: `npm test` → pass
- Fix attempts: 0/3 — Wave 6: full build green; 367 tests. Compose stack boots both services healthy; 29 Playwright tests pass against composed stack per executor.

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
[2mdist/[22m[2massets/[22m[36mindex-DpG5ONGu.js  [39m[1m[2m224.88 kB[22m[1m[22m[2m │ gzip: 72.95 kB[22m
[32m✓ built in 630ms[39m

> test
> npm run test:unit && npm run test:db && npm run test:api && npm run test:arch


> test:unit
> vitest run server/test/unit


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/unit/canonical.spec.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 56[2mms[22m[39m
 [32m✓[39m server/test/unit/errorMapper.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 25[2mms[22m[39m
 [32m✓[39m server/test/unit/headers.spec.ts [2m([22m[2m16 tests[22m[2m)[22m[90m 16[2mms[22m[39m
 [32m✓[39m server/test/unit/config.spec.ts [2m([22m[2m28 tests[22m[2m)[22m[90m 2[2mms[22m[39m
 [32m✓[39m server/test/unit/throttle.spec.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/redaction.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m server/test/unit/cookies.spec.ts [2m([22m[2m14 tests[22m[2m)[22m[90m 1[2mms[22m[39m
 [32m✓[39m server/test/unit/contract.spec.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 0[2mms[22m[39m
 [32m✓[39m server/test/unit/scaffolding.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m9 passed[39m[22m[90m (9)[39m
[2m      Tests [22m [1m[32m111 passed[39m[22m[90m (111)[39m
[2m   Start at [22m 00:13:46
[2m   Duration [22m 608ms[2m (transform 73ms, setup 0ms, collect 411ms, tests 106ms, environment 0ms, prepare 23ms)[22m


> test:db
> vitest run server/test/db


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/db/chain.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 840[2mms[22m[39m
   [33m[2m✓[22m[39m TEST-DB-13 & TEST-DB-14 — sequencing under concurrency and chain refusal at commit[2m > [22mTEST-DB-13: two concurrent appends produce contiguous sequences 4 and 5 with correct linkage, the second blocked until the first commits [33m432[2mms[22m[39m
 [32m✓[39m server/test/db/immutability.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[90m 236[2mms[22m[39m
 [32m✓[39m server/test/db/coupling.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 245[2mms[22m[39m
 [32m✓[39m server/test/db/provenance.spec.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 371[2mms[22m[39m
 [32m✓[39m server/test/db/hitl.spec.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 193[2mms[22m[39m
 [32m✓[39m server/test/db/session.service.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 369[2mms[22m[39m
 [32m✓[39m server/test/db/writer.spec.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 74[2mms[22m[39m
 [32m✓[39m server/test/db/harness.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 100[2mms[22m[39m

[2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m      Tests [22m [1m[32m114 passed[39m[22m[90m (114)[39m
[2m   Start at [22m 00:13:47
[2m   Duration [22m 2.69s[2m (transform 102ms, setup 0ms, collect 167ms, tests 2.43s, environment 0ms, prepare 25ms)[22m


> test:api
> vitest run server/test/api


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/api/guard.spec.ts [2m([22m[2m34 tests[22m[2m)[22m[33m 383[2mms[22m[39m
 [32m✓[39m server/test/api/expiry.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 341[2mms[22m[39m
 [32m✓[39m server/test/api/session.spec.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 397[2mms[22m[39m
 [32m✓[39m server/test/api/actor.spec.ts [2m([22m[2m15 tests[22m[2m)[22m[90m 137[2mms[22m[39m
 [32m✓[39m server/test/api/boot.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 51[2mms[22m[39m

[2m Test Files [22m [1m[32m5 passed[39m[22m[90m (5)[39m
[2m      Tests [22m [1m[32m75 passed[39m[22m[90m (75)[39m
[2m   Start at [22m 00:13:50
[2m   Duration [22m 1.58s[2m (transform 78ms, setup 0ms, collect 181ms, tests 1.31s, environment 0ms, prepare 22ms)[22m


> test:arch
> vitest run server/test/architecture


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.5 [39m[90m/home/daytona/project[39m

 [32m✓[39m server/test/architecture/absence.spec.ts [2m([22m[2m49 tests[22m[2m)[22m[90m 15[2mms[22m[39m
 [32m✓[39m server/test/architecture/privileges.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 81[2mms[22m[39m
 [32m✓[39m server/test/architecture/schema.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 72[2mms[22m[39m

[2m Test Files [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m      Tests [22m [1m[32m67 passed[39m[22m[90m (67)[39m
[2m   Start at [22m 00:13:52
[2m   Duration [22m 310ms[2m (transform 34ms, setup 0ms, collect 60ms, tests 169ms, environment 0ms, prepare 22ms)[22m
```

