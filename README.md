# Telegraf output for Artillery stats

Forked from [artillery-plugin-statsd](https://github.com/shoreditch-ops/artillery-plugin-statsd)

This [Artillery](https://artillery.io/) plugin allows you to publish the
stats produced by Artillery CLI to [Telegraf](https://github.com/influxdata/telegraf)'s StatsD input plugin in real-time.

## Usage

### Install

`npm install -g artillery-plugin-telegraf` - if you've installed Artillery globally

`npm install artillery-plugin-telegraf` otherwise.

### Use

Enable the plugin by adding it in your test script's `config.plugins` section:

```javascript
{
  "config": {
    // ...
    "plugins": {
      "telegraf": {
        "host": "localhost",
        "port": 8125,
        "prefix": "artillery",
        "tags" : {
            "testName": "myTestName",
            "testId": "myTestId"
        }
      }
    }
  }
  // ...
}
```

`host`, `port`, and `prefix` are optional; the values above are the defaults.

`tags` is optional - used to tag metrics if [Telegraf](https://github.com/influxdata/telegraf) reports to [InfluxDB](https://www.influxdata.com/).

### Published metrics

By default, all stats from artillery are reported. This includes any custom stats you may have in place. As of `artillery@1.5.0-17`, the metrics you can expect to see are as follows.

- `scenariosCreated`
- `scenariosCompleted`
- `requestsCompleted`
- `latency.min`
- `latency.max`
- `latency.median`
- `latency.p95`
- `latency.p99`
- `rps.count`
- `rps.mean`
- `scenarioDuration.min`
- `scenarioDuration.max`
- `scenarioDuration.median`
- `scenarioDuration.p95`
- `scenarioDuration.p99`
- `scenarioCounts.0`, `scenarioCounts.0` etc
- `codes.200`, `codes.301` etc
- `errors.ECONNREFUSED`, `errors.ETIMEDOUT` etc
- `matches`
- `concurrency`
- `pendingRequests`

Metrics will be added or removed based on what artillery decides to send.

If a metric is null or cannot be resolved to a number, the default value of `0` is sent. You can change the default value in the configuration by passing in the property `default`. Example:

`"default": 100000` - Metrics are sent with gauges so avoid [negative numbers](https://github.com/etsy/statsd/blob/master/docs/metric_types.md#gauges).

Metrics can be skipped by passing in an additional configuration property `skipList`. Skip list values can look like the following:

- `"skipList": "scenarioDuration"` - would skip all `scenarioDuration` metrics
- `"skipList": "latency.max"` - would skip only the `latency.max` metric
- `"skipList": "scenarioDuration, latency.max"` - a comma separated list can be used to pass in multiple values.



## License

**artillery-plugin-telegraf** is distributed under the terms of the
[ISC](http://en.wikipedia.org/wiki/ISC_license) license.
