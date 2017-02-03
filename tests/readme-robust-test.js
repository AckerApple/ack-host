const ackHost = require('../index')
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
