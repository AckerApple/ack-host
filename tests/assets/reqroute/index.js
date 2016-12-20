module.exports.reqpro = function(reqres, $App, $reqpro){
	if(reqres.test!=2){
		return 'Invalid request. Index.js did not receive expected reqres variable.'
	}

	if($reqpro.test!=686){
		return 'Invalid request. Index.js did not receive expected reqpro variable.'
	}

	if(!$App || $App.name!='reqroute'){
		return 'invalid $App'
	}else{
		return 'reqroute-index.js'
	}
}