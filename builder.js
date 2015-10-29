

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

Array.prototype.unionById = function (arr) {
  var occHash = new SuperStateHash();
  var newArr = [];
  this.forEach(function (el) {
    if (!occHash.get([el])) {
      newArr.push(el);
      occHash.put([el], true);
    };
  });
  arr.forEach(function (el) {
    if (!occHash.get([el])) {
      newArr.push(el);
      occHash.put([el], true);
    };
  });
  return newArr;
};

Array.prototype._unionById = function (arr) {
  var occHash = new SuperStateHash();
  this.forEach(function (el) {
    occHash.put([el], true);
  });
  arr.forEach(function (el) {
    if (!occHash.get([el])) {
      this.push(el);
      occHash.put([el], true);
    };
  }.bind(this));
  return this
};

Array.prototype.uniq = function () {
  return this.union([]);
};

Array.prototype.keyify = function () {
  return this.map(function (el) {
    return el.id;
  })
};

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



String.prototype.parseIntArray = function () {
  return this.split(',').map(function (el) {
    return el.parseInt();
  });
};

String.prototype.parseStateSet = function () {
  return new Set(this.parseIntArray().map(function (int) {
    return get(int);
  }));
};

var Matrix = function (height, width) {
  this.matrix = [];
  for (var i = 0; i < height; i++) {
  var row = []
  this.matrix.push(row);
    for (var j = 0; j < width; j++) {
      row.push(0);
    };
  };
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

var DFA = function (start, alphabet) {
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

DFA.set = function (states) {
  states.forEach(function (state) {
    state.set();
  });
}

DFA.prototype.eachState = function (callback) {
  var queue = [];
  var cache = {};
  queue.push(this.start);
  cache[this.start.id] = true;
  while (queue.length !== 0) {
    var state = queue.shift();
    state.set();
    callback(state);
    this.alphabet.forEach(function (char) {
      var destState = state.transition[char];
      if (!cache[destState.id]) {
        queue.push(state.transition[char]);
        cache[destState.id] = true;
      };
    });
  };
  return this;
};

DFA.prototype.getStates = function () {
  if (!this.states) {
  var states = [];
  this.eachState(function (state) {
    states.push(state);
  });
  this.states = states;
}
  return this.states
};

DFA.prototype.getAcceptStates = function () {
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

DFA.prototype.transition = function (char) {
  if (!this.currentState.transition) {
    this.currentState.transition = this.currentState._transitionGenerator();
    var inAlphabet = true;
    this.alphabet.forEach(function(char) {
      if (!this.currentState.transition[char]) {
        inAlphabet = false;
        return;
      }
    }.bind(this))
    if (!inAlphabet) {
      throw 'missing transition';
    }
  }
  this.currentState = this.currentState.transition[char];
}

DFA.prototype.evaluate = function (str) {
  var outsideAlphabet = false;
  str.split('').forEach(function(char) {
    if(!this.alphabetHash[char]) {
      outsideAlphabet = true;
      return
    }
    this.transition(char);
  }.bind(this));
  if (outsideAlphabet) {
    throw 'input outside of alphabet';
  };
  var accepting = this.currentState.accept;
  this.currentState = this.start;
  return accepting;
};

var span = function (states, char) {
  var destinations = [];
  states.forEach(function (state) {
    destinations.push(state.transition[char]);
  });
  return destinations;
};
//
var CombinerBinary = function (dfa1, dfa2, predicate) {
  var span = function (states, char) {
    var destinations = [];
    states.forEach(function (state) {
      var destination = state.transition[char]
      if (destination) {
        destinations.push(state.transition[char]);
      }
    });
    return destinations;
  };

  return MachineDerivative({
    alphabet: dfa1.alphabet.union(dfa2.alphabet),
    startStates: [dfa1.start, dfa2.start],
    cache: new SuperStateHash(),
    predicate: predicate,
    span: span,
    close: function () {},
    transform: function (x) {return x},
    machineType: DFA
  })
};

var MachineDerivative = function (options) {
  var alphabet = options.alphabet;
  var startStates = options.startStates;
  var cache = options.cache;
  var predicate = options.predicate;
  var span = options.span;
  var close = options.close;
  var transform = options.transform;
  var machineType = options.machineType;

  // var cache = new SuperStateHash();
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
        trans[pair[0]] = transform(cache.get(pair[1]));
      })
      return trans;
    };

    //construct composite state
    var sourceState = new State(stateTransition, sourceStates.map(function (state) {
      return state.accept;
    }).reduce(predicate));

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


var Combiner = function () {
  var args = Array.prototype.slice.call(arguments);
  var dfas = args.slice(1)
  var op = args[0];
  return dfas.reduce(function (x, y) {
    return CombinerBinary(x, y, op);
  });
};

DFA.prototype.union = function (dfa) {
  return CombinerBinary(this, dfa, function (x, y) {
    return x || y;
  });
};

DFA.prototype.intersect = function (dfa) {
  return CombinerBinary(this, dfa, function (x, y) {
    return x && y;
  });
};

DFA.prototype.takeAway = function (dfa) {
  return CombinerBinary(this, dfa, function (x, y) {
    return x && !y;
  });
};

DFA.prototype.algebraify = function () {
 return FAAR.algebraify(this);
};

DFA.union = function () {
  var dfas = Array.prototype.slice.call(arguments);
  dfas.unshift(function (x, y) {
    return x || y;
  });
  return Combiner.apply(undefined, dfas);
};

DFA.prototype.toNFA = function () {
  return MachineDerivative({
    alphabet: this.alphabet,
    startStates: [this.start],
    cache: new SuperStateHash(),
    predicate: function () {},
    span: function (state, char) {
      state[0].set();
      return [state[0].transition[char]];
    },
    close: function () {},
    transform: function (state) { return [state] },
    machineType: NFA
  });
};

DFA.prototype.set = function () {
  this.eachState(function (state) {
    state.set();
  });
};

//finite automaton algebraic representation
var FAAR = function (numStates, transitions, startKey, alphabet, acceptStates) {
  this.numStates = numStates;

  // { a: matrixa, b: matrixb, ... }
  this.transitions = transitions;
  this.startKey = startKey;
  this.alphabet = alphabet;
  this.acceptStates = {};
  acceptStates.forEach(function (key) {
    this.acceptStates[key] = true;
  }.bind(this));
};

FAAR.algebraify = function (dfa) {
  var states = dfa.getStates();
  var statesMap = {};
  states.forEach(function (state, i) {
    statesMap[state.id] = i;
  });
  var alphabet = dfa.alphabet;
  var transitions = {};

  alphabet.forEach(function (char) {
    var transition = [];
    transitions[char] = transition;
    for (var i = 0; i < states.length; i++) {
      var stateRow = [];
      transition.push(stateRow);
      for (var j = 0; j < states.length; j++) {
        stateRow.push(0);
      };
    };
  });

   alphabet.forEach(function (char) {
     var transition = transitions[char];
     states.forEach(function (state, i) {
      var destStateKey = statesMap[state.transition[char].id];
      transition[i][destStateKey] = 1;
     });
   })
  return new FAAR(states.length, transitions, statesMap[dfa.start.id], alphabet, dfa.getAcceptStates().map(function(state) {
      return statesMap[state.id];
  }));
};

FAAR.machineify = function (alg) {
  var faar = alg;
  return alg.machineify();
};

FAAR.prototype.machineify = function () {
  var cache = {};
  var range = [];
  for (var i= 0; i < this.numStates; i++) {
    range.push(i);
  }
  while (range.length !== 0) {
    (function () {
      var stateKey = range.pop();

      var stateTransition = function () {
        var trans = {};
        this.alphabet.forEach(function (char) {
          var destStateKey = 0;
          this.transitions[char][stateKey].forEach(function (el, i) {
            if (el) {
              destStateKey = i;
              return;
            };
          });
          trans[char] = cache[destStateKey];
        }.bind(this))
        return trans;
      }.bind(this);

    cache[stateKey] = new State(stateTransition, !!this.acceptStates[stateKey]);
    }.bind(this))();

  }
  return new DFA(cache[this.startKey], this.alphabet);
};



var evenZeros = new State(function () {return {0: oddZeros, 1: evenZeros}}, true);

var oddZeros = new State(function () {return {0: evenZeros, 1: oddZeros}}, false);

var evenOnes = new State(function () {return {0: evenOnes, 1: oddOnes}}, true);

var oddOnes = new State(function () {return {0: oddOnes, 1: evenOnes}}, false);

var evenlyManyZeros = new DFA(evenZeros, ['0', '1']);

var evenlyManyOnes = new DFA(evenOnes, ['0', '1']);

//
// var ifEvenlyMany = evenlyManyZeros.union(evenlyManyOnes);
//
// var ifEvenlyManyG = DFA.union(evenlyManyZeros, evenlyManyOnes, evenlyManyOnes);

var faar = new FAAR(2, {a: [[0, 1], [1, 0]], b: [[1, 0], [0,1]]}, 0, ['a', 'b'], [0])






var NFA = function (start, alphabet) {
  this.start = start;
  this.alphabet = alphabet;

  this.currentState = this.start;
  this.alphabetHash = {};
  this.alphabet.forEach(function(char) {
    this.alphabetHash[char] = true;
  }.bind(this));
}


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
  if (options) {
    var callback = options.callback;
    var epsilon = options.epsilon;
    var alphabet = options.alphabet;
  }
  var queue = [];
  var cache = {};
  queue.push(this);
  cache[this.id] = true;
  while (queue.length !== 0) {
    var state = queue.shift();
    state.set();
    if (callback) {
    callback(state);
    }
    if (epsilon) {
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
      alphabet.forEach(function (char) {
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
  if (states.length === 0) {
    return [];
  } else if (states.length === 1) {
    return states[0].epsilonSpan();
  } else {
    return states.map(function (state) {
      return state.epsilonSpan();
    }).reduce(function (left, right) {
      return left.union(right);
    });
  }
};

NFA.set = function (states) {
  states.forEach(function (state) {
    state.set();
  });
};


NFA.prototype.getStates = function () {
  // if (!this.states) {
  var states = [];
  this.eachState(function (state) {
    states.push(state);
  });
  // this.states = states;
// }
  // return this.states
  return states;
};

NFA.prototype.getAcceptStates = function () {
  var acceptStates = [];
  this.eachState(function (state) {
    if (state.accept) {
      acceptStates.push(state)
    };
  });
  return acceptStates;
};

NFA.prototype.toDFA = function () {
  var span = function (states, char) {
    // console.log('states:');
    // console.log(states);
    // console.log("_");
    var destinations = [];
    states.forEach(function (state) {
      state.set()
      var destination = state.transition[char]
      // console.log('destination:')
      // console.log(destination);
      // console.log("-");
      // console.log('destinations:');
      // console.log(destinations);
      // console.log("-");
      // // console.log('current:');
      // if (destination) {
      //   console.log(destinations.unionById(destination));
      // } else {
      //     console.log(destinations);
      // }
      // console.log("-----");
      if (destination) {
        // destinations = destinations.unionById(destination);
        destinations._unionById(destination);
      }
    });
    // console.log('result:');
    // console.log(destinations);
    // console.log("-------------------");
    return destinations;
  }

  var sinkState = new State(function () {
    var trans = {};
    alphabet.forEach(function (char) {
      trans[char] = sinkState;
    })
    return trans;
  }, false);

  var cache = new SuperStateHash();
  cache.put([], sinkState);
  this.start.set();
  return MachineDerivative({
    alphabet: this.alphabet,
    startStates: NFA.epsilonSpan([this.start]),
    cache: cache,
    predicate: function (x, y) { return x || y },
    span: span,
    close: function (states) { states._unionById(NFA.epsilonSpan(states)) },
    transform: function (x) {return x},
    machineType: DFA
  });
};

DFA.prototype.star = function () {
  return this.toNFA()._star().toDFA();
};

DFA.prototype.concatenate = function (dfa) {
  return this.toNFA()._concatenate(dfa.toNFA()).toDFA();
};

NFA.prototype._star = function () {
  this.eachState(function (state) {
    if (state.accept) {
      if (state.transition["_"]) {
        state.transition["_"].push(this.start);
      } else {
        state.transition["_"] = [this.start];
      }
    };
  });
  return this
};

NFA.prototype._concatenate = function (nfa) {
  this.eachState(function (state) {
    console.log(state.id);
    if (state.accept) {
      if (state.transition["_"]) {
        state.transition["_"].push(nfa.start);
      } else {
        state.transition["_"] = [nfa.start];
      }
    };
  });
  return this
};

var evenlyManyZerosNFA = evenlyManyZeros.toNFA()
var evenlyManyOnesNFA = evenlyManyOnes.toNFA()
//
//
//
var unionStart = new State(function () {return {"_": [evenlyManyZerosNFA.start, evenlyManyOnesNFA.start]}}, false);

var unionNFA = new NFA(unionStart, ['0', '1']);

var unioned = unionNFA.toDFA()

// console.log("CONCATENATION");

var concatenatedNFA = evenlyManyOnesNFA._concatenate(evenlyManyOnesNFA);

var concatenated = evenlyManyZeros.concatenate(evenlyManyOnes);

// evenlyManyZeros.start.set();
//
// evenlyManyOnes.start.set();
//
// evenlyManyZeros.toNFA()
//
// evenlyManyOnes.toNFA()
