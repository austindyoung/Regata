var MachineDerivative = function (options) {
  var alphabet = options.alphabet;
  var startStates = options.startStates;
  var predicate = options.predicate;
  var span = options.span;
  var extendSourceStates = options.extendSourceStates;
  var machineType = options.machineType;

  var cache = new SuperStateHash();
  var queue = [];
  queue.push(startStates);
  while (queue.length !== 0) {
    (function() {
    var sourceStates = queue.pop();
    extendSourceStates(sourceStates);
    DFA.set(sourceStates);
    var destStateMap = [];
    alphabet.forEach(function (char) {
      destStateMap.push([char, span(sourceStates, char)]);
    });
    //construct composite state transition
    var stateTransition = function () {
      var trans = {};
      destStateMap.forEach(function (pair) {
        trans[pair[0]] = cache.get(pair[1].keyify())
        trans[pair[0]] = cache.get(pair[1])
      })
      return trans;
    };

    //construct composite state
    var sourceState = new State(stateTransition, sourceStates.reduce(function (x, y) {
      return predicate(x.accept, y.accept);
    }));

    //cache composite state
    cache.put(sourceStates, sourceState);
    destStateMap.forEach(function (pair) {
      var destStates = pair[1];
        if (!cache.get(destStates)) {
        queue.push(destStates);
      };
    })
  })();
  }
  return new machineType(cache.get(startStates), alphabet);
};
