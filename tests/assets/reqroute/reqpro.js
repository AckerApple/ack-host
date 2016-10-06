"use strict";

module.exports = function(reqres, app){
	return new Reqres(reqres, app)
}

var Reqres = function Reqres(reqres, app){
	this.reqres = reqres
	this.app = app
	this.test = 686

	var combinedInput = reqres.req.input().combined()
	if(combinedInput.get('reqres-logout')){
		reqres.res.abort('reqres-logged out')
		return false
	}

	reqres.test = reqres.test + 1

	return this
}

Reqres.prototype.onFileNotFound = function(reqpath, filePath){
	this.reqres.fileNotFound = 'fileNotFound'
	return false//not handled
}

