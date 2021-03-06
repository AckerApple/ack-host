"use strict";
exports.__esModule = true;
var connect = require("connect");
var basicAuth = require("basic-auth");
var ack_node_1 = require("ack-node"); //used for path crawlin
var events = require("events");
var requestError_1 = require("./requestError");
var express = require("express");
var requestRoutePath_1 = require("./requestRoutePath");
var router = ack_node_1.ackX.router();
exports.reExpress = function reExpress() {
    var app = leachApp(express().disable('x-powered-by'));
    return app;
};
//export const static = express.static
function isProductionMode(yesNo) {
    if (yesNo != null) {
        this.isProMode = yesNo;
        return yesNo;
    }
    if (this.isProMode != null) {
        return this.isProMode;
    }
    return (process.env.NODE_ENV || 'development').toLowerCase() == 'production';
}
//one step above using http.createServer
exports.host = function host() {
    var app = leachApp(connect());
    for (var x in host.prototype) {
        app[x] = host.prototype[x];
    }
    return app;
};
function leachApp(app) {
    app.events = new events.EventEmitter();
    app["new"] = new exports.webapp.tools(app);
    for (var x in exports.host.prototype)
        app[x] = exports.host.prototype[x];
    app.routeLog = [];
    app.use = logAppRoutes(app, app.use);
    app.all = logAppRoutes(app, app.all);
    app.get = logAppRoutes(app, app.get, 'GET');
    app.post = logAppRoutes(app, app.post, 'POST');
    app.put = logAppRoutes(app, app.put, 'PUT');
    return app;
}
/** creates meta method on routes */
function logAppRoutes(app, routerFn, method) {
    var use = routerFn;
    return function () {
        var rtn = routerFn.apply(this, arguments) || {};
        if (arguments.length > 1) {
            var meta = {
                path: arguments[0],
                router: arguments[1]
            };
            if (method) {
                meta.method = method;
            }
            app.routeLog.push(meta);
            rtn.meta = function (newmeta) {
                if (newmeta) {
                    Object.assign(meta, newmeta);
                }
                return meta;
            };
        }
        return rtn;
    };
}
exports.host.prototype.isProductionMode = isProductionMode;
exports.host.prototype.consoleAll = function (logger) {
    return this.use(router.consoleAll(logger));
};
exports.host.prototype.consoleNonProductionErrors = function (route) {
    if (route) {
        this.use(route, router.consoleNonProductionErrors());
    }
    else {
        this.use(router.consoleNonProductionErrors());
    }
    return this;
};
exports.host.prototype.localNetworkOnly = function (route) {
    if (route) {
        this.use(route, router.localNetworkOnly());
    }
    else {
        this.use(router.localNetworkOnly());
    }
    return this;
};
/** 404 */
exports.host.prototype.notFound = function (route) {
    if (route) {
        this.use(route, router.notFound());
    }
    else {
        this.use(router.notFound());
    }
    return this;
};
exports.host.prototype.respond = function (routeOrString, stringOrOptions, options) {
    if (stringOrOptions) {
        this.use(routeOrString, router.respond(stringOrOptions, options));
    }
    else {
        this.use(router.respond(routeOrString, stringOrOptions));
    }
    return this;
};
exports.host.prototype["throw"] = function (routeOrError, error) {
    if (error) {
        this.use(routeOrError, router["throw"](error));
    }
    else {
        this.use(router["throw"](routeOrError));
    }
    return this;
};
exports.host.prototype.logging = function (routeOrOptions, optionsOrFormat, format) {
    if (optionsOrFormat) {
        this.use(routeOrOptions, router.logging(format, optionsOrFormat));
    }
    else {
        this.use(router.logging(routeOrOptions, optionsOrFormat));
    }
    return this;
};
exports.host.prototype.closeProductionErrors = function (route) {
    if (route) {
        this.use(route, router.closeProductionErrors());
    }
    else {
        this.use(router.closeProductionErrors());
    }
    return this;
};
/** @statusCode - default 404 */
exports.host.prototype.ignoreFavors = function (statusCode) {
    this.use(router.ignoreFavors(statusCode));
    return this;
};
exports.host.prototype.compress = function (options) {
    this.use(router.compress(options));
    return this;
};
/** options{origin:'url-string'}. No options means allow all. See package cors */
exports.host.prototype.cors = function (options) {
    this.use(router.cors(options));
    return this;
};
/** any request for robots.txt will return a text/plain message of "User-agent: *\rDisallow: /"
    @options - not yet used
*/
exports.host.prototype.noRobots = function (options) {
    this.use(/\/robots\.txt$/, router.noRobots(options));
    return this;
};
/**
    times out a all requests after a given time
    creates req.clearTimeout() to prevent timeout for a request
    when time out occurs req.timedout is set to true
    @time milliseconds
    @respond true/false true=sets-response-headers
*/
exports.host.prototype.timeout = function (ms, options) {
    if (!this.Timeout) {
        this.use(this.applyTimeout.bind(this));
    }
    this.Timeout = router.timeout(ms, options);
    return this;
};
exports.host.prototype.applyTimeout = function (req, res, next) {
    this.Timeout(req, res, next);
};
/**
    (route [,path],options)
    @path defaults to route
    @options:{maxAge:milsecs, compress:boolean}
*/
exports.host.prototype.static = function (route, path, options) {
    options = options || {};
    var staticRouter = express.static(path || route, options);
    options.compress = options.compress == null ? true : options.compress;
    if (options.compress) {
        var processor = function (req, res, next) {
            router.compress(req, res, function () { return null; });
            staticRouter(req, res, next);
        };
        if (path) {
            return this.use(route, processor); //gzip compress content
        }
        else {
            return this.use(processor); //gzip compress content
        }
    }
    else {
        if (path) {
            return this.use(route, staticRouter); //gzip compress content
        }
        else {
            return this.use(staticRouter); //gzip compress content
        }
    }
    return staticRouter;
};
exports.host.prototype.routeStaticPath = exports.host.prototype.routeStaticPath; //respect express
/**
    @routeOrUrl - only relocate certain routes OR relocate all routes to one url
    @url - relocation url
*/
exports.host.prototype.relocate = function (routeOrUrl, url) {
    if (url) {
        return this.use(routeOrUrl, router.relocate(url));
    }
    else {
        return this.use(router.relocate(routeOrUrl));
    }
};
/** pushes all http requests to https for the provided route. If no route argument provided, all requests will be pushed to ssl */
exports.host.prototype.secure = function (route) {
    var router = function (req, res, next) {
        var reqres = ack_node_1.ackX.reqres(req, res);
        if (reqres.req.isHttps()) {
            return next();
        }
        var newUrl = reqres.req.absoluteUrl({ isHttps: true });
        reqres.relocate(newUrl);
    };
    if (route) {
        this.use(route, router);
    }
    else {
        this.use(router);
    }
};
exports.host.prototype.useBasicAuth = function (routeOrCallback, callback) {
    var auth = function (req, res, next) {
        function unauthorized() {
            res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
            return res.send(401);
        }
        ;
        var user = basicAuth(req);
        if (!user || !user.name || !user.pass)
            return unauthorized();
        var complete = function (result) {
            if (!result)
                return unauthorized();
            next();
        };
        var cb = callback || routeOrCallback;
        cb(user.name, user.pass, complete);
    };
    var s200 = function (req, res) {
        res.send(200, 'Authenticated');
    };
    if (typeof (routeOrCallback) == 'string') {
        this.use(routeOrCallback, auth, s200);
    }
    else {
        this.use(auth, s200);
    }
    return this;
};
exports.host.prototype.jadePath = function (path) {
    var h = express().disable('x-powered-by');
    h.set('views', path);
    h.set('view engine', 'jade');
    this.use(h);
    /*
        this.set('views', path)//set express var
        this.set('view engine', 'jade')//set express var
    */
    return this;
};
exports.host.prototype.strictPaths = function () {
    this.use(strictPathing);
    return this;
};
/** always pre-load client input */
exports.host.prototype.preloadClientInput = function () {
    this.use(function (req, res, next) {
        ack_node_1.ackX.reqres(req, res).req.loadClientInput() //pre-load form and multi-part posts
            .set() //ensure nothing is passed along
            .then(next)["catch"](next);
    });
    return this;
};
//returns enhanced express Object. One step above using new host()
exports.webapp = function () {
    var app = exports.reExpress();
    this.tools = new tools(app);
    return app;
};
//Class aka we.app.new
var tools = /** @class */ (function () {
    function tools(app) {
        this.app = app;
    }
    tools.prototype.RequestRoutePath = function (route, path, success, fail) {
        var Router = new requestRoutePath_1.RequestRoutePath({ route: route, path: path });
        if (success) {
            Router.success(success);
        }
        if (fail)
            Router.fail(fail);
        return Router.applyToApp(this.app);
    };
    tools.prototype.ViewRoutePath = function (route, path, success, fail) {
        var Router = new ViewRoutePath({ route: route, path: path });
        if (success) {
            Router.success(success);
        }
        if (fail)
            Router.fail(fail);
        return Router.applyToApp(this.app);
    };
    return tools;
}());
exports.tools = tools;
exports.webapp.tools = tools;
//Class
var ViewRoutePath = /** @class */ (function () {
    function ViewRoutePath(a) {
        this.data = a || {};
        return this;
    }
    ViewRoutePath.prototype.getPathObj = function () {
        return ack_node_1.ackX.path(this.data.path);
    };
    ViewRoutePath.prototype.fail = function (fail) {
        this.data.fail = fail;
        return this;
    };
    ViewRoutePath.prototype.success = function (success) {
        this.data.success = success;
        return this;
    };
    ViewRoutePath.prototype.processRequest = function (req, res, next) {
        var reqres = ack_node_1.ackX.reqres(req, res);
        var jPath = reqres.req.Path();
        var reqPath = jPath.relative;
        var fail = this.data.fail, success = this.data.sucess, relpath = reqPath, relPath = ack_node_1.ackX.path(relpath), Path = this.getPathObj(), deepPath = Path.Join(reqPath);
        return deepPath.fileSearchUp()
            .setExt('.jade')
            .setIndexFileName('index.jade')
            .rollUpWith(relPath)
            .go()
            .then(function (path) {
            if (!path) {
                if (fail) {
                    fail(relpath, req, res);
                }
                next();
            }
            var p = relPath.noFirstSlash().removeExt().String().noLastSlash();
            var locals = reqres.input().data; //url and form vars
            //convert string literals
            for (var key in locals) {
                switch (locals[key]) {
                    case 'true': {
                        locals[key] = true;
                        break;
                    }
                    case 'false': {
                        locals[key] = false;
                        break;
                    }
                    default: {
                        var n = Number(locals[key]); //string numbers to numbers
                        if (!isNaN(n)) {
                            locals[key] = n;
                        }
                    }
                }
            }
            var html = ack_node_1.ackX.template(path, locals);
            ack_node_1.ackX.reqres(req, res).res.abort(html); //success! close request
        });
    };
    ViewRoutePath.prototype.applyToApp = function (app) {
        var Path = this.getPathObj(), success = this.data.success;
        var $this = this;
        if (!Path.sync().exists()) {
            throw new Error('Invalid view route path: ' + Path.path);
        }
        app.use(this.data.route, function (req, res, next) {
            $this.processRequest(req, res, next).set()["catch"](function (e) {
                var reqres = ack_node_1.ackX.reqres(req, res);
                requestError_1.requestError(reqres, e);
                //next()
            });
        });
        return this;
    };
    return ViewRoutePath;
}());
exports.ViewRoutePath = ViewRoutePath;
function strictPathing(req, res, next) {
    var reqres = ack_node_1.ackX.reqres(req, res), abUrl = reqres.req.absoluteUrl() //pre-load form and multi-part posts
    , oUrl = abUrl;
    abUrl = abUrl.replace(/([^:]\/)\/+/g, "$1"); //replace double slashes with single (ignore :// and opening slashes)
    if (abUrl != oUrl) {
        return reqres.relocate(abUrl, 'tidy-url');
    }
    next();
}
