# appium-otel-plugin

Appium plugin to export Appium server metrics and traces using [OpenTelemetry](https://opentelemetry.io/).

## Run

```
# install plubin
appium plugin install --source=npm appium-otel-plugin

# run appium with the plugin
export OTEL_SERVICE_NAME=appium
appium server --use-plugins=appium-otel-plugin
```

## Trace

This plugin has 2 modes for exporting traces, which can be switched with the environment variable `APPIUM_OTEL_TRACE_SEMANTIC`.

### HTTP Semantic Tracing (by default)

The plugin hooks and exports incoming http requests and outgoing http requests in the Appium server.
It can act as distributed tracing if you enabled OpenTelemetry http instruments in your appium client.

### Command Semantic Tracing

## Configuration

You can configure the plugin with environment variables.

| Env                         | Default | Desciption                     |
| --------------------------- | ------- | ------------------------------ |
| APPIUM_OTEL_TRACE_ENABLED   | true    | Enable trace export if true.   |
| APPIUM_OTEL_METRICS_ENABLED | true    | Enable metrics export if true. |

## Logs

This plugin doesn't support exporting logs. If you are a Datadog user and interested in exporting logs, you might be interested in [appium-ddlog-plugin](https://github.com/rerorero/appium-ddlog-plugin).
