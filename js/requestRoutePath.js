"use strict";
exports.__esModule = true;
var ack_node_1 = require("ack-node");
var requestError_1 = require("./requestError");
//binds url route to file path reads. Jade files are rendered by request input. .Js files are treated as module(req, res)
var RequestRoutePath = /** @class */ (function () {
    function RequestRoutePath(a) {
        this.data = a || {};
    }
    RequestRoutePath.prototype.getRoute = function () {
        return this.data.route;
    };
    RequestRoutePath.prototype.setRoute = function (route) {
        this.data.route = route;
        return this;
    };
    RequestRoutePath.prototype.getPath = function () {
        if (!this.data.path) {
            throw 'path not defined in RequestRoutePath';
        }
        return this.data.path;
    };
    RequestRoutePath.prototype.setPath = function (path) {
        this.data.path = path;
        return this;
    };
    RequestRoutePath.prototype.getFail = function () {
        return this.data.fail;
    };
    /** on 404, method called(relpath, reqres). If method returns false, indicates 404 has been handled & no auto 404 should be generated */
    RequestRoutePath.prototype.fail = function (method) {
        this.data.fail = method;
        return this;
    };
    RequestRoutePath.prototype.getSuccess = function () {
        return this.data.success;
    };
    RequestRoutePath.prototype.success = function (method) {
        this.data.success = method;
        return this;
    };
    RequestRoutePath.prototype.getPathObj = function () {
        return ack_node_1.ackX.path(this.getPath());
    };
    //returns promise
    RequestRoutePath.prototype.loadAppFile = function () {
        var $this = this, PathOb = this.getPathObj(), plannedPath = PathOb.path;
        return PathOb.join('reqapp.js')
            .fileSearchUp().go()
            .then(function (path) {
            if (!path) {
                console.log('no app file located in ' + plannedPath);
                return;
            }
            $this.data.application = require(path);
        });
    };
    RequestRoutePath.prototype.applyToApp = function (app) {
        var Path = this.getPathObj();
        if (!Path.sync().exists()) {
            throw 'Path not found. Invalid view route path: ' + Path.path;
        }
        var router = serverLoadingRouter;
        //the app must immediatly receive it's use case. We will update the responder after we have our application loaded
        app.use(this.getRoute(), function (req, res, next) {
            router(req, res, next); //this method will be morphed once app is loaded
        });
        var promise = ack_node_1.ackX.promise().bind(this);
        if (!this.data.application) {
            promise = promise.then(this.loadAppFile);
        }
        return promise.set(app)
            .then(function (app) {
            router = getRouterByRequestRoutePath(this); //morph the router variable to actual request processor (was temp server loading msg)
            return this;
        })["catch"](function (e) {
            console.error('error defining app:', e);
            if (e.stack) {
                console.error(e.stack);
            }
        });
    };
    return RequestRoutePath;
}());
exports.RequestRoutePath = RequestRoutePath;
function getRouterByRequestRoutePath(RequestRoutePath) {
    return function (req, res, next) {
        return new RequestProcessor(req, res, next, RequestRoutePath).process();
    };
}
function serverLoadingRouter(req, res, next) {
    var reqres = ack_node_1.ackX.reqres(req, res);
    if (reqres.isHtml()) {
        var msg = 'Your request has been paused for 5 seconds due to an active server task. Please continue to wait, your request will be resent momentarily.';
        var refresh = '<meta http-equiv="refresh" content="5"><script type="text/javascript">setTimeout(function(){location.reload()}, 7000)</script>';
        var head = '<head>' + refresh + '<meta charset="UTF-8" /><meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=0" /></head>';
        var html = '<!DOCTYPE html><html lang="en">' + head + '<body>' + msg + '</body></html>';
        reqres.res.abort(html);
    }
    else {
        reqres.res.abort('The server you have reached, is starting up. Please try again');
    }
    //next()
}
var RequestProcessor = /** @class */ (function () {
    function RequestProcessor(req, res, next, RequestRoutePath) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.RequestRoutePath = RequestRoutePath;
        this.app = RequestRoutePath.data.application;
        this.reqres = ack_node_1.ackX.reqres(req, res);
        this.requestedFile = { isFound: false, scanned: false, findStatus: {} };
    }
    RequestProcessor.prototype.process = function () {
        var promise = this.loadRequestedFile().bind(this);
        //application processor
        if (this.app) {
            //check file found
            promise = promise.bind(this)
                .then(function (path) {
                if (!this.requestedFile.findStatus.isFirstFind) {
                    return this.runFileNotFound();
                }
            });
            if (this.app.onRequestStart) { //developer optional method
                promise = promise.bind(this)
                    .ifNot(false, function () {
                    return ack_node_1.ackX.promise().set(this.reqres).then(this.app.onRequestStart); //may issue isContinue value that stops processing
                });
            }
            if (this.app.reqpro) {
                //reqres processor
                promise = promise.bind(this)
                    .ifNot(false, function () {
                    return this.app.reqpro(this.reqres, this.app);
                })
                    .ifNot(false, function (rp) {
                    return this.reqpro = rp;
                });
            }
        }
        return promise.bind(this)
            .ifNot(false, function (isContinue) {
            if (isContinue && isContinue.constructor == String) { //content to be used as output instead of fulfilling path request
                this.reqres.res.close(isContinue);
                return false;
            }
        })["if"](false, function () {
            this.reqres.res.close(); //next()
            return false;
        })
            .ifNot(false, this.processAppRequest)["catch"](this.getRouteCatcher());
    };
    RequestProcessor.prototype.getRequestPath = function () {
        return this.req.params[0] ? this.req.params[0] : this.req.path;
    };
    RequestProcessor.prototype.getFileSearch = function () {
        var relpath = this.getRequestPath(), RelPath = ack_node_1.ackX.path(relpath), Path = this.RequestRoutePath.getPathObj(), deepPath = Path["new"].join(relpath);
        var fsu = deepPath.fileSearchUp()
            .setExt('.js')
            .rollUpWith(RelPath);
        var isRequestForFile = relpath.search(/\.[a-z0-9 ]+$/i) >= 0;
        if (!isRequestForFile) { //relpath.split('.').pop().toLowerCase() != 'js'
            fsu.setIndexFileName('index.js');
        }
        return fsu;
    };
    RequestProcessor.prototype.loadRequestedFile = function () {
        if (this.requestedFile.scanned) {
            return ack_node_1.ackX.promise().set(this.requestedFile.path);
        }
        return this.getFileSearch().go()
            .bind(this)
            .then(function (path, resultStatus) {
            this.requestedFile.scanned = true;
            this.requestedFile.isFound = path ? true : false;
            this.requestedFile.path = path;
            this.requestedFile.findStatus = resultStatus;
            return path;
        });
    };
    RequestProcessor.prototype.processAppRequest = function () {
        return this.loadRequestedFile()
            .bind(this)
            .then(function (path) {
            if (!path) {
                return this.runFileNotFound(); //next();
            }
            var requireResult = require(path);
            if (requireResult.reqpro) {
                this.requestedFile.isFound = true;
                return this.runReqpro(requireResult.reqpro);
            }
            return this.runFileNotFound();
        });
    };
    RequestProcessor.prototype.runReqpro = function (reqpro) {
        return ack_node_1.ackX.promise()
            .bind(this)
            .set(this.reqres, this.app, this.reqpro)
            .then(reqpro)
            .then(function (result) {
            var success = this.RequestRoutePath.getSuccess();
            if (success) {
                success(this.reqres);
            }
            if (result) {
                this.reqres.output(result);
            }
            this.reqres.res.close(); //success! close request
        });
    };
    RequestProcessor.prototype.runFileNotFound = function () {
        var relpath = this.getRequestPath();
        var fnfHandle = false;
        var fail = this.RequestRoutePath.getFail();
        var checkofnf = function (ofnf) {
            if (!fnfHandle && ofnf !== false) {
                fnfHandle = fnfHandle || ofnf || false;
            }
        };
        var promise = ack_node_1.ackX.promise();
        if (this.reqpro && this.reqpro.onFileNotFound) {
            promise = promise.set(relpath).bind(this.reqpro).then(this.reqpro.onFileNotFound).then(checkofnf);
        }
        if (this.app && this.app.onFileNotFound) {
            promise = promise.set(this.reqres, relpath).bind(this.app).then(this.app.onFileNotFound).then(checkofnf);
        }
        if (fail) {
            promise = promise.set(relpath, this.reqres).then(fail).then(checkofnf);
        }
        return promise.bind(this).then(function () {
            if (!fnfHandle || fnfHandle.constructor == String) {
                fnfHandle = fnfHandle && fnfHandle.constructor == String ? fnfHandle : 'File Not Found: ' + relpath;
                this.reqres.setStatus(404, 'File Not Found: ' + relpath);
                this.reqres.abort(fnfHandle);
                return false; //indicate to other processes not to continue
            }
        });
    };
    RequestProcessor.prototype.getRouteCatcher = function () {
        var $this = this;
        return function (e) {
            var errHandled = false, promise = ack_node_1.ackX.promise().bind($this.RequestRoutePath);
            try {
                if ($this.app && $this.app.onError) {
                    promise = promise.then(function () {
                        return $this.app.onError(e, $this.reqres); //application specific error handler
                    })
                        .then(function (content) {
                        if (content) {
                            $this.reqres["throw"](content);
                        }
                    });
                }
            }
            catch (e2) {
                try {
                    e.appOnErrorError = e2; //maybe read only
                }
                catch (e) {
                    console.log('reqapp onError processor itself errored');
                    console.error(e2);
                }
            }
            /*
                    try{
                        if(reqpro && reqpro.onError){
                            promise = promise.then(function(){
                                return reqpro.onError(e)//reqres specific error handler
                            })
                            .then(function(content){
                                if(content){
                                    $this.reqres.throw(content)
                                }
                            })
                        }
                    }catch(e2){
                        try{
                            e.reqproOnErrorError=e2//maybe read only
                        }catch(e){
                            console.log('reqpro onError processor itself errored')
                            console.error(e2)
                        }
                    }
            */
            if (!errHandled && !$this.res.closed) {
                requestError_1.requestError($this.reqres, e);
            }
        };
    };
    return RequestProcessor;
}());
exports.RequestProcessor = RequestProcessor;
