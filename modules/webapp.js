"use strict";
var connect = require('connect'),
		basicAuth = require('basic-auth'),
		ackNode = require('ack-node'),//used for path crawling
		events = require('events'),
		requestError = require('./requestError'),
		express = require('express'),
		router = require('ack-node').router()

function reExpress(){
	var app = leachApp(express().disable('x-powered-by'))
	return app
}

function isProductionMode(yesNo){
	if(yesNo!=null){
		this.isProMode = yesNo
		return yesNo
	}
	if(this.isProMode!=null){
		return this.isProMode;
	}
	return (process.env.NODE_ENV || 'development').toLowerCase() == 'production'
}

//one step above using http.createServer
var host = function host(){
	var app = leachApp(connect())
	for(var x in host.prototype)app[x] = host.prototype[x]
	return app
}

function leachApp(app){
	app.events = new events.EventEmitter()
	//app.new = new webapp.tools(app)

	for(var x in host.prototype)app[x] = host.prototype[x]

	app.routeLog = []
	app.use = logAppRoutes(app, app.use)
	app.all = logAppRoutes(app, app.all)
	//app.static = logAppRoutes(app, app.static, 'GET')
	app.get = logAppRoutes(app, app.get, 'GET')
	app.post = logAppRoutes(app, app.post, 'POST')
	app.put = logAppRoutes(app, app.put, 'PUT')

	return app
}

function logAppRoutes(app, routerFn, method){
	var use = routerFn
	return function(){
		var rtn = routerFn.apply(this, arguments) || {}

		if(arguments.length>1){
			var meta = {
				path:arguments[0],
				router:arguments[1]
			}

			if(method){
				meta.method = method
			}

			app.routeLog.push(meta)

			rtn.meta = function(newmeta){
				if(newmeta){
					Object.assign(meta, newmeta)
				}

				return meta
			}
		}

		return rtn
	}
}

host.prototype.isProductionMode = isProductionMode

host.prototype.consoleAll = function(logger){
	return this.use( router.consoleAll(logger) )
}

host.prototype.consoleNonProductionErrors = function(route){
	if(route){
		this.use(route, router.consoleNonProductionErrors())
	}else{
		this.use( router.consoleNonProductionErrors() )
	}
	return this
}

host.prototype.localNetworkOnly = function(route){
	if(route){
		this.use(route, router.localNetworkOnly())
	}else{
		this.use( router.localNetworkOnly() )
	}
	return this
}

/** 404 */
host.prototype.notFound = function(route){
	if(route){
		this.use(notFound, router.notFound())
	}else{
		this.use( router.notFound() )
	}
	return this
}

host.prototype.respond = function(routeOrString, stringOrOptions, options){
	if(stringOrOptions){
		this.use(routeOrString, router.respond(stringOrOptions, options))
	}else{
		this.use( router.respond(routeOrString) )
	}
	return this
}

host.prototype.throw = function(routeOrError, error){
	if(error){
		this.use(routeOrError, router.throw(error))
	}else{
		this.use( router.throw(routeOrError) )
	}
	return this
}

host.prototype.logging = function(routeOrOptions, optionsOrFormat, format){
	if(optionsOrFormat){
		this.use(routeOrOptions, router.logging(format, optionsOrFormat))
	}else{
		this.use( router.logging(routeOrOptions, optionsOrFormat) )
	}
	return this
}

host.prototype.closeProductionErrors = function(route){
	if(route){
		this.use(route, router.closeProductionErrors())
	}else{
		this.use( router.closeProductionErrors() )
	}
	return this
}

/** @statusCode - default 404 */
host.prototype.ignoreFavors = function(statusCode){
	this.use( router.ignoreFavors(statusCode) );return this
}

host.prototype.compress = function(options){
	this.use( router.compress(options) );return this
}

/** options{origin:'url-string'}. No options means allow all. See package cors */
host.prototype.cors = function(options){
	this.use( router.cors(options) );return this
}

/**
	times out a all requests after a given time
	creates req.clearTimeout() to prevent timeout for a request
	when time out occurs req.timedout is set to true
	@time milliseconds
	@respond true/false true=sets-response-headers
*/
host.prototype.timeout = function(ms, options){
	if(!this.Timeout){
		this.use(this.applyTimeout.bind(this));
	}
	this.Timeout = router.timeout(ms, options)
	return this;
}

host.prototype.applyTimeout = function(req, res, next){
	this.Timeout(req, res, next)
}

/**
	(route [,path],options)
	@path defaults to route
	@options:{maxAge:milsecs, compress:boolean}
*/
host.prototype.static = function(route, path, options){
	options = options || {}

	var staticRouter = express.static(path || route, options)
	options.compress = options.compress==null ? true : options.compress

	if(path){
		if(options.compress){
			return this.use(route, router.compress(), staticRouter);//gzip compress content
		}
		return this.use(route, staticRouter)
	}else{
		if(options.compress){//!must come before
			return this.use(router.compress(), staticRouter);//gzip compress content
		}
		return this.use(staticRouter)
	}

	return staticRouter
}
host.prototype.routeStaticPath = host.prototype.routeStaticPath//respect express

/**
	@routeOrUrl - only relocate certain routes OR relocate all routes to one url
	@url - relocation url
*/
host.prototype.relocate = function(routeOrUrl, url){
	if(url){
		this.use(routeOrUrl, router.relocate(url))
	}else{
		this.use(router.relocate(url))
	}
}

/** pushes all http requests to https for the provided route. If no route argument provided, all requests will be pushed to ssl */
host.prototype.secure = function(route){
	var router = function(req, res, next){
		var reqres = ackNode.reqres(req,res)
		if(reqres.req.isHttps()){
			return next()
		}

		var newUrl = reqres.req.absoluteUrl({isHttps:true})
		reqres.relocate( newUrl )
	}

	if(route){
		this.use(route, router)
	}else{
		this.use(router)
	}
}

host.prototype.useBasicAuth = function(routeOrCallback,callback){
	var auth = function (req, res, next){
		function unauthorized() {
			res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
			return res.send(401);
		};

		var user = basicAuth(req);

		if (!user || !user.name || !user.pass)
			return unauthorized();

		var complete = function(result){
			if(!result)return unauthorized();
			next()
		}

		var cb = callback||routeOrCallback
		cb(user.name,user.pass,complete)
	};

	var s200 = function (req, res) {
		res.send(200, 'Authenticated');
	}

	if(typeof(routeOrCallback)=='string'){
		this.use(routeOrCallback, auth, s200)
	}else{
		this.use(auth, s200)
	}

	return this
}

host.prototype.jadePath = function(path){
	var h = express().disable('x-powered-by')
	h.set('views', path)
	h.set('view engine', 'jade')

	this.use(h)
/*
	this.set('views', path)//set express var
	this.set('view engine', 'jade')//set express var
*/
	return this
}

host.prototype.strictPaths = function(){
	this.use(strictPathing);
	return this;
}

/** always pre-load client input */
host.prototype.preloadClientInput = function(){
	this.use(function(req, res, next){
		ackNode.reqres(req, res).req.loadClientInput()//pre-load form and multi-part posts
		.set()//ensure nothing is passed along
		.then(next).catch(next)
	});
	return this;
}





//returns enhanced express Object. One step above using new host()
function webapp(){
	var app = reExpress()
	this.tools = new webapp.tools(app)
	return app

}

//Class aka we.app.new
webapp.tools = function(app){
	this.app = app
	return this
}

webapp.tools.prototype.RequestRoutePath = function(route, path, success, fail){
	var Router = new webapp.tools.RequestRoutePath({route:route, path:path})
	if(success)Router.success(success)
	if(fail)Router.fail(fail)
	return Router.applyToApp(this.app)
}

webapp.tools.prototype.ViewRoutePath = function(route, path, success, fail){
	var Router = new webapp.tools.ViewRoutePath({route:route, path:path})
	if(success)Router.success(success)
	if(fail)Router.fail(fail)
	return Router.applyToApp(this.app)
}


webapp.tools.RequestRoutePath = require('./requestRoutePath')




//Class
webapp.tools.ViewRoutePath = function(a){
	this.data = a || {};return this
}

webapp.tools.ViewRoutePath.prototype.getPathObj = function(){
	return ackNode.path(this.data.path)
}

webapp.tools.ViewRoutePath.prototype.fail = function(fail){
	this.data.fail = fail;return this
}

webapp.tools.ViewRoutePath.prototype.success = function(success){
	this.data.success = success;return this
}

webapp.tools.ViewRoutePath.prototype.processRequest = function(req, res, next){
	var reqres = ackNode.reqres(req, res)
	var jPath = reqres.req.Path()
	var reqPath = jPath.relative

	var  fail     = this.data.fail
		,success  = this.data.sucess
		,relpath  = reqPath
		,relPath  = ackNode.path(relpath)
		,Path     = this.getPathObj()
		,deepPath = Path.new.join(reqPath)

	return deepPath.fileSearchUp()
	.setExt('.jade')
	.setIndexFileName('index.jade')
	.rollUpWith(relPath)
	.go()
	.then(function(path){
		if(!path){
			if(fail){
				fail(relpath, req, res)
			}
			next()
		}

		var p = relPath.noFirstSlash().removeExt().string.noLastSlash()
		var locals = reqres.input().data//url and form vars

		//convert string literals
		for(var key in locals){
			switch(locals[key]){
				case 'true':{
					locals[key] = true
					break;
				}
				case 'false':{
					locals[key] = false
					break;
				}

				default:{
					var n = Number(locals[key])//string numbers to numbers
					if(!isNaN(n)){
						locals[key] = n
					}
				}
			}
		}

		var html = ackNode.template(path, locals)

		ackNode.reqres(req, res).res.abort(html)//success! close request
	})
}

webapp.tools.ViewRoutePath.prototype.applyToApp = function(app){
	var Path = this.getPathObj(), success=this.data.success
	var $this = this

	if(!Path.sync().exists()){
		throw new Error('Invalid view route path: '+Path.path);
	}

	app.use(this.data.route, function(req,res,next){
		$this.processRequest(req, res, next).set()
		.catch(function(e){
			var reqres = ackNode.reqres(req, res)
			requestError(reqres, e)
			//next()
		})
	})

	return this
}






module.exports.webapp = webapp
module.exports.host = host
module.exports.static = express.static
module.exports.reExpress = reExpress
/*
module.exports.express = router.express

module.exports.strictPathing = router.strictPathing
module.exports.consoleAll = router.consoleAll
module.exports.routeCookieToAuthHeader = router.routeCookieToAuthHeader
*/
function strictPathing(req, res, next){
	var reqres = ackNode.reqres(req, res)
		,abUrl = reqres.req.absoluteUrl()//pre-load form and multi-part posts
		,oUrl = abUrl

	abUrl = abUrl.replace(/([^:]\/)\/+/g, "$1")//replace double slashes with single (ignore :// and opening slashes)
	if(abUrl != oUrl){
		return reqres.relocate(abUrl, 'tidy-url')
	}

	next()
}