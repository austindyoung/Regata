
var evaluate = function (seq, machine) {
    var currentState = machine.start
    console.log(seq.length);
    seq.forEach(function(char) {
        currentState = currentState.transition[char];
    })
    return currentState.accept;
};


var create = function (graph) {
    var staging = {};
    return function () {
    graph.forEach(function(proto, i) {
        staging[i.toString()] = new state(
        proto.forEachfunction(map, j) {

        }
    })
    }
}
