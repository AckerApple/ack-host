"use strict";
exports.__esModule = true;
//const ackHost = require('../index.js')
var testRoutes_function_1 = require("./testRoutes.function");
//console.log('ackHost', ackHost.host(6000))
module.exports = function (ackHost, portConfig, options) {
    options = options || {};
    var rtn = {};
    var promise = Promise.resolve();
    var ports = Object.keys(portConfig);
    var starter = function () { return ackHost.start(onPort); };
    if (options.port) {
        ports = [options.port];
        starter = function () { return ackHost.startPort(options.port).then(function () { return onPort(options.port); }); };
    }
    promise = promise.then(function () { return starter(); })
        .then(function (options) { return ackHostMsg('server fully started'); });
    ports.forEach(function (port) {
        portConfig[port].appArray.forEach(function (site) {
            var ops = Object.assign({}, options); //clone
            ops.port = port;
            promise = promise.then(function () { return testRoutes_function_1.main(site, ops); })
                .then(function (results) { return rtn[port] = results; });
        });
    });
    var stop = function () {
        return ackHost.stop()
            .then(function () { return ackHostMsg('server stopped'); })["catch"](function (e) {
            ackHostMsg('error stopping server');
            console.error(e);
        });
    };
    return promise
        .then(stop)["catch"](function (e) {
        stop();
        console.log(e);
    })
        .then(function () { return rtn; });
};
function onPort(pNum) {
    ackHostMsg('started port:', pNum);
}
function ackHostMsg(msg) {
    var a = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        a[_i - 1] = arguments[_i];
    }
    var args = Array.prototype.slice.apply(arguments);
    args.unshift('\x1b[34mack-host:\x1b[0m');
    console.log.apply(console, args);
}
