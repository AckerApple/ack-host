"use strict";
var ackHost = require('../../index')


var web = ackHost()

var website = web.website([3000,80])
.use(function(req, res, next){
	var reqres = ackHost.reqres(req,res)

	console.log('method', reqres.req.getMethod())

	console.log('headers', reqres.input.headers().data)

	var reqBodyDump = {typeof:typeof(req.body), value:req.body}
	console.log('req.body', reqBodyDump)

	var body = JSON.stringify(reqBodyDump)
	res.end(body)//next()
})

web.start().then(function(){
	console.log('started')
})