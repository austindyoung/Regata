


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

Array.prototype.uniq = function () {
  return this.union([]);
}

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

var CombinerBinary = function (dfa1, dfa2, operation) {
  var cache = {};
  var queue = [];
  var combinedAlphabets = dfa1.alphabet.union(dfa2.alphabet);
  var startStateKey = JSON.stringify([dfa1.start.id, dfa2.start.id]);

  queue.push(startStateKey);
  while (queue.length !== 0) {
    //
    (function() {
    var sourceStateKey = queue.pop();
    var leftKey = JSON.parse(sourceStateKey)[0];
    var rightKey = JSON.parse(sourceStateKey)[1];
    var left = get(leftKey);
    var right = get(rightKey);
    left.set();
    right.set();

    //construct composite state transition
    var stateTransition = function () {
      var trans = {};
      combinedAlphabets.forEach(function (char) {
        var destStateKey = JSON.stringify([left.transition[char].id, right.transition[char].id]);
        trans[char] = cache[destStateKey];
      });
      return trans;
    };

    //construct compoiste state
    var sourceState = new State(stateTransition, operation(left.accept, right.accept));

    //cach composite state
    cache[sourceStateKey] = sourceState;

    combinedAlphabets.forEach(function (char) {
      var destStateKey = JSON.stringify([left.transition[char].id, right.transition[char].id]);
      if (!cache[destStateKey]) {
        queue.push(destStateKey);
      };
    });
  })();
  }
  return new DFA(cache[startStateKey], combinedAlphabets);
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

DFA.prototype.concatenate = function (dfa) {
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

};

DFA.union = function () {
  var dfas = Array.prototype.slice.call(arguments);
  dfas.unshift(function (x, y) {
    return x || y;
  });
  return Combiner.apply(undefined, dfas);
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


var ifEvenlyMany = evenlyManyZeros.union(evenlyManyOnes);

var ifEvenlyManyG = DFA.union(evenlyManyZeros, evenlyManyOnes, evenlyManyOnes);

var faar = new FAAR(2, {a: [[0, 1], [1, 0]], b: [[1, 0], [0,1]]}, 0, ['a', 'b'], [0])
