var fs = require('fs');

const neataptic = require('neataptic')
var jsonfile = require('jsonfile')
const Define = require('./Define')

var Neat    = neataptic.Neat;
var methods = neataptic.methods;
var config  = neataptic.config;
var architect = neataptic.architect;

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
    if(!this.loadDataAfterTraining()){
      this.moveNetWork = new architect.Perceptron(this.numberInput,Math.floor(this.numberInput/2),1 + Define.qNet.NUMBER_DIRECTION);
      this.shootNetwork = new architect.Perceptron(this.numberInput,Math.floor(this.numberInput/2),1 + Define.qNet.NUMBER_DIRECTION);
      this.gunTypeNetwork = new architect.Perceptron(this.numberInput,Math.floor(this.numberInput/2),4);

      // this.moveNetWork.nodes.forEach((node)=>{
      //   if (node.type === 'hidden') {
      //     node.squash=methods.activation.RELU
      //   }
      //   if (node.type === 'output') {
      //     node.squash=methods.activation.IDENTITY
      //   }
      // })
      // this.shootNetwork.nodes.forEach((node)=>{
      //   if (node.type === 'hidden') {
      //     node.squash=methods.activation.RELU
      //   }
      //   if (node.type === 'output') {
      //     node.squash=methods.activation.IDENTITY
      //   }
      // })
      // this.gunTypeNetwork.nodes.forEach((node)=>{
      //   if (node.type === 'hidden') {
      //     node.squash=methods.activation.RELU
      //   }
      //   if (node.type === 'output') {
      //     node.squash=methods.activation.IDENTITY
      //   }
      // })

    }

    console.log('init done')
    cb()
  }

  loadDataAfterTraining(){
    var ret = false
    try{
      let obj = jsonfile.readFileSync(`./QNetAfterTraining`)
      this.moveNetWork = neataptic.Network.fromJSON(obj.moveNetWork)
      this.shootNetwork = neataptic.Network.fromJSON(obj.shootNetwork)
      this.gunTypeNetwork = neataptic.Network.fromJSON(obj.gunTypeNetwork)
      console.log('loadDataAfterTraining load done')
      ret = true
    }catch(err){
      console.log('loadDataAfterTraining no file to load')
      ret = false
    }

  }
  writeDataAfterTraining(){
    var data={
      moveNetWork:this.moveNetWork.toJSON(),
      shootNetwork:this.shootNetwork.toJSON(),
      gunTypeNetwork:this.gunTypeNetwork.toJSON()
    }
    jsonfile.writeFileSync(`./QNetAfterTraining`, data)
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
        let qMove = this.moveNetWork.activate(current.currentState.input)        
        let selectMove = current.currentState.moveOutput.indexOf(1)
        qMove[selectMove] = current.nextState.reward + Define.qNet.GAMMA * Math.max(...this.moveNetWork.activate(current.nextState.input))
        moveData.push({
          input:current.currentState.input,
          output:qMove
        })

        let qShoot = this.shootNetwork.activate(current.currentState.input)
        let selectShoot = current.currentState.shootOutput.indexOf(1)
        qShoot[selectShoot] = current.nextState.reward + Define.qNet.GAMMA * Math.max(...this.moveNetWork.activate(current.nextState.input))
        shootData.push({
          input:current.currentState.input,
          output:qShoot
        })

        let qGunType = this.gunTypeNetwork.activate(current.currentState.input)
        let selectGunType = current.currentState.gunTypeOutput.indexOf(1)
        qGunType[selectGunType] = current.nextState.reward + Define.qNet.GAMMA * Math.max(...this.gunTypeNetwork.activate(current.nextState.input))
        gunTypeData.push({
          input:current.currentState.input,
          output:qGunType
        })
      })

      var option={
        log:1,
        rate:Define.qNet.RATE,
        iterations:Define.qNet.ITERATIONS,
        error:Define.qNet.ERROR
      }

      this.moveNetWork.train(moveData,option)
      this.shootNetwork.train(shootData,option)
      this.gunTypeNetwork.train(gunTypeData,option)

      this.writeDataAfterTraining()

      this.startTrainning()
    }else{
      setTimeout(()=>{
        this.startTrainning()
      },60*1000)
    }

  }



  getPlayer(){
    var retData = undefined
    var havePlayerLeft =  this.player.some((current)=>{
      if (current.process === 0) {
        return true
      }else{
        return false
      }
    })
    if (!havePlayerLeft) {
      var finish =  this.player.every((current)=>{
        if (current.process === 2) {
          return true
        }else{
          return false
        }
      })
      if (finish) {
        this.endEvaluation()
      }

    }else{
      // find player not process yet
      this.player.some((current,index)=>{
        if (current.process === 0) {
          current.process = 1;
          current.startProcess = Date.now()
          current.tag = Date.now()
          retData={
            index:index,
            data:current,
            tag:current.tag
          }
          return true
        }else{
          return false
        }
      })
    }

    return retData;
  }


}




module.exports = new QNetManager()
