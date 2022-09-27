# appium-otel-plugin

Appium plugin to export Appium server metrics and traces using [OpenTelemetry](https://opentelemetry.io/).

## Run

```
# install plugin
appium plugin install --source=npm appium-otel-plugin

# run appium with the plugin
export OTEL_SERVICE_NAME=appium
appium server --use-plugins=appium-otel-plugin
```

## Tracing

This plugin has 2 modes for exporting traces, which can be switched with the environment variable `APPIUM_OTEL_TRACE_SEMANTIC`.

#### HTTP Semantic Tracing (by default)

The plugin hooks and exports incoming http requests and outgoing http requests in the Appium server.
It can act as distributed tracing if you enabled OpenTelemetry http instruments in your appium client.

#### Command Semantic Tracing

The plugin hooks an Appium command and sends a command executino as a span.
It also starts a parent span at the start of Appium session and links the commands associated with the session as child spans.

## Metrics

The plugin collects the following metrics:

| Name                       | Type    | Desciption                                                                                                                               |
| -------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| appium.command.responses   | Counter | Incremented each time one command is completed. Collected with a `status` attribute indicating whether the command is successful or not. |
| appium.sessions.total      | Gauge   | Number of active sessions.                                                                                                               |
| appium.sessions.oldest_age | Gauge   | Age (in seconds) of the oldest active session.                                                                                           |

## Configuration

You can configure the plugin with environment variables.

| Env                                        | Default      | Desciption                                                                                                                                                          |
| ------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| APPIUM_OTEL_TRACE_ENABLED                  | true         | Enable tracing if true.                                                                                                                                             |
| APPIUM_OTEL_METRICS_ENABLED                | true         | Enable metrics if true.                                                                                                                                             |
| APPIUM_OTEL_TRACE_SEMANTIC                 | http         | Specify the tracing mode. One of the following `http`, `command`.                                                                                                   |
| APPIUM_OTEL_TRACE_EXPORTER                 | otlp         | One of available trace exporter. The followings are supported: `otlp` `zipkin` `console`                                                                            |
| APPIUM_OTEL_ATTRIBUTES_IN_CAPS             | platformName | If the keys specified by this exist in the capabilities, they are sent as attributes if the metrics/span is associated with a session. e.g. `platformName,app,udid` |
| APPIUM_OTEL_METRICS_EXPORTER               | otlp         | One of available trace exporter. The followings are supported: `otlp` `console`                                                                                     |
| APPIUM_OTEL_METRICS_EXPORT_INTERVAL_MILLIS | 10000        | Some metrics are collected periodically. You can change the collection period with this value.                                                                      |
| DEBUG                                      | false        | Set loglevel of opentelemetry API to DEBUG.                                                                                                                         |
| APPIUM_OTEL_AUTO_DETECT_RESOURCES          | true         | Toggle whether to enable auto detect resources.                                                                                                                     |
| APPIUM_OTEL_ATTRIBUTES                     |              | Attributes to be added to the metrics/spans. e.g. `env=development,region=us-east-1`                                                                                |

In addition to them, you would be able to use [OpenTelemetry environment variables](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/sdk-environment-variables.md) like `OTEL_SERVICE_NAME` when `APPIUM_OTEL_AUTO_DETECT_RESOURCES` is true.

## Logs

This plugin doesn't support exporting logs. If you are a Datadog user and interested in exporting logs, you might be interested in [appium-ddlog-plugin](https://github.com/rerorero/appium-ddlog-plugin).
