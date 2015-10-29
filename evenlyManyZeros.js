var evenZeros = new state(function () {return {0: oddZeros, 1: evenZeros}}, true)

var oddZeros = new state(function () {return {0: evenZeros, 1: oddZeros}}, false)

// var evenZeros = function () {
//     return {transition: {0: oddZeros, 1: evenZeros}, accept: true}
// }

// var oddZeros = function () {
//     return {transition: {0: evenZeros, 1: oddZeros}, accept: false}
// }

var evenlyManyZeros = {
    start: evenZeros
}
