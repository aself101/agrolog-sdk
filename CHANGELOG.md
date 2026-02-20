# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-02-20

### Added

- `AgrologClient` — main SDK entry point with typed, authenticated API access
- Automatic token management with TTL-based refresh and concurrent deduplication
- Site topology discovery (`connect()`) — customer, site, silos, weather station, aerators
- Silo telemetry (`getSiloTelemetry()`) — min/avg/max temperature and moisture with deltas
- Sensor line telemetry (`getSensorLineTelemetry()`) — per-sensor readings for sensors 1–3
- Headspace telemetry (`getHeadspaceTelemetry()`) — temperature, dewpoint, humidity, CO2, pressure
- Weather station telemetry (`getWeatherTelemetry()`) — outdoor temperature and humidity
- Aeration state (`getAerationState()`) — on/off state with timestamp
- Alarm queries (`getAlarms()`) — active alarms for any entity
- Device discovery (`discoverSiloDevices()`) — sensors, headspace, level indicators within a silo
- Batch convenience (`getAllSiloTelemetry()`) — parallel fetch for all silos
- Custom error class `AgrologAPIError` with typed error codes, HTTP status, and endpoint
- HTTP retry with exponential backoff and jitter (3 retries on 5xx)
- Automatic auth retry on 401/403
- Native `fetch` HTTP client with `AbortController` timeout (no external HTTP dependencies)
- Four package export paths: main, `/types`, `/config`, `/errors`
- Full TypeScript strict mode with `noUncheckedIndexedAccess`
- Optional `logger` callback for debug output (no `console.log` in library code)
- Entity ID validation on all URL path interpolation (prevents path traversal)
- Login response token validation
- Alarm limit bounds clamping (1–1000)
- `Promise.allSettled` in `getAllSiloTelemetry()` — partial results on per-silo failures
- Non-JSON 200 response protection on fetch calls
- HTTPS default for `DEFAULT_BASE_URL`
