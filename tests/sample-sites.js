var path = require('path')
var ackNode = require('ack-node')
var assert = require('assert')

module.exports = function(web){  
  //vhost test
  const testVhost = web.website([3000,3001],['local.test.com','local.test2.com']).timeout(150)

  var success = function(reqres){
    assert.equal(typeof(reqres), 'object')
    assert.equal(typeof(reqres.isHtml), 'function')
  }
  var testAssetPath = path.join(__dirname,'assets')
  var reqRoutePath = path.join(testAssetPath,'reqroute')
  var viewRoutePath = path.join(testAssetPath,'viewroute')
  var staticPath = path.join(testAssetPath,'static')

  testVhost.static('/static', staticPath)
  testVhost.new.RequestRoutePath('/reqroute', reqRoutePath, success)
  testVhost.new.ViewRoutePath('/viewroute', viewRoutePath, success)

  testVhost.use('/timeout', function(req, res, next){
    setTimeout(next, 200)//after request should have timedout, continue
  })

  testVhost.get('/error',function(req,res){
    ackNode.reqres(req, res).res.throw('this is an error test of local.test.com:3000')
  })

  testVhost.relocate('/relocate', 'http://google.com')
  testVhost.respond('/respond', 'pre-made-response')

  testVhost.use('/echo',function(req,res,next){
    var reqres = ackNode.reqres(req, res)
    reqres.req.clientInput()
    .then(function(ci){
      var rtn={
        urls       : ci.url().data,
        posts      : ci.form().data,
        cookies    : ci.cookies().all(),
        path       : reqres.req.Path().getString(),
        headers    : ci.headers().data,
        combined   : ci.combined().data,
        authBearer : ci.getAuthBearer(),
        combine    : ci.combine('cookie','header','url','form').data
      }
      var string = JSON.stringify(rtn)
      var r = reqres.output(string).send()
    })
    .catch(function(err){
      console.error('error performing echo', err)
      next(err)
    })
  })

  testVhost.use('/setCookie',function(req, res, next){
    var reqres = ackNode.reqres(req, res)


    reqres.req.loadClientInput()
    .then(function(reqClientInput){
      reqClientInput.cookies().set('test22','22').set('test33','33')

      var rtn={
        urls  : reqClientInput.url().data,
        path  : reqres.req.Path().getString()
      }

      rtn.posts = reqClientInput.form().data
      reqres.res.send( JSON.stringify(rtn) )
    })
    .catch(next)
  })

  testVhost.use('/', function(req,res,next){
    //res.$('you have reached: local.test.com:3000')
    ackNode.reqres(req, res).abort('you have reached: local.test.com:3000')
    //next()
  })

  return testVhost
}