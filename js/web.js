"use strict";
exports.__esModule = true;
var ack_node_1 = require("ack-node");
var reqresRes = require("ack-node/js/modules/reqres/res");
var vhost = require("vhost");
var https = require("https");
var webapp_1 = require("./webapp");
var tls = require("tls");
var express = require("express");
var routers = ack_node_1.ackX.router();
var startTestingRoutes = require('./startTestingRoutes.function');
var testSite = require('./testRoutes.function');
/**
  request object CLASS
  @scope: isClearRequires, consoleAll
*/
var web = function web() {
    this.router = routers;
    this.data = {};
    this.data.portStruct = this.data.portStruct || {};
    this.data.routers = {};
    this.data.isClearRequires = this.data.isClearRequires || this.isProductionMode;
    this.data.consoleAll = this.data.consoleAll;
    this.data.consoleNonProductionErrors = true;
};
web.app = webapp_1.webapp.webapp;
web.prototype.consoleAll = function (logger) {
    this.data.routers.consoleAll = webapp_1.webapp.consoleAll(logger);
    return this;
};
web.prototype.getRunningMode = function () {
    if (this.data.isProductionMode)
        return 'PRODUCTION';
    return process.env.NODE_ENV;
};
web.prototype.isProductionMode = function (yesNo) {
    if (yesNo != null) {
        this.data.isProductionMode = yesNo;
        return yesNo;
    }
    if (this.data.isProductionMode != null)
        return this.data.isProductionMode;
    return (this.getRunningMode() || 'development').toLowerCase() == 'production';
};
//web.prototype.routers = webapp
web.prototype.getExpress = function () {
    return express;
};
web.prototype.registerApp = function (app, portOrArray, host, sslOps) {
    if (portOrArray && portOrArray.constructor == Array) {
        for (var x = 0; x < portOrArray.length; ++x) {
            this.registerOneApp(app, portOrArray[x], host, sslOps);
        }
    }
    else {
        this.registerOneApp(app, portOrArray, host, sslOps);
    }
    return this;
};
/**
  @app - any connect/express like app with use/get/put/post/all methods
  @port - single port or multiple port array
  @host - domain host name or array of host names
  @sslOps - {SNICallback, cert, key}
*/
web.prototype.registerOneApp = function (app, port, host, sslOps) {
    var portStruct = this.paramPortStruct(port);
    portStruct.appArray.push(app); //catalog app
    /* add events */
    app.beforeStart = function (method) {
        if (method == 'start') {
            return app.beforeStart.memory.forEach(function (callback) { return callback(); });
        }
        app.beforeStart.memory.push(method);
    };
    app.beforeStart.memory = [];
    app.afterStart = function (method) {
        if (method == 'start') {
            return app.afterStart.memory.forEach(function (callback) { return callback(); });
        }
        app.afterStart.memory.push(method);
    };
    app.afterStart.memory = [];
    /* end: add events */
    if (app.isProductionMode) {
        app.isProductionMode(this.isProductionMode()); //pass production mode status along
    }
    app.use(reqresnext(this)); //every request is touched by web processor
    //when engaged by request, ensure default app does not run by setting host-name
    app.use(function (req, res, next) {
        res.ackHostHosted = host || port; //let the main app know a vhost||port picked up the request and not to run default app
        next();
    });
    if (host) {
        if (host.constructor == String) { //cast host string to host array. single-host versus !multi-host-array
            host = [host];
        }
        host.forEach(function (hostName, i) {
            portStruct.hostArray.push(hostName);
            var vRoute = vhost(hostName, app);
            portStruct.rootApp.use(vRoute); //request processor(analyze host-name for processing
        });
    }
    if (sslOps) {
        if (host) {
            portStruct.multiSslArray.push({ hostNameArray: host, sslOps: sslOps });
        }
        if (!portStruct.sslOps) {
            portStruct.sslOps = sslOps;
        }
    }
    return this;
};
/** returns connect-package app. args: portNumber, virtualHostName (does not pre-load clientInput)
  @port - single port or multiple port array
  @hostOrOptions - domain host name or array of host names || @options
  @options{
    cert:String - for ssl
    key:String - for ssl
    SNICallback:Function - for ssl
  }
*/
web.prototype.host = function (port, hostName, options) {
    var app = webapp_1.host(); //connect app WITH addons
    this.registerApp(app, port, hostName, options);
    return app;
};
/** returns express app. Defaults include request timeout, force strict-paths, and 404 is closing midware
  @port - single port or multiple port array
  @hostOrOptions - domain host name or array of host names || @options
  @options{
    timeout:Number = 10000
    cert:String - for ssl
    key:String - for ssl
    SNICallback:Function - for ssl
  }
*/
web.prototype.api = function (port, hostOrOptions, options) {
    if (hostOrOptions && hostOrOptions.constructor == Object) {
        options = hostOrOptions;
        hostOrOptions = null;
    }
    else {
        options = options || {};
    }
    var app = new webapp_1.webapp.reExpress().strictPaths();
    if (options.timeout || options.timeout == null) {
        app.use(routers.timeout(options.timeout || 10000));
    }
    this.registerApp(app, port, hostOrOptions, options);
    app.beforeStart(function () {
        app.use(routers.notFound());
    });
    return app;
};
/** same as api but always pre-loads clientInput. Possibly deprecated */
web.prototype.website = function (port, host, sslOps) {
    var app = new webapp_1.webapp.webapp()
        .strictPaths()
        .preloadClientInput()
        .timeout(30000);
    this.registerApp(app, port, host, sslOps);
    app.beforeStart(function () {
        app.use(routers.notFound());
    });
    return app;
};
/** Returns object of test results {passing:[],failing:[]}
  @options{
    port   : Number = all-ports
    host   : String = localhost
    method : String (GET|POST|PUT|DELETE)
    logTo  : Object = console.log - not yet implemented
  }
*/
web.prototype.startAndTest = function (options) {
    return startTestingRoutes(this, this.data.portStruct, options);
};
/** see startAndTest */
web.prototype.test = function (options) {
    if (options === void 0) { options = {}; }
    this.eachApp(function (app, port) {
        var ops = Object.assign({}, options);
        ops.port = port;
        testSite(app, ops);
    }, options);
};
/** see startAndTest */
web.prototype.testApps = function (apps, options) {
    for (var x = 0; x < apps.length; ++x) {
        testSite(apps[x], options);
    }
};
web.prototype.getAppsByPort = function (port) {
    return this.data.portStruct[port].appArray;
};
web.prototype.eachApp = function (callback, options) {
    if (options === void 0) { options = {}; }
    var ports = options.port ? [options.port] : Object.keys(this.data.portStruct);
    for (var portIndex = 0; portIndex < ports.length; ++portIndex) {
        var port = ports[portIndex];
        for (var appIndex = 0; appIndex < this.data.portStruct[port].appArray.length; ++appIndex) {
            callback(this.data.portStruct[port].appArray[appIndex], port);
        }
    }
};
/** as soon as one port is available to start, it is started */
web.prototype.startOnePort = function (onPortStart, options) {
    if (options === void 0) { options = {}; }
    options.portStartCount = 1;
    return this.start(onPortStart, options);
};
//each(portNum, server, rootApp, portStruct) = as each port is started
web.prototype.start = function (each, options) {
    var _this = this;
    if (options === void 0) { options = {}; }
    each = each || function () { }; //function to call with each starting port
    var portNumArr = Object.keys(this.data.portStruct);
    var promise = ack_node_1.ackX.promise().bind(this);
    if (options.portStartCount) {
        var pos_1 = 0;
        var rotator_1 = function (callback) {
            var port = Number(portNumArr[pos_1]);
            if (pos_1 >= portNumArr.length) {
                //throw new Error('ran out of ports')
                callback(new Error('Ran out of ports to try to start server with. Ports Tried:' + portNumArr.join(',')));
            }
            return _this.startPort(port)
                .then(function (server) {
                callback(null, [server]);
            })["catch"]('EADDRINUSE', function (e) {
                console.log('\x1b[34mack-host:\x1b[0m \x1b[33mport ' + port + ' is in use\x1b[0m');
                ++pos_1;
                return rotator_1(callback);
            });
        };
        promise = promise.callback(rotator_1);
    }
    else {
        promise = promise.map(portNumArr, this.startPort);
    }
    return promise
        .map(function (array) {
        //console.log('array', array[0])
        var portNum = array[0], portStruct = array[1];
        each(portNum, portStruct.server, portStruct.rootApp, portStruct);
    })
        .set(this.data.portStruct);
};
web.prototype.startPort = function (portNum) {
    portNum = Number(portNum);
    var portStruct = this.data.portStruct[portNum];
    //ports default app
    if (portStruct.appArray.length) {
        var defApp = portStruct.appArray[0];
        portStruct.rootApp.use(function (req, res, next) {
            if (!res.ackHostHosted) { //indicator of vhost processing, not present, run Default-App
                defApp(req, res, next);
            }
            else {
                next();
            }
        });
    }
    portStruct.appArray.forEach(function (app, i) {
        app.beforeStart('start');
    });
    if (!this.isProductionMode() && this.data.consoleNonProductionErrors) {
        //console.log('--Non-Production-Mode-Detected (mode='+this.getRunningMode()+'): All request errors will be console logged.')
        portStruct.rootApp.use(routers.consoleNonProductionErrors());
    }
    //request closing
    portStruct.rootApp.use(reqresRes.geterrhan());
    portStruct.rootApp.use(function (req, res, next) {
        if (!res.closed && !res._headerSent) {
            ack_node_1.ackX.reqres(req, res).abort();
        }
    });
    var ssl = portStruct.sslOps && portStruct.sslOps.cert && portStruct.sslOps.key;
    var tApp;
    if (ssl) {
        var sslOps = portStruct.sslOps;
        /* DYNAMIC SSL */
        var isSniMode = portStruct.multiSslArray.length > 1;
        if (isSniMode) {
            if (portStruct.sslOps.SNICallback) { //already exist?
                sslOps = {}; //ensure sslOps.SNICallback won't be overwritten on original scope. If two ports start a server, the last one would always be the SNI responder for all request (bad)
                for (var key in portStruct.sslOps) {
                    sslOps[key] = portStruct.sslOps[key];
                }
            }
            sslOps.SNICallback = getSniCallbackForPort(portNum, this);
        }
        /* END: DYNAMIC SSL */
        tApp = https.createServer(sslOps, portStruct.rootApp);
    }
    else {
        tApp = portStruct.rootApp;
    }
    return ack_node_1.ackX.promise().bind(tApp)
        .callback(function (callback) {
        //portStruct.server = tApp.listen(portNum,'0.0.0.0',function(err,data){
        portStruct.server = tApp.listen(portNum, '0.0.0.0', undefined, callback);
        portStruct.server.on('error', function (e) {
            callback(e);
        });
    }) //start the http.listen protcol on a certain port, with IPV4, and with a start-up-complete callback
        .then(function () {
        //tell all apps we have started
        portStruct.appArray.forEach(function (app, i) {
            app.events.emit('start', portStruct.server);
            app.afterStart('start');
        });
    })
        .set([portNum, portStruct]);
};
function getSniCallbackForPort(portNum, hostApp) {
    return function (domain, callback) {
        //this.server._connectionKey//server identifiable string (always handy)
        /* !!! keep!  This is a test to ensure the same portNum SNICallback is for the right server. If SSL issues occur,
        if(this.server && this.server._connectionKey){
          var reqPort = this.server._connectionKey.split(':').pop()
          reqPort = Number( reqPort )
          if(reqPort!=portNum){
            console.log('SNICallback crash detected. '+reqPort+' & '+portNum)
            throw new Error('SNICallback crash detected. '+reqPort+' & '+portNum)
          }
        }
        */
        var portStruct = hostApp.data.portStruct[portNum];
        for (var msa = 0; msa < portStruct.multiSslArray.length; ++msa) {
            var hostConfig = portStruct.multiSslArray[msa];
            for (var hna = 0; hna < hostConfig.hostNameArray.length; ++hna) {
                if (hostConfig.hostNameArray[hna].toLowerCase() == domain.toLowerCase()) {
                    var ssl = tls.createSecureContext(hostConfig.sslOps).context;
                    return callback(null, ssl);
                }
            }
        }
        //var ssl = crypto.createCredentials(hostConfig.sslOps).context
        var ssl = tls.createSecureContext(portStruct.sslOps).context;
        callback(null, ssl);
    };
}
web.prototype.stop = function (each) {
    var ps = this.data.portStruct;
    var keys = Object.keys(ps);
    var stopped = keys.length;
    return ack_node_1.ackX.promise()
        .next(function (next) {
        function closer() {
            if (stopped == 0) {
                next();
            }
        }
        keys.forEach(function (v, i) {
            if (!ps[v].server) {
                --stopped;
                if (!stopped) {
                    next();
                }
                return; //nothing to stop here
            }
            ps[v].appArray.forEach(function (v, i) {
                v.events.emit('stop', v.server);
            });
            ps[v].server.close(function () {
                --stopped;
                var server = ps[v].server;
                delete ps[v].server;
                if (each)
                    each(v);
                closer();
            });
        });
    });
};
web.prototype.getPortCount = function () {
    return Object.keys(this.data.portStruct).length;
};
/** returns portnumber of port that is still on */
web.prototype.isOn = function () {
    var portNum, i, portKeys = Object.keys(this.data.portStruct);
    if (!this.data.portStruct || !portKeys.length)
        return 0;
    for (i = 0; i < portKeys.length; ++i) {
        portNum = portKeys[i];
        if (this.data.portStruct[portNum].server) {
            return portNum;
        }
    }
    return false;
};
web.prototype.paramPortStruct = function (port) {
    if (this.data.portStruct[port])
        return this.data.portStruct[port];
    this.data.portStruct[port] = {
        appArray: [], hostArray: [], sslOps: null, multiSslArray: [],
        rootApp: webapp_1.host() //.use(this.getreqhan())
    };
    return this.data.portStruct[port];
};
web.prototype.dropPorts = function () {
    this.data.portStruct = {};
};
function reqresnext(iWeb) {
    return function (req, res, next) {
        return ack_node_1.ackX.promise().map(iWeb.data.routers, function (value, key, len) {
            return ack_node_1.ackX.promise().callback(function (callback) {
                return value(req, res, callback);
            });
        })
            .set().then(next)["catch"](next);
    };
}
exports.module = new web();
//module.exports.Class = web
