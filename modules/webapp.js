"use strict";
var connect = require('connect'),
		basicAuth = require('basic-auth'),
		ackNode = require('ack-node'),//used for path crawling
		events = require('events'),
		requestError = require('./requestError'),
		express = require('express'),
		router = require('ack-node').router()

var reExpress = function reExpress(){
	var app = host.leachApp(express().disable('x-powered-by'))
	for(var x in host.prototype)app[x] = host.prototype[x]
	return app
}

var isProductionMode = function(yesNo){
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
	var app = host.leachApp(connect())
	for(var x in host.prototype)app[x] = host.prototype[x]
	return app
}

host.leachApp = function(app){
	app.events = new events.EventEmitter()
	app.new = new webapp.tools(app)
	return app//!!! RETURNS Express app (not-this)
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

host.prototype.ignoreFavors = function(){
	this.use( router.ignoreFavors() );return this
}

host.prototype.compress = function(options){
	this.use( router.compress(options) );return this
}

/** options{origin:'url-string'}. No options means allow all. See package cors */
host.prototype.cors = function(options){
	this.use( router.cors(options) );return this
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
			this.use(route, router.compress());//gzip compress content
		}
		this.use(route, staticRouter)
	}else{
		if(options.compress){//!must come before
			this.use( router.compress() );//gzip compress content
		}
		this.use(staticRouter)
	}

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






//returns enhanced express Object. One step above using new host()
var webapp = function webapp(){
	var app = host.leachApp(express().disable('x-powered-by'))
	for(var x in webapp.prototype)app[x] = webapp.prototype[x]
	return app
}

for(var x in host.prototype){
	webapp.prototype[x] = host.prototype[x]
}

webapp.prototype.strictPaths = function(){
	this.use(strictPathing);
	return this;
}

/**
	times out a all requests after a given time
	creates req.clearTimeout() to prevent timeout for a request
	when time out occurs req.timedout is set to true
	@time milliseconds
	@respond true/false true=sets-response-headers
*/
webapp.prototype.timeout = function(ms, options){
	if(!this.Timeout){
		this.use(this.applyTimeout.bind(this));
	}
	this.Timeout = router.timeout(ms, options)
	return this;
}

webapp.prototype.applyTimeout = function(req, res, next){
	this.Timeout(req, res, next)
}

/** always pre-load client input */
webapp.prototype.preloadClientInput = function(){
	this.use(function(req, res, next){
		ackNode.reqres(req, res).req.loadClientInput()//pre-load form and multi-part posts
		.set()//ensure nothing is passed along
		.then(next).catch(next)
	});
	return this;
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
/*
module.exports.express = router.express
module.exports.reExpress = reExpress

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