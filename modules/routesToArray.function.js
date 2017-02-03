module.exports = function rotuesToArray(routes){
  const array = []
  
  routes.forEach(route=>{
    if(!route.sample)return
    const cloneRoute = Object.assign({}, route)
    
    cloneRoute.path = route.path.toString()
    
    if(route.sample){
      const samples = routeSampleToArray(route.sample)
      cloneRoute.sample = []
      samples.forEach(sample=>{
        cloneRoute.sample.push( sample )
      })
    }

    array.push(cloneRoute)
  })

  return array
}

function routeSampleToArray(routeSample){
  const sample = routeSample()
  return sample.join ? sample : [sample]
}
