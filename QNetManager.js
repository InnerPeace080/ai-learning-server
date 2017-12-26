var fs = require('fs');

var convnetjs = require("convnetjs");
var deepqlearn = require("convnetjs/build/deepqlearn");
var jsonfile = require('jsonfile')
const Define = require('./Define')

class QNetManager{
  constructor(){
    this.trainningFileReaded = {}
    this.trainningData =[]

  }


  initQNet(arg,cb){

    var num_actions = 1 + Define.qNet.NUMBER_DIRECTION; //
    var temporal_window = 0; // amount of temporal memory. 0 = agent lives in-the-moment :)

    var layer_move_defs = [];
    var layer_shoot_defs = [];
    var layer_gun_type_defs = [];

    var moveInput = Define.qNet.NUMBER_DIRECTION

    layer_move_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:moveInput + temporal_window * (moveInput+num_actions) });
    layer_move_defs.push({type:'fc', num_neurons: 32, activation:'relu'});
    layer_move_defs.push({type:'fc', num_neurons: 32, activation:'relu'});
    layer_move_defs.push({type:'regression', num_neurons:num_actions});


    var shootInput = Define.qNet.NUMBER_DIRECTION

    layer_shoot_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:shootInput + temporal_window * (shootInput+num_actions)});
    layer_shoot_defs.push({type:'fc', num_neurons: 200, activation:'sigmoid'});
    layer_shoot_defs.push({type:'fc', num_neurons: 200, activation:'sigmoid'});
    // layer_shoot_defs.push({type:'fc', num_neurons: 200, activation:'relu'});
    layer_shoot_defs.push({type:'regression', num_neurons:num_actions});

    var gunTypeInput = Define.qNet.NUMBER_DIRECTION

    layer_gun_type_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:gunTypeInput + temporal_window * (gunTypeInput+4)});
    layer_gun_type_defs.push({type:'fc', num_neurons: 32, activation:'relu'});
    // layer_gun_type_defs.push({type:'fc', num_neurons: 32, activation:'relu'});
    layer_gun_type_defs.push({type:'regression', num_neurons:4});

    // var tdtrainer_options = {learning_rate:0.001, momentum:0.0, batch_size:12, l2_decay:0.01};
    var tdtrainer_options = {method: 'adadelta', batch_size:12, l2_decay:0.01};

    var opt = {};
    opt.temporal_window = temporal_window;
    opt.experience_size = 30000;
    opt.start_learn_threshold = 1000;
    opt.gamma = 0;
    opt.learning_steps_total = 100000;
    opt.learning_steps_burnin = 3000;
    opt.epsilon_start = 0.01;
    opt.epsilon_min = 0;
    opt.epsilon_test_time = 0;
    // opt.layer_defs = layer_move_defs;
    opt.tdtrainer_options = tdtrainer_options;

    this.moveNetwork = new deepqlearn.Brain(moveInput, num_actions, {
      ...opt,
      layer_defs:layer_move_defs
    });
    this.shootNetwork = new deepqlearn.Brain(shootInput, num_actions, {
      ...opt,
      layer_defs:layer_shoot_defs
    });
    this.gunTypeNetwork = new deepqlearn.Brain(gunTypeInput, 4, {
      ...opt,
      layer_defs:layer_gun_type_defs
    });

    // this.loadDataAfterTraining()


    console.log('init done')
    cb()
  }

  loadDataAfterTraining(file){
    var ret = false
    try{
      let obj = jsonfile.readFileSync(file?file:`./QNetAfterTraining`)
      obj.moveNetwork && this.moveNetwork.fromJSON(obj.moveNetwork)
      obj.shootNetwork && this.shootNetwork.fromJSON(obj.shootNetwork)
      obj.gunTypeNetwork && this.gunTypeNetwork.fromJSON(obj.gunTypeNetwork)
      console.log('loadDataAfterTraining load done')
    //   ret = true
    }catch(err){
      console.log('QNET loadDataAfterTraining no file to load')
      ret = false
    }
    return ret

  }

  writeNetworkDataFromClient(dataJSON){
    console.log('QNET writeNetworkDataFromClient')
    jsonfile.writeFileSync(`./QNetAfterTraining`, dataJSON)
    jsonfile.writeFileSync(`./QNetAfterTraining_bak/QNetAfterTraining${Date.now()}`, dataJSON)
  }
  writeDataAfterTraining(dataJSON,file){
    console.log('writeDataAfterTraining',file?file:`./QNetAfterTraining`)
    if (!dataJSON) {
      dataJSON={
        moveNetwork:this.moveNetwork.toJSON(),
        shootNetwork:this.shootNetwork.toJSON(),
        gunTypeNetwork:this.gunTypeNetwork.toJSON()
      }
    }
    jsonfile.writeFileSync(file?file:`./QNetAfterTraining`, dataJSON)
    jsonfile.writeFileSync(`./QNetAfterTraining_bak/${file?file:`./QNetAfterTraining`}${Date.now()}`, dataJSON)
  }

  writeTrainingData(data){
    jsonfile.writeFile(`./trainingQNETData/data-${Date.now()}`, data, function (err) {
      console.log('trainingQNETData err:',err)
    })
  }

  async readDataTrainning(file){
    if (file) {
      if (!this.trainningFileReaded[file]) {
        let obj = jsonfile.readFileSync(`./trainingQNETData/${file}`)
        this.trainningData = this.trainningData.concat(obj)
        console.log('read ',file ,':', obj.length ,':',this.trainningData.length)
        this.trainningFileReaded[file] = true
      }
    }else{
      var test = await fs.readdirSync('./trainingQNETData')
      test.some((file,index)=>{
        if (!this.trainningFileReaded[file]) {
          let obj = jsonfile.readFileSync(`./trainingQNETData/${file}`)
          this.trainningData = this.trainningData.concat(obj)
          console.log('read ',file ,':', obj.length ,':',this.trainningData.length)
          this.trainningFileReaded[file] = true
        }
        if (index >=20) {
          return true
        }else{
          return false
        }
      })
    }

  }


  async train(){
    this.count = 0
    await this.loadDataAfterTraining('./QNetAfterTrainingLocal')

    for (var j = 0; j < 100000; j++) {
      for (var i = 0; i < Define.qNet.NUMBER_DIRECTION; i++) {
        let input= (new Array(Define.qNet.NUMBER_DIRECTION)).fill(1)
        input[i] = Math.random() * 0.8
        let temp = Math.round(Math.random() * (1+Define.qNet.NUMBER_DIRECTION - 1))
        this.trainningData.push({
          shootInput:input,
          shootAction:temp,
          shootReward:(temp === (i+1) )? 1:0
        })

      }
    }


    // console.log(this.trainningData)

    this.startTrainning()
  }

  async test(){
    await this.loadDataAfterTraining('./QNetAfterTrainingLocal')
    for (var i = 0; i < Define.qNet.NUMBER_DIRECTION; i++) {
      let input= (new Array(Define.qNet.NUMBER_DIRECTION)).fill(1)
      input[i] = Math.random() * 0.8
      console.log(i,this.shootNetwork.forward(input))
    }
  }

  async startTrainning(){
    // await this.readDataTrainning()//('data-1513827144173')

    if (this.trainningData.length>0) {
      this.trainningData.some((current,index)=>{
        // console.log(current.shootInput.length,current.shootAction,current.shootReward)
        // this.moveNetwork.view(current.moveInput,current.moveAction)
        this.shootNetwork.view(current.shootInput,current.shootAction)
        // this.gunTypeNetwork.view(current.gunTypeInput,current.gunTypeAction)

        // this.moveNetwork.backward(current.moveReward)
        this.shootNetwork.backward(current.shootReward)
        // this.gunTypeNetwork.backward(current.gunTypeReward)
        this.count +=1
        if ((this.count % 20) === 0) {
          console.log(current.moveAction,current.moveReward,current.shootAction,current.shootReward,current.gunTypeAction,current.gunTypeReward)
          console.log('forward_passes =================> ',this.count)

          console.log('average_reward move',this.moveNetwork.average_reward_window.get_average())
          console.log('average_reward shoot',this.shootNetwork.average_reward_window.get_average())
          console.log('average_reward guntype',this.gunTypeNetwork.average_reward_window.get_average())

          console.log('average_loss move',this.moveNetwork.average_loss_window.get_average())
          console.log('average_loss shoot',this.shootNetwork.average_loss_window.get_average())
          console.log('average_loss guntype',this.gunTypeNetwork.average_loss_window.get_average())
        }
        if ((this.count % 2000) === 0) {
          this.writeDataAfterTraining({
                    moveNetwork:this.moveNetwork.toJSON(),
                    shootNetwork:this.shootNetwork.toJSON(),
                    gunTypeNetwork:this.gunTypeNetwork.toJSON()
                  },'./QNetAfterTrainingLocal')
        }

      })

      await this.writeDataAfterTraining({
                moveNetwork:this.moveNetwork.toJSON(),
                shootNetwork:this.shootNetwork.toJSON(),
                gunTypeNetwork:this.gunTypeNetwork.toJSON()
              },'./QNetAfterTrainingLocal')
      this.startTrainning()
    }else{
      setTimeout(()=>{
        this.startTrainning()
      },60*1000)
    }

  }



  getPlayer(){
    console.log('QNET get player')
    var retData = {}

    // this.loadDataAfterTraining()

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
