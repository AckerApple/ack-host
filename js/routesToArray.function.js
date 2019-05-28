"use strict";
exports.__esModule = true;
exports.routesToArray = function routesToArray(routes) {
    var array = [];
    routes.forEach(function (route) {
        if (!route.sample)
            return;
        var cloneRoute = Object.assign({}, route);
        cloneRoute.path = route.path.toString();
        if (route.sample) {
            var samples = routeSampleToArray(route.sample);
            cloneRoute.sample = [];
            samples.forEach(function (sample) {
                cloneRoute.sample.push(sample);
            });
        }
        array.push(cloneRoute);
    });
    return array;
};
function routeSampleToArray(routeSample) {
    var sample = routeSample();
    return sample.join ? sample : [sample];
}
