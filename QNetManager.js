var fs = require('fs');

var convnetjs = require("convnetjs");
var deepqlearn = require("convnetjs/build/deepqlearn");
var jsonfile = require('jsonfile')
const Define = require('./Define')
console.log('deepqlearn',deepqlearn)

class QNetManager{
  constructor(){
    this.trainningFileReaded = {}
    this.trainningData =[]

  }


  initQNet(arg,cb){
    this.numberInput = Define.MY_PROPS + Define.FISH_PROPS * Define.FISH_NUM +
                          Define.PLAYER_PROPS *Define.PLAYER_NUM +
                          Define.ITEM_PROPS *Define.ITEM_NUM +
                          Define.ROCK_PROPS *Define.ROCK_NUM +
                          Define.BULLET_PROPS *Define.BULLET_NUM

    // this.moveNetwork = new architect.Perceptron(this.numberInput,Math.floor(this.numberInput/2),1 + Define.qNet.NUMBER_DIRECTION);
    // this.shootNetwork = new architect.Perceptron(this.numberInput,Math.floor(this.numberInput/2),1 + Define.qNet.NUMBER_DIRECTION);
    // this.gunTypeNetwork = new architect.Perceptron(this.numberInput,Math.floor(this.numberInput/2),4);

    var num_inputs = this.numberInput; // 9 eyes, each sees 3 numbers (wall, green, red thing proximity)
    var num_actions = 1 + Define.qNet.NUMBER_DIRECTION; // 5 possible angles agent can turn
    var temporal_window = 0; // amount of temporal memory. 0 = agent lives in-the-moment :)
    var Network_size = num_inputs*temporal_window + num_actions*temporal_window + num_inputs;

    var layer_move_defs = [];
    var layer_shoot_defs = [];
    var layer_gun_type_defs = [];
    layer_move_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:Network_size});
    layer_move_defs.push({type:'fc', num_neurons: 50, activation:'relu'});
    layer_move_defs.push({type:'fc', num_neurons: 50, activation:'relu'});
    layer_move_defs.push({type:'regression', num_neurons:num_actions});

    layer_shoot_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:Network_size});
    layer_shoot_defs.push({type:'fc', num_neurons: 50, activation:'relu'});
    layer_shoot_defs.push({type:'fc', num_neurons: 50, activation:'relu'});
    layer_shoot_defs.push({type:'regression', num_neurons:num_actions});

    layer_gun_type_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:Network_size});
    layer_gun_type_defs.push({type:'fc', num_neurons: 50, activation:'relu'});
    layer_gun_type_defs.push({type:'fc', num_neurons: 50, activation:'relu'});
    layer_gun_type_defs.push({type:'regression', num_neurons:4});

    var tdtrainer_options = {learning_rate:0.001, momentum:0.0, batch_size:64, l2_decay:0.01};

    var opt = {};
    opt.temporal_window = temporal_window;
    opt.experience_size = 30000;
    opt.start_learn_threshold = 1000;
    opt.gamma = 0.7;
    opt.learning_steps_total = 200000;
    opt.learning_steps_burnin = 3000;
    opt.epsilon_min = 0.05;
    opt.epsilon_test_time = 0.05;
    // opt.layer_defs = layer_move_defs;
    opt.tdtrainer_options = tdtrainer_options;

    this.moveNetwork = new deepqlearn.Brain(num_inputs, num_actions, {
      ...opt,
      layer_defs:layer_move_defs
    });
    this.shootNetwork = new deepqlearn.Brain(num_inputs, num_actions, {
      ...opt,
      layer_defs:layer_shoot_defs
    });
    this.gunTypeNetwork = new deepqlearn.Brain(num_inputs, num_actions, {
      ...opt,
      layer_defs:layer_gun_type_defs
    });

    this.loadDataAfterTraining()


    console.log('init done')
    cb()
  }

  loadDataAfterTraining(){
    var ret = false
    try{
      let obj = jsonfile.readFileSync(`./QNetAfterTraining`)
      // this.moveNetwork = neataptic.Network.fromJSON(obj.moveNetwork)
      // this.shootNetwork = neataptic.Network.fromJSON(obj.shootNetwork)
      // this.gunTypeNetwork = neataptic.Network.fromJSON(obj.gunTypeNetwork)
      this.moveNetwork.fromJSON(obj.moveNetwork)
      this.shootNetwork.fromJSON(obj.shootNetwork)
      this.gunTypeNetwork.fromJSON(obj.gunTypeNetwork)
    //   console.log('loadDataAfterTraining load done')
    //   ret = true
    }catch(err){
      console.log('loadDataAfterTraining no file to load')
      ret = false
    }
    return ret

  }

  writeNetworkDataFromClient(dataJSON){
    console.log('QNET writeNetworkDataFromClient')
    jsonfile.writeFileSync(`./QNetAfterTraining`, dataJSON)
  }
  writeDataAfterTraining(dataJSON){
    var dataJSON={
      moveNetwork:this.moveNetwork.toJSON(),
      shootNetwork:this.shootNetwork.toJSON(),
      gunTypeNetwork:this.gunTypeNetwork.toJSON()
    }
    jsonfile.writeFileSync(`./QNetAfterTraining`, dataJSON)
  }

  writeTrainingData(data){
    jsonfile.writeFile(`./trainingQNETData/data-${Date.now()}`, data, function (err) {
      console.log('trainingQNETData err:',err)
    })
  }

  async readDataTrainning(){
    var test = await fs.readdirSync('./trainingQNETData')
    test.forEach((file)=>{
      if (!this.trainningFileReaded[file]) {
        let obj = jsonfile.readFileSync(`./trainingQNETData/${file}`)
        this.trainningData = this.trainningData.concat(obj)
        console.log('read ',file ,':', obj.length ,':',this.trainningData.length)
        this.trainningFileReaded[file] = true
      }
    })
  }


  async train(){
    this.startTrainning()
  }

  async startTrainning(){
    await this.readDataTrainning()

    if (this.trainningData.length>0) {

      let miniTrainingArray =[]

      for (let i = 0; i < Define.qNet.subTrainingSize; i++) {
        let index = Math.floor(Math.random()*(this.trainningData.length -1))
        miniTrainingArray[i] = {
          currentState : this.trainningData[index],
          nextState : this.trainningData[index+1]
        }
      }

      let moveData=[]
      let shootData=[]
      let gunTypeData=[]
      miniTrainingArray.forEach((current)=>{
        let qMove = this.moveNetwork.activate(current.currentState.input)
        console.log(qMove)
        let selectMove = current.currentState.moveOutput.indexOf(1)
        qMove[selectMove] = current.nextState.reward + Define.qNet.GAMMA * Math.max(...this.moveNetwork.activate(current.nextState.input))
        console.log('qMove',qMove)
        moveData.push({
          input:current.currentState.input,
          output:qMove
        })
      //
      //   let qShoot = this.shootNetwork.activate(current.currentState.input)
      //   let selectShoot = current.currentState.shootOutput.indexOf(1)
      //   qShoot[selectShoot] = current.nextState.reward + Define.qNet.GAMMA * Math.max(...this.moveNetwork.activate(current.nextState.input))
      //   shootData.push({
      //     input:current.currentState.input,
      //     output:qShoot
      //   })
      //
      //   let qGunType = this.gunTypeNetwork.activate(current.currentState.input)
      //   let selectGunType = current.currentState.gunTypeOutput.indexOf(1)
      //   qGunType[selectGunType] = current.nextState.reward + Define.qNet.GAMMA * Math.max(...this.gunTypeNetwork.activate(current.nextState.input))
      //   gunTypeData.push({
      //     input:current.currentState.input,
      //     output:qGunType
      //   })
      })
      //
      var option={
        log:1,
        rate:Define.qNet.RATE,
        iterations:Define.qNet.ITERATIONS,
        error:Define.qNet.ERROR
      }
      //
      this.moveNetwork.train(moveData,option)
      // this.shootNetwork.train(shootData,option)
      // this.gunTypeNetwork.train(gunTypeData,option)
      //
      // this.writeDataAfterTraining()
      //
      this.startTrainning()
    }else{
      setTimeout(()=>{
        this.startTrainning()
      },60*1000)
    }

  }



  getPlayer(){
    var retData = {}

    this.loadDataAfterTraining()

    retData={
      moveNetwork:this.moveNetwork.toJSON(),
      shootNetwork:this.shootNetwork.toJSON(),
      gunTypeNetwork:this.gunTypeNetwork.toJSON()
    }

    // console.log('QNET get Player',retData)

    return retData;
  }


}




module.exports = new QNetManager()
