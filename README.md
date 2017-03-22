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
  - [Route Metadata](#route-metadata)
  - [Testing](#testing)

## Examples

### Simple Example
```javascript
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
```javascript
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
```javascript
const app = ackHost.host(port, host, options)
```

- Arguments
  - **port** Number|Array-of-Numbers - port or ports to listen on
  - **host** String|Arrray-of-String - host names to listen for requests
  - **options** 
    - **cert** String - for ssl
    - **key** String - for ssl
    - **SNICallback** Function - for ssl


### API
Assumes timeout of 10 seconds. A 404 will be thrown when no route is matched. Registers and returns [express app](https://www.npmjs.com/package/express)
```javascript
const app = ackHost.api(port, host, options)
```

- Arguments
  - **port** Number|Array-of-Numbers - port or ports to listen on
  - **host** String|Arrray-of-String - host names to listen for requests
  - **options** 
    - **timeout** Number = 10000
    - **cert** String - for ssl
    - **key** String - for ssl
    - **SNICallback** Function - for ssl


### Website
Assumes timeout of 30 seconds. A 404 will be thrown when no route is matched. Client input such as form data, is always pre-parsed. Registers and returns [express app](https://www.npmjs.com/package/express)
```javascript
const app = ackHost.website(port, host, options)
```

- Arguments
  - **port** Number|Array-of-Numbers - port or ports to listen on
  - **host** String|Arrray-of-String - host names to listen for requests
  - **options** 
    - **timeout** Number = 10000
    - **cert** String - for ssl
    - **key** String - for ssl
    - **SNICallback** Function - for ssl

### Express
Registers and returns [express app](https://www.npmjs.com/package/express)
```javascript
const app = ackHost.express(port, host, options)
```

- Arguments
  - **port** Number|Array-of-Numbers - port or ports to listen on
  - **host** String|Arrray-of-String - host names to listen for requests
  - **options** 
    - **cert** String - for ssl
    - **key** String - for ssl
    - **SNICallback** Function - for ssl

### start
All sites registered with ack-host, will now be started
```javascript
require('ack-host')
.start(port=>console.log('port started:',port))
.then(config=>console.log('all ports started:',Object.keys(config)))
```

### startOnePort
Great for forcing server to start on first available port
```javascript
require('ack-host')
.host([8080,8081,8082])
.startOnePort(port=>console.log('Found open port:',port))
.then(config=>console.log('only one port started'))
```

### Built-in Middleware
Using on of the hosting methods above (host/api/website/express), you can invoke any of the following functionality.

#### .secure
Relocate http to https
```javascript
app.secure()
```

#### .noRobots
WHEN route matches /\/robots\.txt$/ THEN responds with text/plain message of "User-agent: *\rDisallow: /"
```javascript
app.noRobots(2000)
```

#### .timeout
request timeout
```javascript
app.timeout(2000)
```

#### .static
serve static client files in directory named assets
```javascript
app.static('www', path.join(__dirname,'www'))
```

#### .cors
enable cross origin requests from all domains
```javascript
app.cors()
```

#### .ignoreFavors
ignore favicon like requests
```javascript
app.ignoreFavors()
```

#### .compress
gzip responses where possible
```javascript
app.compress()
```

#### .localNetworkOnly
Only allow local area network requests to /admin path
```javascript
app.localNetworkOnly('/admin')
```

#### .logging
Log all requests to /admin path. Stream option not required and auto defaults to console.log aka process.stdout
```javascript
app.logging('/admin', {stream:process.stdout})
```

#### .closeProductionErrors
if code breaks in admin path respond 500 with little info
```javascript
app.closeProductionErrors('/admin')
```

### .consoleNonProductionErrors
if code breaks in dev path respond 500 with a lot of info
```javascript
app.consoleNonProductionErrors('/dev')
```

### .throw
throw 500 with custom message to /xxx path requests
```javascript
app.throw('/xxx', 'Not a place you should be!')
```

### .relocate
relocate one path
```javascript
app.relocate('/toGoogle', 'http://google.com')
```

relocate all other requests to an index
```javascript
app.relocate('index.html')
```

## Route Metadata
Create route explanation and defintions using GET, POST, PUT, DELETE or USE metadata.

### .meta()
- **details** String - route descriptive details
- **sample**
  - **params** Object - Key value pair to fill in path :params
  - **request** String|Object|Array|Function - request body to be used with sample test. When Function, the function is called for its request body data
  - **response** String|Function-Returns-String - response body to be used to fake a server response during sample testing
  - **test** Boolean|Object
    - **cases** Array-of-Functions|Function(response,assert)
    - **only** Boolean
    - **skip** Boolean
    - **timeout** Number = 2000 - how long to wait before test is aborted

Route Metadata Example
```javascript
const ackHost = require('ack-host')
const port = 3000

//create arbitrary server
const app = ackHost.api(port).logging().timeout(2000).cors()

app.get('/index.html', ackHost.router.respond('you have come to the right place'))
.meta({
  details:"main page of our website",
  sample:()=>({
    test:{
      only:true,
      cases:[(response,assert)=>{
        assert.equal(response.body, 'you have come to the right place')
      }]
    }
  })
})

app.get('/admin/index.html', ackHost.router.respond('you have come to the admin'))
.meta({
  details:"admin page of our website",
  sample:()=>({
    test:{skip:true},
    cases:(response,assert)=>{
      assert.equal(response.body, 'you have come to the right place')
    }
  })
})

app.get('/:id/data.json', (req,res)=>res.json({hello:'world '+req.params.id}))
.meta({
  details:"main page of our website",
  sample:()=>({
    test:{
      only:false, skip:false,
      params:{id:234},
      cases:[(response,assert)=>{
        assert.equal(response.body, '{"hello":"world 234"}')
      }]
    }
  })
})
```


## Testing
Test server apps registered through ack-host

### Testing Options
- port   : Number = all-ports
- host   : String = localhost
- method : String (GET|POST|PUT|DELETE)
- logTo  : Object = console.log - not yet implemented

### Large Test Example
```javascript
const ackHost = require('ack-host')
const port = 3000

//create arbitrary server
const app = ackHost.api(port).logging().timeout(2000).cors()

app.use(/\/robots\.txt/, ackHost.router.noRobots())
.meta({
  details:"prevents robots from crawling our site",
  sample:()=>({
    path:"/robots.txt",
    test:true
  })
})

app.get('/index.html', ackHost.router.respond('you have come to the right place'))
.meta({
  details:"main page of our website",
  sample:()=>({
    test:true
  })
})

app.use( ackHost.router.relocate('/index.html') )
.meta({
  details:"redirects users to our index page",
  sample:()=>({
    test:true
  })
})

ackHost.startAndTest()
.then(results=>{
  console.log('Finished Testing Ports:', Object.keys(results))
  
  for(var port in results){
    console.log('Port Passing', port, results[port].passing.length)
    console.log('Port Failing', port, results[port].failing.length)
  }
})
.catch(e=>console.error('Coult Not Start and Test Server',e))
```

### Start Server and Test
Will start ack-host server and then test all defined server apps
```javascript
ackHost.startAndTest(options)
```

### Test Server Already Running
Will test all defined apps against already running server
```javascript
ackHost.test(options)
```

### Test Server Already Running With Limited Routes by Apps
Will test provided apps against already running server
```javascript
ackHost.testApps(apps,options)
```