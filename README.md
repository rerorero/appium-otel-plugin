# appium-otel-plugin

Appium plugin to apply [OpenTelemetry](https://opentelemetry.io/) to Appium server.

WIP🐶

```
appium plugin install --source=npm appium-otel-plugin
APPIUM_OTEL_SEMANTIC=session  APPIUM_OTEL_EXPORTER="zipkin,console" appium server --use-plugins=appium-otel-plugin
```
