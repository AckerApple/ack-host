"use strict";
var	 ackNode = require('ack-node')//used for path crawling
	//,reqrtn = require('../reqres/req')//Request Return : Object to handle processing request (process client input, uploads, paths)
	,reqresRes = require('ack-node/modules/reqres/res')
	,vhost = require('vhost')
	,https = require('https')
	,webapp = require('./webapp')
	,tls = require('tls')
	,express = require('express')


/**
	request object CLASS
	@scope: isClearRequires, consoleAll
*/
var web = function web(){
	this.data = {}
	this.data.portStruct = this.data.portStruct || {}
	this.data.routers = {}

	this.data.isClearRequires = this.data.isClearRequires || this.isProductionMode
	this.data.consoleAll = this.data.consoleAll
	this.data.consoleNonProductionErrors = true

	return this
}

web.app = webapp.webapp

web.prototype.consoleAll = function(logger){
	this.data.routers.consoleAll = webapp.consoleAll(logger)
	return this
}

web.prototype.getRunningMode = function(){
	if(this.data.isProductionMode)return 'PRODUCTION'
	return process.env.NODE_ENV
}

web.prototype.isProductionMode = function(yesNo){
	if(yesNo!=null){
		this.data.isProductionMode = yesNo
		return yesNo
	}
	if(this.data.isProductionMode!=null)return this.data.isProductionMode
	return (this.getRunningMode() || 'development').toLowerCase() == 'production'
}

//web.prototype.routers = webapp

web.prototype.getExpress = function(){
	return express
}

web.prototype.registerApp = function(app, portOrArray, host, sslOps){
	if(portOrArray && portOrArray.constructor==Array){
		for(var x=0; x < portOrArray.length; ++x){
			this.registerOneApp(app, portOrArray[x], host, sslOps)
		}
	}else{
		this.registerOneApp(app, portOrArray, host, sslOps)
	}

	return this
}

/**
	@app - any connect/express like app with use/get/put/post/all methods
	@port - single port or multiple port array
	@host - domain host name or array of host names
	@sslOps - {SNICallback, cert, key}
*/
web.prototype.registerOneApp = function(app, port, host, sslOps){
	var portStruct = this.paramPortStruct(port)

	portStruct.appArray.push(app)//catalog app

	if(app.isProductionMode){
		app.isProductionMode( this.isProductionMode() )//pass production mode status along
	}

	app.use( reqresnext(this) )//every request is touched by web processor

	//when engaged by request, ensure default app does not run by setting host-name
	app.use(function(req,res,next){
		res.ackHostHosted = host || port//let the main app know a vhost||port picked up the request and not to run default app
		next()
	})

	if(host){
		if(host.constructor==String){//cast host string to host array. single-host versus !multi-host-array
			host = [host]
		}
		host.forEach(function(hostName,i){
			portStruct.hostArray.push(hostName)
			var vRoute = vhost(hostName, app)
			portStruct.rootApp.use(vRoute)//request processor(analyze host-name for processing
		})
	}

	if(sslOps){
		if(host){
			portStruct.multiSslArray.push({hostNameArray:host, sslOps:sslOps})
		}

		if(!portStruct.sslOps){
			portStruct.sslOps = sslOps
		}
	}

	return this
}

//returns connect-package app. args: portNumber, virtualHostName (does not pre-load clientInput)
web.prototype.host = function(port, host, sslOps){
	var app = new webapp.host()//connect app WITH addons
	this.registerApp(app, port, host, sslOps)
	return app
}

/** returns express app. (does not pre-load clientInput) */
web.prototype.api = function(port, host, sslOps){
	var app = new webapp.reExpress()
	.strictPaths()
	//.preloadClientInput()
	.timeout(10000)

	app.beforeStart = function(){
		app.use( ackNode.router().notFound() )
	}
	
	this.registerApp(app, port, host, sslOps)

	return app
}

//same as host but always pre-loads clientInput
web.prototype.website = function(port, host, sslOps){
	var app = new webapp.webapp()
	.strictPaths()
	.preloadClientInput()
	.timeout(30000)

	app.beforeStart = function(){
		app.use( ackNode.router().notFound() )
	}

	this.registerApp(app, port, host, sslOps)

	return app
}

web.prototype.startOnePort = function(each,options={}){
	options.portStartCount = 1
	return this.start(each,options)
}

//each(portNum, server, rootApp, portStruct) = as each port is started
web.prototype.start = function(each, options={}){
	each = each || function(){}//function to call with each starting port

	var portNumArr = Object.keys(this.data.portStruct)
	let promise = ackNode.promise().bind(this)

	if(options.portStartCount){
		let pos = 0
		const rotator = function(){
			if(pos>portNumArr.length){
				throw 'ran out of ports'
			}

			return this.startPort(portNumArr[pos])
			.then(server=>[server])
			.catch(e=>{
				++pos
				return rotator()
			})
		}
		
		promise = promise.then(rotator)
	}else{
		promise = promise.map(portNumArr, this.startPort)
	}

	return promise
	.map(function(array){
		var portNum = array[0], portStruct = array[1]
		each(portNum, portStruct.server, portStruct.rootApp, portStruct)
	})
	.set(this.data.portStruct)
}

web.prototype.startPort = function(portNum){
	portNum = Number(portNum)
	var portStruct = this.data.portStruct[portNum]

	//ports default app
	if(portStruct.appArray.length){
		var defApp = portStruct.appArray[0]
		portStruct.rootApp.use(function(req,res,next){
			if(!res.ackHostHosted){//indicator of vhost processing, not present, run Default-App
				defApp(req,res,next)
			}else{
				next()
			}
		})
	}

	portStruct.appArray.forEach((v,i)=>{
		if(v.beforeStart){
			v.beforeStart()
		}
	})

	if( !this.isProductionMode() && this.data.consoleNonProductionErrors ){
		//console.log('--Non-Production-Mode-Detected (mode='+this.getRunningMode()+'): All request errors will be console logged.')
		portStruct.rootApp.use( ackNode.router().consoleNonProductionErrors() )
	}

	//request closing
	portStruct.rootApp.use(reqresRes.geterrhan())
	portStruct.rootApp.use(function(req,res,next){
    if(!res.closed && !res._headerSent){
      ackNode.reqres(req,res).abort();
    }
  })

	if(portStruct.sslOps){
		var sslOps = portStruct.sslOps

		/* DYNAMIC SSL */
			var isSniMode = portStruct.multiSslArray.length > 1
			if(isSniMode){
				if(portStruct.sslOps.SNICallback){//already exist?
					var sslOps = {}//ensure sslOps.SNICallback won't be overwritten on original scope. If two ports start a server, the last one would always be the SNI responder for all request (bad)
					for(var key in portStruct.sslOps){
						sslOps[key] = portStruct.sslOps[key]
					}
				}
				sslOps.SNICallback = getSniCallbackForPort(portNum, this)
			}
		/* END: DYNAMIC SSL */

		var tApp = https.createServer(sslOps, portStruct.rootApp)
	}else{
		var tApp = portStruct.rootApp
	}

	return ackNode.promise().bind(tApp).set()
	.callback(function(callback){
		
		//portStruct.server = tApp.listen(portNum,'0.0.0.0',function(err,data){
		portStruct.server = tApp.listen(portNum,'0.0.0.0',undefined,callback)
		
		portStruct.server.on('error',function(e){
			console.log('i got the error33',e)
		})
	})//start the http.listen protcol on a certain port, with IPV4, and with a start-up-complete callback
	.then(function(){
		//tell all apps we have started
		portStruct.appArray.forEach(function(v,i){
			v.events.emit('start', portStruct.server)
		})
	})
	.set([portNum, portStruct])
}

function getSniCallbackForPort(portNum, hostApp){
	return function(domain, callback){
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
		var portStruct = hostApp.data.portStruct[portNum]
		for(var msa=0; msa < portStruct.multiSslArray.length; ++msa){
			var hostConfig = portStruct.multiSslArray[msa]
			for(var hna=0; hna < hostConfig.hostNameArray.length; ++hna){
				if(hostConfig.hostNameArray[hna].toLowerCase() == domain.toLowerCase()){
					var ssl = tls.createSecureContext(hostConfig.sslOps).context
					return callback(null, ssl)
				}
			}
		}
		//var ssl = crypto.createCredentials(hostConfig.sslOps).context
		var ssl = tls.createSecureContext(portStruct.sslOps).context
		callback(null, ssl)
	}
}

web.prototype.stop = function(each){
	const ps = this.data.portStruct
	const keys = Object.keys(ps)
	let stopped = keys.length

	return ackNode.promise()
	.next(function(next){
		
		function closer(){
			if(stopped==0){
				next()
			}
		}

		keys.forEach(function(v,i){
			if(!ps[v].server){
				--stopped
				if(!stopped){
					next()
				}
				return//nothing to stop here
			}

			ps[v].appArray.forEach(function(v,i){
				v.events.emit('stop',v.server)
			})

			ps[v].server.close(function(){
				--stopped
				var server = ps[v].server

				delete ps[v].server

				if(each)each(v)

				closer()
			})
		})
	})
}

web.prototype.getPortCount = function(){
	return Object.keys(this.data.portStruct).length
}

/** returns portnumber of port that is still on */
web.prototype.isOn = function(){
	var portNum,i,portKeys = Object.keys(this.data.portStruct)

	if(!this.data.portStruct || !portKeys.length)return 0

	for(i=0; i < portKeys.length; ++i){
		portNum = portKeys[i]
		if(this.data.portStruct[portNum].server){
			return portNum
		}
	}

	return false
}

web.prototype.paramPortStruct = function(port){
	if(this.data.portStruct[port])return this.data.portStruct[port]

	this.data.portStruct[port]={
		appArray:[], hostArray:[], sslOps:null, multiSslArray:[],
		rootApp:new webapp.host()//.use(this.getreqhan())
	}
	return this.data.portStruct[port]
}

web.prototype.dropPorts = function(){
	this.data.portStruct = {};
}






function reqresnext(iWeb){
	return function(req,res,next){
		return ackNode.promise().map(iWeb.data.routers, function(value, key, len){
			return ackNode.promise().callback(function(callback){
				return value(req,res,callback)
			})
		})
		.set().then(next).catch(next)
	}
}






module.exports = new web()
//module.exports.Class = web