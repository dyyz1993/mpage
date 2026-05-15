# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.5] - 2026-05-15

### Added
- `extractPositionalParams(schema)` — extract positional parameter names from Zod schema
- `mapPositionalValues(schema, positional, existing)` — map CLI positional args to schema fields with type coercion
- `unquote(str)` — strip surrounding quotes from CLI argument values
- Smart optional number skip: `z.number().optional()` fields skip non-numeric positional values
- `--flag` priority: named args are never overridden by positional args
- CI template validation job with 24 SUCCESS/FAIL test cases
- Husky pre-commit (typecheck) and pre-push (1551 tests) hooks

### Changed
- CI workflow now includes `template-validation` job
- Feishu notification includes `template-validation` result

## [0.7.0] - 2026-05-12

### Added
- Zod v4 migration and type inference
- Nested sub-commands support (`config get` instead of `config-get`)
- Scaffold engine with 5 templates (base, minimal-plugin, browser, database, api)

### Fixed
- Remove ZodSchema generics from SiteInstance to prevent tsc OOM with Hono
- Simplify GroupedSiteInstance.command() to prevent tsc OOM

## [0.6.0] - 2025-05-05

### Added
- WebSocket server and client for daemon communication
- Real-time session management through WebSocket
- Improved daemon manager with WebSocket support

### Changed
- Enhanced Core.run() argument parsing
- Made CommandScope extensible

### Fixed
- Daemon connection management

## [0.5.1] - Previous
- Initial stable release
