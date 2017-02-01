var path = require('path')
var ackHost = require('../index')//require('ack-host')
//var sslOps = require('./ssl-options-file.json')

// create http server that relocates to https
ackHost.host(8080, 'website.com').secure()

// create https server that will serve static files
var sslSite = ackHost.host(8081, 'website.com')//, sslOps)
.logging()
.noRobots()
.timeout(2000)
.cors()
.static('www', path.join(__dirname,'www'))
.ignoreFavors()
.compress()
.logging('/admin', {stream:process.stdout})
.localNetworkOnly('/admin/index.html')
.respond('/admin/index.html', 'You have come to the admin place')
.closeProductionErrors('/admin')
.consoleNonProductionErrors('/dev')
.throw('/test-error-throw', 'Not a place you should be!')
.relocate('/toGoogle', 'http://google.com')
.respond('/index.html','you have come to the right place')
.relocate('/index.html')

//start hosting two servers
ackHost.start()
.then(config=>console.log('started on ports', Object.keys(config)))
.catch(e=>console.error('Coult Not Start Server',e))