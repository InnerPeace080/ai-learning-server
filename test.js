
var fs = require('fs');

var convnetjs = require("convnetjs");
var deepqlearn = require("convnetjs/build/deepqlearn");
var jsonfile = require('jsonfile')


var layer_defs = [];

var inputLength = 32
var outputLength = 32

layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:inputLength});
layer_defs.push({type:'fc', num_neurons: 32, activation:'relu'});
layer_defs.push({type:'fc', num_neurons: 32, activation:'relu'});
layer_defs.push({type:'regression', num_neurons:outputLength});

net = new convnetjs.Net();
net.makeLayers(layer_defs);

// var tdtrainer_options = {learning_rate:0.001, momentum:0.0, batch_size:12, l2_decay:0.01};
var trainer = new convnetjs.Trainer(net, {method: 'adadelta', l2_decay: 0.001,
                                    batch_size: 6});


// gen data
console.log('gen data')

var trainningData = []
for (var j = 0; j < 10000; j++) {
  for (var i = 0; i < inputLength; i++) {
    let input= (new Array(inputLength)).fill(1)
    let output= (new Array(outputLength)).fill(0)
    input[i] = Math.random() * 0.8
    let temp = Math.round(Math.random() * (Define.qNet.NUMBER_DIRECTION - 1))
    // output[i] = 1
    trainningData.push({
      input:input,
      output:output,
      action:temp,
      reward:(temp === i) ? 1 : 0
    })
  }
}

console.log('start')

var avgLoss = 0
var N = 6
for (var i = 0; i < 1000000000; i++) {
  for(var ix=0;ix<N;ix++) {
    let index = Math.floor(Math.random()*(trainningData.length-1))
    let x = new convnetjs.Vol(1, 1, inputLength);
    // console.log(ix)
    x.w = trainningData[index].input
    let temp = net.forward(x)
    temp.w[trainningData[index].action] += trainningData[index]
    let output =
    let stats = trainer.train(x, trainningData[index].output);

    avgLoss += stats.loss
  }
  avgLoss/=N


  if ((i%1000) === 0) {
    console.log(i,avgLoss)
    for (var t = 0; t < inputLength; t++) {
      let input= (new Array(inputLength)).fill(1)
      input[t] = Math.random() * 0.8
      let x = new convnetjs.Vol(1, 1, inputLength);
      x.w = input
      let temp = net.forward(x)

      var maxk = 0;
      var maxval = temp.w[0];
      for(var k=1;k<outputLength;k++) {
        if(temp.w[k] > maxval) { maxk = k; maxval = temp.w[k]; }
      }

      console.log(t,maxk,'===========>',maxval )
    }
  }
}
