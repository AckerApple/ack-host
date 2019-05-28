"use strict";
exports.__esModule = true;
var assert = require("assert");
var ack = require("../ack-node");
var routesToArray_function_1 = require("./routesToArray.function");
var icons = {
    check: '✓'
};
if (process.platform === 'win32') {
    icons.check = '\u221A';
}
/** Runs node testing against a site/app */
exports.main = function (site, options) {
    var routes = routesToArray_function_1.routesToArray(site.routeLog);
    return testRoutes(routes, options);
};
function testRoutes(routes, options) {
    var passing = [];
    var failing = [];
    var errs = [];
    var successCount = 0;
    var processTestError = function (test, err) {
        var msg = errs.length + ') ' + test.name;
        errs.push({ msg: msg, error: err });
        console.log('\x1b[31m' + msg + '\x1b[0m');
        return err;
    };
    var processTest = function (test, err) {
        //if(err)return err
        if (err) {
            failing.push(test);
            return processTestError(test, err);
        }
        ++successCount;
        var msg = '\x1b[32m' + icons.check + ' \x1b[90m' + test.name + '\x1b[0m';
        if (test.time > 75) {
            msg += ' \x1b[31m(' + test.time + 'ms)\x1b[0m';
        }
        else if (test.time > 37) {
            msg += ' \x1b[33m(' + test.time + 'ms)\x1b[0m';
        }
        console.log(msg);
        passing.push(test);
    };
    var tests = [];
    var onlyArray = [];
    var promises = routes.map(function (route) {
        var routeTests = route.sample.map(function (sample) { return mapSample(sample, route, options); });
        tests.push.apply(tests, routeTests);
    });
    for (var x = tests.length - 1; x >= 0; --x) {
        var testMeta = tests[x];
        if (!testMeta) {
            tests.splice(x, 1);
            continue;
        }
        if (testMeta.sample.test.only) {
            onlyArray.unshift(testMeta);
        }
    }
    var runs = onlyArray.length ? onlyArray : tests;
    return runTestCases(runs, processTest)
        .then(function () {
        console.log();
        console.log('\x1b[32m' + successCount + ' passing\x1b[0m');
        if (errs.length) {
            console.log('\x1b[31m' + errs.length + ' failing\x1b[0m');
            errs.forEach(function (err, i) {
                console.log();
                console.log('\x1b[32m' + err.msg + '\x1b[0m');
                if (err.error.message) {
                    console.log('\x1b[31m' + err.error.message + '\x1b[0m');
                    if (err.error.stack && !err.error.isTimeoutError) {
                        console.log('\x1b[90m' + err.error.stack + '\x1b[0m');
                    }
                }
                else {
                    console.log('\x1b[31m');
                    console.log(err.error);
                    console.log('\x1b[0m');
                }
            });
        }
        return { passing: passing, failing: failing };
    })["catch"](function (e) { return console.error(e); });
}
function getRoutePath(route, sample) {
    if (sample === void 0) { sample = {}; }
    var simplePath = sample.path || route.path;
    if (sample.params) {
        for (var key in sample.params) {
            var regX = new RegExp(':' + key, 'gi');
            simplePath = simplePath.replace(regX, sample.params[key]);
        }
    }
    return simplePath;
}
function runTestCases(tests, processTest) {
    var promise = Promise.resolve();
    tests.forEach(function (test) {
        promise = promise.then(function () { return promiseTestCase(test, processTest); });
    });
    return promise;
}
function promiseTestCase(test, processTest) {
    return Promise.resolve(runTestCase(test))["catch"](function (err) { return err; })
        .then(function (err) { return processTest(test, err); });
}
function runTestCase(test) {
    /*
    let itFunction = it
    if(test.sample.test.only){
      itFunction = it.only
    }*/
    if (test.sample.test.skip) {
        //itFunction = it.skip
        console.log('\x1b[36m- ' + test.name + '\x1b[0m');
        return;
    }
    var startTime = Date.now();
    return test.test()
        .then(function (x) { return (test.time = Date.now() - startTime) && x; });
    //  itFunction(test.name, test.test)
}
function mapSample(sample, route, options) {
    var test = getTestBySampleRoute(sample, route, options);
    var simplePath = getRoutePath(route, sample);
    var itsName = (route.method || 'GET') + ':' + options.port + simplePath;
    if (!sample.test)
        return;
    if (options.method && route.method != options.method) {
        return;
    }
    return { test: test, name: itsName, sample: sample };
}
/**
  @options{
    port - what port to conduct test on
    method - limit tests to only matching methods
    host - server address
  }
*/
function getTestBySampleRoute(sample, route, options) {
    options = options || {};
    options.host = options.host || 'localhost';
    var req = ack.req();
    var simplePath = getRoutePath(route, sample);
    if (sample.post) {
        req.postVar(sample.post);
    }
    if (route.method) {
        req.method(route.method);
    }
    if (sample.request) {
        var request = sample.request;
        if (request.constructor == Function) {
            request = request();
        }
        Promise.resolve(request).then(function (result) { return req.json(result); });
    }
    return function () {
        var timeout = sample.test.timeout || 2000;
        var promise = ack.promise();
        if (sample.response) {
            var sampleResponse = sample.response.constructor == Function ? sample.response() : sample.response;
            promise = promise
                .callback(callbackTimeout(sampleResponse, timeout))
                .then(function (response) { return ({
                statusCode: 200,
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify(response)
            }); });
        }
        else {
            var urlPath = 'http://' + options.host + ':' + options.port + simplePath;
            promise = promise.callback(callbackTimeout(req.send(urlPath, { spread: false }), timeout));
        }
        return promise
            .then(testRouteSampleResponse(route, sample));
    };
}
function callbackTimeout(promise, timeout) {
    return function (callback) {
        var killCallback = function (err, x, y) {
            callback(err, x, y);
            callback = function () { }; //all future calls will become ignored
        };
        setTimeout(function () {
            var err = new Error('Error: Timeout of ' + timeout + 'ms exceeded. For async tests and hooks, ensure "done()" is called; if returning a Promise, ensure it resolves.');
            err.isTimeoutError = true;
            killCallback(err);
        }, timeout);
        Promise.resolve(promise)
            .then(function (x) { return killCallback(null, x); })["catch"](function (e) { return killCallback(e); });
    };
}
function testRouteSampleResponse(route, sample) {
    var simplePath = getRoutePath(route, sample);
    return function (res) {
        var body = res.body;
        var contentType = '';
        var promises = [];
        //see if json
        for (var key in res.headers) {
            if (key.toLowerCase() == 'content-type') {
                contentType = res.headers[key];
                break;
            }
        }
        var method = route.method ? route.method.toUpperCase() : 'GET';
        var isParseBody = !sample.request;
        if (sample.test.cases) {
            var cases = sample.test.cases.constructor == Array ? sample.test.cases : [sample.test.cases];
            promises.push(testCases(cases, res));
        }
        if (isParseBody && contentType.search(/application\/json/i) >= 0) {
            body = JSON.parse(body);
        }
        if (route.returnType) {
            var returnType = route.returnType.toLowerCase();
            switch (returnType) {
                case 'array':
                    assert.equal(body.constructor, Array, 'returnType mismatch. Expected:Array Received:' + body.constructor);
                    break;
                case 'string':
                case 'number':
                case 'boolean':
                case 'object':
                    assert.equal(typeof (body), returnType, 'returnType mismatch. Expected:' + returnType + ' Received:' + typeof (body));
                    break;
                default:
                    var contentTypeMatch = contentType.search(returnType) >= 0;
                    assert.equal(contentTypeMatch, true, 'returnType mismatch. Expected:' + returnType + ' Received:' + contentType);
            }
        }
        var statusCode = sample.test.statusCode || 200;
        assert.equal(res.statusCode, statusCode);
        return Promise.all(promises).then(function () { });
    };
}
function testCases(cases, res) {
    var promises = [];
    for (var index = 0; index < cases.length; ++index) {
        promises.push(cases[index](res, assert));
    }
    return Promise.all(promises);
}
