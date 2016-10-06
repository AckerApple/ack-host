# ack-host
Common node hosting functionality

### Table of Contents
- [Examples](#examples)
    - [Simple Example](#simple-example)
    - [Robust Example](#robust-example)

## Examples

### Simple Example
```
var path = require('path')
var ackHost = require('ack-host')
var sslOps = require('./ssl-options-file.json')

// create http server that relocates to https
ackHost.host(80, 'website.com').secure()

// create https server that will serve static files
var sslSite = ackHost.host(443, 'website.com', sslOps)

// relocate all other requests to an index
sslSite.relocate('index.html')

//start hosting two servers
ackHost.start()
```

### Robust Example
```
var path = require('path')
var ackHost = require('ack-host')
var sslOps = require('./ssl-options-file.json')

// create http server that relocates to https
ackHost.host(80, 'website.com').secure()

// create https server that will serve static files
var sslSite = ackHost.host(443, 'website.com', sslOps)


// request timeout
sslSite.timeout(2000)

// serve static client files in directory named assets
sslSite.static('www', path.join(__dirname,'www'))

// enable cross origin requests from all domains
sslSite.cors()

// ignore favicon like requests
sslSite.ignoreFavors()

// gzip responses where possible
sslSite.compress()

// Only allow local area network requests to /admin path
sslSite.localNetworkOnly('/admin')

// Log all requests to /admin path. Stream option not required and auto defaults to console.log aka process.stdout
sslSite.logging('/admin', {stream:process.stdout})

// if code breaks in admin path respond 500 with little info
sslSite.closeProductionErrors('/admin')

// if code breaks in dev path respond 500 with a lot of info
sslSite.consoleNonProductionErrors('/dev')

// throw 500 with custom message to /xxx path requests
sslSite.throw('/xxx', 'Not a place you should be!')

// relocate one path
sslSite.relocate('/toGoogle', 'http://google.com')

// relocate all other requests to an index
sslSite.relocate('index.html')

//start hosting two servers
ackHost.start()
```

```
ackHost.website(port, host, sslOps)
```

```
ackHost.express(port, host, sslOps)
```