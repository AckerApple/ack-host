"use strict";

var ackNode = require('ack-node')

module.exports = function(reqres, err){
	var output = {}
	var jError = ackNode.error(err)

	if(err.stack){
		output.line = jError.getLineNum()
		output.stack = jError.getStackArray()
		output.name = jError.getName()
		output.objectName = jError.getFailingObjectName()
	}

	try{
		var js = JSON.stringify(output)
		reqres.res.append('<!--RawError:'+js+'-->')
	}catch(e){}

	reqres.res.append('<h2 style="margin-bottom:0;padding-bottom:0;">Error Occured Processing Request</h2>')
	reqres.res.append('<p style="padding-top:0;margin-top:0;">'+err+'</p>')
	reqres.setStatus(500,'Error Occured Processing Request').dump(output).close()
}