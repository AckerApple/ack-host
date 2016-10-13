"use strict";
var assert = require('assert'),
		ackHost = require('../../index'),
		ackNode = require('ack-node'),
		path = require('path')

function testResponse(body, res){
	if(res.headers && res.headers.message){
//console.log( JSON.parse(res.body) )
		throw new Error('request errored with message: '+res.headers.message)
	}
}

describe('ackHost',function(){
	this.timeout(4000)
	describe('#create-server',function(){
		var web, webroot, portStruct, testVhost

		beforeEach(function(){

			web = ackHost//.consoleAll()
			web.data.consoleNonProductionErrors = false//console errors not needed during tests

			/* config web server */
				//vhost test
				testVhost = web.website(3000,['local.test.com','local.test2.com']).timeout(150)

				var success = function(reqres){
					assert.equal(typeof(reqres), 'object')
					assert.equal(typeof(reqres.isHtml), 'function')
				}
				var reqRoutePath = path.join(__dirname,'../assets/reqroute/')
				var viewRoutePath = path.join(__dirname,'../assets/viewroute/')
				var staticPath = path.join(__dirname,'../assets/static/')

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

				//Test vhost 2
				testVhost = web.host(3000,'local.test2.com')
				testVhost.use(function(req,res,next){
					res.$.append('you have reached: local.test2.com:3000')
					//ackNode.reqres(req, res).res('you have reached: local.test2.com:3000')
					next()
				})

				//vhost test
				testVhost = web.host(3001,'local.test3001.com')
				testVhost.use(function(req,res,next){
					ackNode.reqres(req,res).output('you have reached: local.test.com:3001')
					//ackNode.reqres(req, res).res('you have reached: local.test.com:3001')
					next()
				})
			/* end: configure web server */

			portStruct = web.data.portStruct
		})

		it('port-count',function(){
			assert.equal(web.getPortCount(),2)
			assert.equal(Object.keys(portStruct).length,2)
		})

		describe('#send',function(){
			var testArray,req
			beforeEach(function(done){
				testArray = []
				req = ackNode.req().setUrl('http://localhost:3000')
				web.start(function(port,server){
					testArray.push(arguments)
				})
				.then(function(app, portStruct){})
				.then(done)
				.catch(done)
			})

			afterEach(function(done){
				web.stop().then(done).catch(done)
			})

			it('started',function(){
				assert.equal(web.isOn(),true)
				testArray.forEach(function(v,i){
					assert.equal(typeof(v[0]),'number','port '+v[0]+' is not a number')
					assert.equal(typeof(v[1]),'object')
				})
			})

			it('responds',function(done){
				req.send()
				.past(testResponse)
				.then(function(body,res){
					var failMsg = 'unexpected response from local.test.com:3000';
					var expec = 'you have reached: local.test.com:3000'
					return ackNode.req().send('http://localhost:3001')
				})
				.past(testResponse)
				.then(function(body,res){
					var tof = typeof(body)
					var expect = 'you have reached: local.test.com:3001'
					assert.equal(tof,'string')
					assert.equal(body.length, expect.length)
					assert.equal(body, expect)
				})
				.then(done).catch(done)
			})

			it('throws',function(done){
				req.send('/error')
				.then(function(body,res){
					assert.equal(res.headers.message,'this is an error test of local.test.com:3000')
				})
				.then(done).catch(done)
			})

			it('setCookie',function(done){
				req.send('/setCookie')
				.past(testResponse)
				.then(function(body, res, req){
					var cookies = res.headers['set-cookie']
					assert.equal(typeof(cookies),'object')
					assert.equal(cookies.length,2)
					assert.equal(cookies[0].substring(0, 9),'test22=22')
					assert.equal(res.getCookieObject().test22,'22')
					assert.equal(res.getCookieObject().test33,'33')
				})
				.then(done).catch(done)
			})

			it('echos',function(done){
				req
				.post('test11',22)
				.post({test22:22})
				.var('test0',0).var({test33:33, test11:33})
				.header('test44','44').header('test55','55')
				.setAuthBearer('make-fake-jwt-token')
				.cookie('tester','33').cookie({tester66:66})
				.send('/echo?empty-string')
				.past(testResponse)
				.then(function(body, res){
					body = JSON.parse(body)
					assert.equal(body.cookies.tester, 33)
					assert.equal(body.cookies.tester66, 66)
					assert.equal(body.headers.test55, 55)
					assert.equal(body.combined.test11, 22, 'echo combined url/post variables did not combine right')
					assert.equal(body.combine.test11, 22)//, 'echo custom combine variables did not combine right'
					assert.equal(body.combine.test44, 44, 'echo custom combine header variables did not combine right')
					assert.equal(body.authBearer, 'make-fake-jwt-token')
					assert.equal(22,body.posts.test22)
					assert.equal(33,body.urls.test33)
					assert.equal('',body.urls['empty-string'])
					assert.equal('/echo',body.path)
				})
				.then(done).catch(done)
			})

			it('timeout',function(done){
				req
				.send('/timeout')
				.then(function(body, res){
					assert.equal(res.statusMessage,'Response timeout')
					assert.equal(res.statusCode, 503)
					setTimeout(done, 220)//time to allow the /timeout request to do its after-timeout
				})
				.catch(done)
			})

			describe('#static',function(){
				it('works',function(done){
					req
					.send('/static')
					.past(testResponse)
					.then(function(body, res){
						var maxAge = Number(res.headers['cache-control'].split('=')[1])
						assert.equal(maxAge,0)

						var expected = 'static'
						assert.equal(body, expected)
					})
					.then(done).catch(done)
				})
			})

			describe('viewroute',function(){
				it('works',function(done){
					req
					.send('/viewroute/index.jade?world=World')
					.past(testResponse)
					.then(function(body, res){
						var expected = 'Hello World'
						assert.equal(body, expected)
					})
					.then(done).catch(done)
				})
			})

			describe('reqroute',function(){
				it('index',function(done){
					req
					.send('/reqroute/index.js')
					.past(testResponse)
					.then(function(body, res){
						var expected = 'reqroute-index.js'
						assert.equal(body.length, expected.length)
					})
					.then(done).catch(done)
				})

				it('badIndex',function(done){
					req
					.send('/reqroute/badIndex.js')
					.then(function(body, res){
						assert.equal(res.statusCode, 404)
						//statusMessage
					})
					.then(done).catch(done)
				})

				it('nonExistingIndex',function(done){
					req
					.send('/reqroute/nonExistingIndex.js')
					.then(function(body, res){
						assert.equal(res.statusCode, 404)
						//statusMessage
					})
					.then(done).catch(done)
				})

				it('relocate',function(done){
					req.send('/relocate', {followRedirect:false})
					.then(function(body, res){
						assert.equal(res.statusCode, 301)
						assert.equal(res.headers.location, 'http://google.com')
					})
					.then(done).catch(done)
				})

				it('respond',function(done){
					req.send('/respond')
					.then(function(body, res){
						assert.equal(body, 'pre-made-response')
					})
					.then(done).catch(done)
				})

				it('logout',function(done){
					req
					.send('/reqroute/index.js?logout=1')
					.past(testResponse)
					.then(function(body, res){
						var expected = 'logged out'
						assert.equal(body.length, expected.length)
					})
					.then(done).catch(done)
				})

				it('reqres-logout',function(done){
					req
					.send('/reqroute/index.js?reqres-logout=1')
					.past(testResponse)
					.then(function(body, res){
						var expected = 'reqres-logged out'
						assert.equal(body.length, expected.length)
					})
					.then(done).catch(done)
				})
			})

			it('stops',function(done){
				web.stop().then(function(){
					assert.equal(web.isOn(),false)
				})
				.then(done).catch(done)
			})
		})
	})
})