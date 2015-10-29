var id = 0;

var idHash = {};

var assignId = function (obj) {
  obj.id = id;
  idHash[id] = obj;
  id++;
};

var get = function (id) {
  return idHash[id];
};

var DFA = function (start, alphabet) {
  this.start = start;
  this.alphabet = alphabet;

  this.currentState = this.start;
  this.alphabetHash = {};
  this.alphabet.forEach(function(char) {
    this.alphabetHash[char] = true;
  }.bind(this));
}


Array.prototype.union = function (arr) {
  var occHash = {};
  var newArr = [];
  this.forEach(function (el) {
    if (!occHash[el]) {
      newArr.push(el);
      occHash[el] = true;
    };
  });
  arr.forEach(function (el) {
    if (!occHash[el]) {
      newArr.push(el);
      occHash[el] = true;
    };
  });
  return newArr;
};

Array.prototype.uniq = function () {
  return this.union([]);
}


Array.prototype.max = function () {
  var max = this[0];
  this.forEach(function (el) {
    if (el > max) {
      max = el;
    };
  });
  return max;
};

Array.prototype.min = function () {
  var min = this[0];
  this.forEach(function (el) {
    if (el < min) {
      min = el;
    };
  });
  return min;
};



var SuperStateHash = function () {
  this.hash = {};
}

SuperStateHash.prototype.put = function (array, value) {
  this.hash[SuperStateHash.toString(array.keyify())] = value;
}

SuperStateHash.prototype.get = function (array) {
  return this.hash[SuperStateHash.toString(array.keyify())];
}

SuperStateHash.toString = function (array) {
  var binaryArray = [];
  array.forEach(function (el) {
    if (binaryArray.length <= el) {
      while (binaryArray.length <= el) {
        binaryArray.push(0);
      }
    }
    binaryArray[el] = 1;
  });
  return binaryArray.join();
};

var State = function (transition, accept) {
  assignId(this);
  this._transitionGenerator = transition;
  this.accept = accept;
}

State.prototype.set = function () {
  this.transition = this._transitionGenerator();
  return this;
}

var NFA = function (start, alphabet) {
  this.start = start;
  this.alphabet = alphabet;

  this.currentState = this.start;
  this.alphabetHash = {};
  this.alphabet.forEach(function(char) {
    this.alphabetHash[char] = true;
  }.bind(this));
}

//
// var sinkState = function () {
//
// };
//
// var toSingleState = function (state) {
//
// };

Array.prototype.keyify = function () {
  return JSON.stringinfy(this.map(function (el) {
    el.id
  }));
};

Array.prototype.or = function () {
  this.reduce(function (x, y) {
    x || y;
  });
};

State.prototype.hasTransition = function (char) {
  this.set();
  return this.transition[char] && this.transition[char].length > 0;
}

NFA.prototype.eachState = function (callback) {
  this.start.span({callback: callback, alphabet: this.alphabet});
  return this;
}

//use this in DFA

State.prototype.span = function (options) {
  var queue = [];
  var cache = {};
  queue.push(this);
  cache[this.id] = true;
  while (queue.length !== 0) {
    var state = queue.shift();
    state.set();
    options.callback(state);
    if (options.epsilon) {
      var destStates = state.transition["_"];
      if (state.hasTransition("_")) {
        destStates.forEach(function (destState) {
          if (!cache[destState.id]) {
            queue.push(destState);
            cache[destState.id] = true;
          }
        });
      };
      //code is copied
    }  else {
      options.alphabet.forEach(function (char) {
        var destStates = state.transition[char];
        if (state.hasTransition(char)) {
          destStates.forEach(function (destState) {
            if (!cache[destState.id]) {
              queue.push(destState);
              cache[destState.id] = true;
            }
          });
        };
      });
      var destStates = state.transition["_"];
      if (state.hasTransition("_")) {
        destStates.forEach(function (destState) {
          if (!cache[destState.id]) {
            queue.push(destState);
            cache[destState.id] = true;
          }
        });
      };
    };
  };
};

State.prototype.epsilonIter = function (callback) {
  this.span({callback: callback, epsilon: true});
};

State.prototype.epsilonSpan = function () {
  var destState = [];
  this.epsilonIter(function (state) {
    destState.push(state);
  });
  return destState;
}

NFA.epsilonSpan = function (states) {
  return states.reduce(function (left, right) {
    return left.epsilonSpan().union(right.epsilonSpan());
  });
}

NFA.set = function (states) {
  states.forEach(function (state) {
    state.set();
  });
}


NFA.prototype.getStates = function () {
  if (!this.states) {
  var states = [];
  this.eachState(function (state) {
    states.push(state);
  });
  this.states = states;
}
  return this.states
};

NFA.prototype.getAcceptStates = function () {
    if (!this.acceptStated) {
       this.getStates();
       var acceptStates = [];
       this.states.forEach(function(state) {
           if (state.accept) {
               acceptStates.push(state);
           };
       });
       this.acceptStates = acceptStates
    };
    return this.acceptStates;
};


var MachineDerivative = function (options) {
  var alphabet = options.alphabet;
  var startStates = options.startStates;
  var cache = options.cache;
  var predicate = options.predicate;
  var span = options.span;
  var close = options.close;
  var machineType = options.machineType;

  var queue = [];
  queue.push(startStates);
  while (queue.length !== 0) {
    (function() {
    var sourceStates = queue.pop();
    close(sourceStates);
    DFA.set(sourceStates);
    var destStateMap = [];
    alphabet.forEach(function (char) {
      destStateMap.push([char, span(sourceStates, char)]);
    });
    //construct composite state transition
    var stateTransition = function () {
      var trans = {};
      destStateMap.forEach(function (pair) {
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

NFA.prototype.toDFA = function () {
  var span = function (states, char) {
    var destinations = [];
    states.forEach(function (state) {
      var destination = state.transition[char]
      if (destination) {
        destinations = destinations.union(destination)
      }
    });
    return destinations;
  }

  var sinkState =

  var cache = new SuperStateHash();
  cache.put([], sinkState);
  return MachineDerivative({
    alphabet: this.alphabet,
    startStates: NFA.epsilonSpan([this.start]),
    cache: cache,
    predicate: function (x, y) { return x || y },
    span: span,
    close: NFA.epsilonSpan,
    machineType: DFA
  });
};



var evenZeros = new State(function () {return {0: [oddZeros], 1: [evenZeros]}}, true);

var oddZeros = new State(function () {return {0: [evenZeros], 1: [oddZeros]}}, false);

var evenlyManyZeros = new NFA(evenZeros, ['0', '1']);
