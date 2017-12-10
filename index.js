'use strict';

const Lynx = require('lynx');
const _ = require('lodash');
const debug = require('debug')('plugins:telegraf');

function TelegrafPlugin(rawConfig, ee) {
    const self = this;
    self._report = [];

    const config = _reconcileConfigs(rawConfig);
    debug('Resulting StatsD Configuration: ' + JSON.stringify(config));

    const metrics = new Lynx(config.host, config.port);

    ee.on('stats', function (statsObject) {
        const stats = statsObject.report();
        debug('Stats Report from Artillery: ' + JSON.stringify(stats));

        if (config.enableUselessReporting) {
            self._report.push({ timestamp: stats.timestamp, value: 'test' });
        }

        const flattenedStats = _flattenStats('', stats, config.skipList, config.defaultValue);
        debug('Flattened Stats Report: ' + JSON.stringify(flattenedStats));

        _.each(flattenedStats, function (value, name) {
            debug('Reporting: ' + name + '  ' + value);
            const tagString = _.reduce(config.tags, (result, tagValue, tagName) => {
                result += ',' + tagName + "=" + tagValue;
                return result;
            }, "");
            metrics.gauge(config.prefix + '.' + name + tagString, value || config.defaultValue);
        });

    });

    ee.on('done', function () {
        debug('done');
        if (config.closingTimeout > 0) {
            setTimeout(function () {
                metrics.close();
            }, config.closingTimeout);
        } else {
            metrics.close();
        }
    });

    return this;
}


TelegrafPlugin.prototype.report = function report() {
    if (this._report.length === 0) {
        return null;
    } else {
        this._report.push({
                              timestamp: 'aggregate',
                              value: { test: 'aggregate test' }
                          });
        return this._report;
    }
};

// Parses the stats object and sub objects to gauge stats
function _flattenStats(prefix, value, skipList, defaultValue) {
    let flattenedStats = {};
    // Skip logic
    if (_.contains(skipList, prefix)) {
        debug(prefix + ' skipped');
        return {};
    }

    // Recursively loop through objects with sub values such as latency/errors
    if (_.size(value) > 0) {
        _.each(value, function (subValue, subName) {
            let newPrefix = prefix;
            if (newPrefix === '') {
                newPrefix = subName;
            }
            else {
                newPrefix += '.' + subName;
            }
            flattenedStats = _.merge(flattenedStats, _flattenStats(newPrefix, subValue, skipList, defaultValue));
        });
    }
    // Hey, it is an actual stat!
    else if (_.isFinite(value)) {
        flattenedStats = _.merge(flattenedStats, { [prefix]: value });
    }
    // Artillery is sending null or NaN.
    else if (_.isNaN(value) || _.isNull(value)) {
        flattenedStats = _.merge(flattenedStats, { [prefix]: defaultValue });
    }
    // Empty object such as 'errors' when there are not actually errors
    else {
        debug(prefix + ' has nothing to report');
        // no-op
    }
    return flattenedStats;
}

function _generateSkipList(input) {
    let skipList = ['timestamp', 'latencies']; //always skip these

    // Add any values passed in by the user
    if (_.isString(input)) {
        let inputWithoutSpaces = input.replace(/\s/g, '');
        skipList = skipList.concat(inputWithoutSpaces.split(','));
    }
    return skipList;
}

function _reconcileConfigs(config) {
    return {
        host: config.plugins.telegraf.host || 'localhost',
        port: config.plugins.telegraf.port || 8125,
        prefix: config.plugins.telegraf.prefix || 'artillery',
        closingTimeout: config.plugins.telegraf.timeout || 0,
        defaultValue: config.plugins.telegraf.default || 0,
        skipList: _generateSkipList(config.plugins.telegraf.skipList),
        // This is used for testing the plugin interface
        enableUselessReporting: config.plugins.telegraf.enableUselessReporting,
        tags: config.plugins.telegraf.tags
    }
}

module.exports = TelegrafPlugin;

// Exported for testing purposes...
module.exports._generateSkipList = _generateSkipList;
module.exports._flattenStats = _flattenStats;
module.exports._reconcileConfigs = _reconcileConfigs;
