//const ackHost = require('../index.js')
const testSite = require('./testRoutes.function')

//console.log('ackHost', ackHost.host(6000))

module.exports = function(ackHost, portConfig, options){
  options = options || {}
  
  const rtn = {}
  let promise = Promise.resolve()
  let ports = Object.keys(portConfig)
  let starter = ()=>ackHost.start(onPort)

  if(options.port){
    ports = [options.port]
    starter = ()=>ackHost.startPort(options.port).then(()=>onPort(options.port))
  }

  promise = promise.then(()=>starter())
  .then(options=>ackHostMsg('server fully started'))

  ports.forEach(port=>{
    portConfig[port].appArray.forEach(site=>{
      const ops = Object.assign({}, options)//clone
      ops.port = port
      promise = promise.then(()=>testSite(site,ops))
      .then(results=>rtn[port]=results)
    })
  })

  const stop = function(){
    return ackHost.stop()
    .then(()=>ackHostMsg('server stopped'))
    .catch(e=>{
      ackHostMsg('error stopping server')
      console.error(e)
    })
  }

  return promise
  .then(stop)
  .catch(e=>{
    stop()
    console.log(e)
  })
  .then(()=>rtn)
}

function onPort(pNum){
  ackHostMsg('started port:',pNum)
}

function ackHostMsg(msg){
  const args = Array.prototype.slice.apply(arguments)
  args.unshift('\x1b[34mack-host:\x1b[0m')
  console.log.apply(console, args)
}