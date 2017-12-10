const test = require('tape');
const TelegrafPlugin = require('../index');

test('using advertised defaults', function (t) {
    const reconciledConfigs = TelegrafPlugin._reconcileConfigs({ plugins: { telegraf: {} } });

    t.equal(reconciledConfigs.host, 'localhost', 'Host localhost');
    t.equal(reconciledConfigs.port, 8125, 'Port 8125');
    t.equal(reconciledConfigs.prefix, 'artillery', 'Prefix artillery');
    t.equal(reconciledConfigs.closingTimeout, 0, 'Timeout 0');
    t.equal(reconciledConfigs.defaultValue, 0, 'DefaultValue 0'); // needs to be zero since we use gauge https://github.com/etsy/statsd/blob/master/docs/metric_types.md
    t.deepEqual(reconciledConfigs.skipList, ['timestamp', 'latencies'], 'Skipping timestamp and latencies');

    t.end();
});

test('defaults are overridable', function (t) {
    const config = {
        plugins: {
            telegraf: {
                host: 'somehost',
                port: 8126,
                prefix: 'someprefix',
                timeout: 10,
                default: 100000
            }
        }
    };
    const reconciledConfigs = TelegrafPlugin._reconcileConfigs(config);

    t.equal(reconciledConfigs.host, 'somehost', 'Host somehost');
    t.equal(reconciledConfigs.port, 8126, 'Port 8126');
    t.equal(reconciledConfigs.prefix, 'someprefix', 'Prefix someprefix');
    t.equal(reconciledConfigs.closingTimeout, 10, 'Timeout 10');
    t.equal(reconciledConfigs.defaultValue, 100000, 'DefaultValue 100000');

    t.end();
});

test('skip list can handle user input', function (t) {
    t.deepEqual(TelegrafPlugin._generateSkipList('rps'), ['timestamp', 'latencies', 'rps'], 'Single Value');
    t.deepEqual(TelegrafPlugin._generateSkipList('rps,errors'), ['timestamp', 'latencies', 'rps', 'errors'],
                'No Spaces');
    t.deepEqual(TelegrafPlugin._generateSkipList('rps, errors, codes'),
                ['timestamp', 'latencies', 'rps', 'errors', 'codes'], 'Spaces');
    t.end();
});

test('flattening works', function (t) {
    const commonSkipList = ['timestamp', 'latencies'];

    const basic = {
        basic: 500
    };
    const basicPlusSkipped = {
        basic: 500,
        timestamp: '2016-10-31T08:35:21.676Z',
        latencies: [
            [1477902921336, '761465ff-220d-4924-b1c1-062868d3169b', 428076699, 301],
            [1477902921342, 'e8fa92e9-50bf-4d67-bce9-f7bc8e3687ee', 259315569, 301]
        ]
    };
    const nullProperty = {
        scenariosCreated: null
    };
    const emptyProperty = {
        errors: {}
    };
    const subProperties = {
        customStats: {
            so: {
                value: 10,
                many: {
                    value: 11,
                    properties: {
                        value: 12
                    }
                }
            }
        }
    };
    const flatSubProperties = {
        'customStats.so.many.properties.value': 12,
        'customStats.so.many.value': 11,
        'customStats.so.value': 10
    };
    const flatSubPropertiesSingleSkip = { 'customStats.so.many.properties.value': 12, 'customStats.so.value': 10 };

    t.deepEqual(TelegrafPlugin._flattenStats('', basic, commonSkipList, 0), basic, 'Basic in, basic out');
    t.deepEqual(TelegrafPlugin._flattenStats('', basicPlusSkipped, commonSkipList, 0), basic,
                'Basic plus skipped in, basic out');
    t.deepEqual(TelegrafPlugin._flattenStats('', basicPlusSkipped, commonSkipList.concat(['basic']), 0), {},
                'Basic plus skipped in, basic skipped, nothing out');
    t.deepEqual(TelegrafPlugin._flattenStats('', nullProperty, commonSkipList, 0), { scenariosCreated: 0 },
                'Null in, default out');
    t.deepEqual(TelegrafPlugin._flattenStats('', emptyProperty, commonSkipList, 0), {}, 'Empty objects skipped');
    t.deepEqual(TelegrafPlugin._flattenStats('', subProperties, commonSkipList, 0), flatSubProperties,
                'All the sub properties can come to the party');
    t.deepEqual(
        TelegrafPlugin._flattenStats('', subProperties, commonSkipList.concat(['customStats.so.many.value']), 0),
        flatSubPropertiesSingleSkip, 'Sub properties can be skipped');
    t.deepEqual(TelegrafPlugin._flattenStats('', subProperties, commonSkipList.concat(['customStats.so']), 0), {},
                'Skipping a parent property skips all children');


    t.end();
});
