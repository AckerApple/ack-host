module.exports.name='reqroute'

module.exports.onRequestStart = function($scope){
	var combinedInput = $scope.req.input().combined()
	if(combinedInput.get('logout')){
		$scope.res.abort('logged out')
		return false
	}
	$scope.test = 1
}

module.exports.onFileNotFound = function(reqres, reqpath, filePath){
	reqres.appFileNotFound = 'appFileNotFound'
	return false//not handled
}

module.exports.reqpro = require('./reqpro')