var fs = require('fs');

const neataptic = require('neataptic')
var jsonfile = require('jsonfile')
const Define = require('./Define')

var Neat    = neataptic.Neat;
var methods = neataptic.methods;
var config  = neataptic.config;
var architect = neataptic.architect;

class NeatManager{
  constructor(){
    this.player =[]
    this.donePlayer =0;
    // this.initNeat()
    this.intervalCheck = this.intervalCheck.bind(this)
    setInterval(this.intervalCheck,1000)

  }

  intervalCheck(){
    this.player.forEach((current,index)=>{
      if (current.process===1 && (Date.now() - current.startProcess) > (10*1000)) {
        console.log(index , 'time out')
        current.process = 0
      }
    })
  }

  keepAlive(index){
    if (this.player[index]) {
        this.player[index].startProcess = Date.now()
    }
  }

  initNeat(arg,cb){
    this.numberInput = Define.MY_PROPS + Define.FISH_PROPS * Define.FISH_NUM +
                          Define.PLAYER_PROPS *Define.PLAYER_NUM +
                          Define.ITEM_PROPS *Define.ITEM_NUM +
                          Define.ROCK_PROPS *Define.ROCK_NUM +
                          Define.BULLET_PROPS *Define.BULLET_NUM

    let initNetWork = new architect.Random(
      this.numberInput ,
      Define.START_HIDDEN_SIZE,
      Define.NUMBER_OUTPUT,
    )
    jsonfile.readFile('./dataAfterTraining', (errAfterTraining, objAfterTraining) =>{
      jsonfile.readFile('./data', (err, obj) =>{

        if (err) {

          if (!errAfterTraining) {
            console.log('use training')
            initNetWork = neataptic.Network.fromJSON(objAfterTraining)
          }else{
            console.log('use random init')
            // my modify network (for start up random)
            initNetWork.connections.forEach((connection)=>{
              // if (connection.weight > (1/250)) {
                  connection.weight = Math.random() * (2/this.numberInput) + (-1/this.numberInput)
              // }
            })
          }

        }



        this.neat = new Neat(
          this.numberInput,
          Define.NUMBER_OUTPUT,
          null,
          {
            mutation: [
              methods.mutation.ADD_NODE,
              methods.mutation.SUB_NODE,
              methods.mutation.ADD_CONN,
              methods.mutation.SUB_CONN,
              methods.mutation.MOD_WEIGHT,
              methods.mutation.MOD_BIAS,
              methods.mutation.MOD_ACTIVATION,
              methods.mutation.ADD_GATE,
              methods.mutation.SUB_GATE,
              methods.mutation.ADD_SELF_CONN,
              methods.mutation.SUB_SELF_CONN,
              methods.mutation.ADD_BACK_CONN,
              methods.mutation.SUB_BACK_CONN
            ],
            popsize : Define.PLAYER_AMOUNT,
            mutationRate: Define.MUTATION_RATE,
            elitism: Math.round(Define.ELITISM_PERCENT * Define.PLAYER_AMOUNT),
            network: initNetWork
          }
        )

        //
        if (!err) {
          // var newPop = [];
          obj.some((current,index)=>{
            // newPop.push(neataptic.Network.fromJSON(current))
            if (index < Define.PLAYER_AMOUNT - Define.PLAYER_FROM_TRAIN) {
              this.neat.population[index] = neataptic.Network.fromJSON(current)
              console.log('load ',index)
              return false
            }else if((!errAfterTraining) && (index >= Define.PLAYER_AMOUNT - Define.PLAYER_FROM_TRAIN ) && ( index < Define.PLAYER_AMOUNT)){
              console.log('load from objAfterTraining',index)
              this.neat.population[index] = neataptic.Network.fromJSON(objAfterTraining)
              return false
            }else if(index < Define.PLAYER_AMOUNT){
              this.neat.population[index] = neataptic.Network.fromJSON(current)
              console.log('load ',index)
              return false
            }else{
              return true
            }

          })

        }else{
          console.log(err)
        }

        console.log('init done')
        cb()

      })
    })


  }

  writeTrainingData(data){
    jsonfile.writeFile(`./trainingData/data-${Date.now()}`, data, function (err) {
      console.log('writeTrainingData err:',err)
    })
  }

  async readDataTranning(){
    var retData = []
    var test = await fs.readdirSync('./trainingData')
    test.forEach((file)=>{
      console.log('read ',file)
      let obj = jsonfile.readFileSync(`./trainingData/${file}`)
      retData = retData.concat(obj)
    })
    console.log('readDataTranning length',retData.length)
    return retData
  }


  async train(){

    var trainningData = await this.readDataTranning()

    jsonfile.readFile('./dataAfterTraining', (err, obj) =>{
      let initNetWork
      if (!err) {
        console.log('use initNetWork from dataAfterTraining')
        initNetWork = neataptic.Network.fromJSON(obj)
      }else{
        console.log('use random initNetWork ')
        initNetWork = new architect.Random(
          this.numberInput ,
          Define.START_HIDDEN_SIZE,
          Define.NUMBER_OUTPUT,
        )
        initNetWork.connections.forEach((connection)=>{
          connection.weight = Math.random() * (2/this.numberInput) + (-1/this.numberInput)
        })
      }

      console.log('evolve')
      this.startTrainning(initNetWork,trainningData)

    })

  }

  async startTrainning(network,trainningData){
    await network.evolve(trainningData, {
      mutation: [
        methods.mutation.ADD_NODE,
        methods.mutation.SUB_NODE,
        methods.mutation.ADD_CONN,
        methods.mutation.SUB_CONN,
        methods.mutation.MOD_WEIGHT,
        methods.mutation.MOD_BIAS,
        methods.mutation.MOD_ACTIVATION,
        methods.mutation.ADD_GATE,
        methods.mutation.SUB_GATE,
        methods.mutation.ADD_SELF_CONN,
        methods.mutation.SUB_SELF_CONN,
        methods.mutation.ADD_BACK_CONN,
        methods.mutation.SUB_BACK_CONN
      ],
      equal: true,
      popsize: 100,
      elitism: 10,
      log: 10,
      error: 0.01,
      iterations: 100,
      mutationRate: 0.5,
      threads:10,
      // schedule:{
      //   function:()=>{
      //     jsonfile.writeFile('./dataAfterTraining' /*+ (new Date()).getHours()*/, network.toJSON(), (err) => {
      //       console.log(' write dataAfterTraining err ',err)
      //     })
      //   },
      //   iterations:100
      // }
    });

    jsonfile.writeFile('./dataAfterTraining' /*+ (new Date()).getHours()*/, network.toJSON(), (err) => {
      console.log(' write dataAfterTraining err ',err)
    })

    this.startTrainning(network,trainningData)

  }


  startEvaluation(){

    this.neat.population.forEach((current,index)=>{
      this.player[index] = current
      this.player[index].process = 0
      this.player[index].startProcess = 0
    })

    this.donePlayer =0;
    this.endEvaluationProcess = false

    // for(var genome in this.neat.population){
    //   genome = this.neat.population[genome];
    // }

    // console.log(this.player[0].connections)

    // let player ={
    //   nodes:this.player[0].nodes,
    //   connections:this.player[0].connections,
    //   input:this.player[0].input,
    //   output:this.player[0].output,
    // }


    // console.log(neataptic.Network.toJSON(this.player[0]))
    // console.log(this.player[0].toJSON())
    // console.log(JSON.stringify(player.connections))

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
          retData={
            index:index,
            data:current
          }
          return true
        }else{
          return false
        }
      })
    }

    return retData;
  }
  setScore(index,score){

    if (this.player[index].process === 1) {
      console.log('set score',index,score)
      this.donePlayer += 1
      this.player[index].score = score
      this.player[index].process = 2

      console.log('donePlayer '+ this.donePlayer + '/' +this.player.length)

    }

    var finish =  this.player.every((current)=>{
      if (current.process === 2) {
        return true
      }else{
        return false
      }
    })


    if (finish) {
      var checkScore =  this.player.every((current)=>{
        if ((current.score >=0) ) {
          return true
        }else{
          current.process = 0
          return false
        }
      })
      if (checkScore) {
        this.endEvaluation()
        return ;
      }else{

      }
    }

    if (this.donePlayer > this.player.length) {
      console.log('have something wrong')
      this.endEvaluation()

    }

  }
  setStopProcess(index){
    if (this.player[index]) {
        this.player[index].process =0
    }
  }

  endEvaluation(){
    if (this.endEvaluationProcess || !this.neat) {
      return;
    }
    this.endEvaluationProcess = true
    console.log('Generation:', this.neat.generation, '- average score:', this.neat.getAverage());

    var data =[]
    // var data = neataptic.Network.toJSON(this.neat.population);
    if (!isNaN(this.neat.getAverage()) ) {

        this.neat.sort();
        var newPopulation = [];

        // Elitism
        for(var i = 0; i < this.neat.elitism; i++){
          newPopulation.push(this.neat.population[i]);
        }

        this.neat.population.forEach((current)=>{
          data.push(current.toJSON())
        })

        // Breed the next individuals
        for(var i = 0; i < this.neat.popsize - this.neat.elitism; i++){
          newPopulation.push(this.neat.getOffspring());
        }

        // Replace the old population with the new population
        this.neat.population = newPopulation;
        this.neat.mutate();

        this.neat.generation++;

      jsonfile.writeFile('./data' /*+ (new Date()).getHours()*/, data, (err) => {
        console.error('err write file',err)
        this.startEvaluation();
      })
    }else{
      this.player.forEach((current)=>{
        if (!current.score) {
            current.process = 0
        }
      })
      this.startEvaluation();
    }



  }


}




module.exports = new NeatManager()
