# ack-host
Common node hosting functionality to help reduce deployment of repetitious server functionality

### Table of Contents
- [Examples](#examples)
  - [Simple Example](#simple-example)
  - [Robust Example](#robust-example)
- [Documentation](#documentation)
  - [Host](#host)
  - [API](#api)
  - [Website](#website)
  - [Express](#express)
  - [Built-in Middleware](#built-in-middleware)

## Examples

### Simple Example
```
var path = require('path')
var ackHost = require('ack-host')
var options = require('./ssl-options-file.json')//adds ssl keys to options

// create http site that relocates to https
ackHost.host(80, 'webapp.com').secure()

// create https server that will serve static files on www path or relocates to www path
ackHost.host(443, 'webapp.com', options)
.static('www', path.join(__dirname,'www'))
.relocate('index.html','www/')// relocate all other requests to an index

//start hosting two ports 80 and 443
ackHost.start()
.then(config=>console.log('started on ports', Object.keys(config)))
.catch(e=>console.error('Coult Not Start Server',e))
```

### Robust Example
```
var path = require('path')
var ackHost = require('ack-host')
var options = require('./ssl-options-file.json')//adds ssl keys to options

// create http server site relocates to https
ackHost.host(80, 'webapp.com').secure()

ackHost.host(443, 'webapp.com', options)
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

//start hosting two ports 80 and 443
ackHost.start()
.then(config=>console.log('started on ports', Object.keys(config)))
.catch(e=>console.error('Coult Not Start Server',e))
```



## Documentation

### Host
Most barebones provided method of http hosting. Barely any server assumptions. Registers and returns [connect app](https://www.npmjs.com/package/connect)
```
const app = ackHost.host(port, host, options)
```

### API
Assumes timeout of 10 seconds. A 404 will be thrown when no route is matched. Registers and returns [express app](https://www.npmjs.com/package/express)
```
const app = ackHost.api(port, host, options)
```

### Website
Assumes timeout of 30 seconds. A 404 will be thrown when no route is matched. Client input such as form data, is always pre-parsed. Registers and returns [express app](https://www.npmjs.com/package/express)
```
const app = ackHost.website(port, host, options)
```

### Express
Registers and returns [express app](https://www.npmjs.com/package/express)
```
const app = ackHost.express(port, host, options)
```

### start
All sites registered with ack-host, will now be started
```
require('ack-host')
.start(port=>console.log('port started:',port))
.then(config=>console.log('all ports started:',Object.keys(config)))
```

### startOnePort
Great for forcing server to start on first available port
```
require('ack-host')
.host([8080,8081,8082])
.startOnePort(port=>console.log('Found open port:',port))
.then(config=>console.log('only one port started'))
```

### Built-in Middleware
Using on of the hosting methods above (host/api/website/express), you can invoke any of the following functionality.

#### .secure
Relocate http to https
```
app.secure()
```

#### .noRobots
WHEN route matches /\/robots\.txt$/ THEN responds with text/plain message of "User-agent: *\rDisallow: /"
```
app.noRobots(2000)
```

#### .timeout
request timeout
```
app.timeout(2000)
```

#### .static
serve static client files in directory named assets
```
app.static('www', path.join(__dirname,'www'))
```

#### .cors
enable cross origin requests from all domains
```
app.cors()
```

#### .ignoreFavors
ignore favicon like requests
```
app.ignoreFavors()
```

#### .compress
gzip responses where possible
```
app.compress()
```

#### .localNetworkOnly
Only allow local area network requests to /admin path
```
app.localNetworkOnly('/admin')
```

#### .logging
Log all requests to /admin path. Stream option not required and auto defaults to console.log aka process.stdout
```
app.logging('/admin', {stream:process.stdout})
```

#### .closeProductionErrors
if code breaks in admin path respond 500 with little info
```
app.closeProductionErrors('/admin')
```

### .consoleNonProductionErrors
if code breaks in dev path respond 500 with a lot of info
```
app.consoleNonProductionErrors('/dev')
```

### .throw
throw 500 with custom message to /xxx path requests
```
app.throw('/xxx', 'Not a place you should be!')
```

### .relocate
relocate one path
```
app.relocate('/toGoogle', 'http://google.com')
```

relocate all other requests to an index
```
app.relocate('index.html')
```
