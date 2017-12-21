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

    var num_actions = 1 + Define.qNet.NUMBER_DIRECTION; // 5 possible angles agent can turn
    var temporal_window = 0; // amount of temporal memory. 0 = agent lives in-the-moment :)

    var layer_move_defs = [];
    var layer_shoot_defs = [];
    var layer_gun_type_defs = [];

    var moveInput = Define.qNet.MY_PROPS + Define.qNet.FISH_PROPS * Define.qNet.FISH_NUM +
                          Define.qNet.PLAYER_PROPS *Define.qNet.PLAYER_NUM +
                          Define.qNet.ITEM_PROPS *Define.qNet.ITEM_NUM +
                          Define.qNet.ROCK_PROPS *Define.qNet.ROCK_NUM +
                          Define.qNet.BULLET_PROPS *Define.qNet.BULLET_NUM

    layer_move_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:moveInput});
    layer_move_defs.push({type:'fc', num_neurons: 26, activation:'relu'});
    layer_move_defs.push({type:'fc', num_neurons: 26, activation:'relu'});
    layer_move_defs.push({type:'regression', num_neurons:num_actions});


    var shootInput = Define.qNet.MY_PROPS + Define.qNet.FISH_PROPS * Define.qNet.FISH_NUM +
                          Define.qNet.PLAYER_PROPS *Define.qNet.PLAYER_NUM +
                          Define.qNet.ROCK_PROPS *Define.qNet.ROCK_NUM

    layer_shoot_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:shootInput});
    layer_shoot_defs.push({type:'fc', num_neurons: 16, activation:'relu'});
    layer_shoot_defs.push({type:'fc', num_neurons: 16, activation:'relu'});
    layer_shoot_defs.push({type:'regression', num_neurons:num_actions});

    var gunTypeInput = Define.qNet.MY_PROPS + Define.qNet.FISH_PROPS * Define.qNet.FISH_NUM +
                          Define.qNet.PLAYER_PROPS *Define.qNet.PLAYER_NUM
    layer_gun_type_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:gunTypeInput});
    layer_gun_type_defs.push({type:'fc', num_neurons: 16, activation:'relu'});
    layer_gun_type_defs.push({type:'fc', num_neurons: 16, activation:'relu'});
    layer_gun_type_defs.push({type:'regression', num_neurons:4});

    // var tdtrainer_options = {learning_rate:0.1, momentum:0.0, batch_size:6, l2_decay:0.01};
    var tdtrainer_options = {method: 'adadelta', batch_size:12, l2_decay:0.0001};

    var opt = {};
    opt.temporal_window = temporal_window;
    opt.experience_size = 30000;
    opt.start_learn_threshold = 1000;
    opt.gamma = 0.7;
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

    this.loadDataAfterTraining()


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
    console.log('writeDataAfterTraining')
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
    this.count = 0
    await this.loadDataAfterTraining('./QNetAfterTrainingLocal')
    this.startTrainning()
  }

  async startTrainning(){
    await this.readDataTrainning()

    if (this.trainningData.length>0) {
      this.trainningData.forEach((current)=>{
        // this.moveNetwork.view(current.moveInput,current.moveOutput.indexOf(1))
        this.shootNetwork.view(current.shootInput,current.shootOutput.indexOf(1))
        this.gunTypeNetwork.view(current.gunTypeInput,current.gunTypeOutput.indexOf(1))

        // this.moveNetwork.backward(current.moveReward)
        this.shootNetwork.backward(current.shootReward)
        this.gunTypeNetwork.backward(current.gunTypeReward)
        this.count +=1
        if ((this.count % 1) === 0) {
          console.log('forward_passes =================> ',this.count)
          // console.log('epsilon',this.moveNetwork.epsilon)
          console.log('average_reward_window',this.moveNetwork.average_reward_window.get_average())

          console.log('average_loss move',this.moveNetwork.average_loss_window.get_average())
          console.log('average_loss shoot',this.shootNetwork.average_loss_window.get_average())
          console.log('average_loss guntype',this.gunTypeNetwork.average_loss_window.get_average())
        }
        if ((this.moveNetwork.forward_passes % 1000) === 0) {
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
