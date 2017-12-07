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
    this.initNeat()
    this.intervalCheck = this.intervalCheck.bind(this)
    setInterval(this.intervalCheck,1000)
  }

  intervalCheck(){
    this.player.forEach((current)=>{
      if ((Date.now() - current.startProcess) > (30*60*1000)) {
        current.process = 0
      }
    })
  }

  initNeat(){
    this.numberInput = 1 + Define.FISH_PROPS * Define.FISH_NUM +
                          Define.PLAYER_PROPS *Define.PLAYER_NUM +
                          Define.ITEM_PROPS *Define.ITEM_NUM +
                          Define.ROCK_PROPS *Define.ROCK_NUM +
                          Define.BULLET_PROPS *Define.BULLET_NUM

    this.neat = new Neat(
      this.numberInput * 2,
      1 /* move or not*/ + 1 /*move angle*/ + 1 /*shot or not*/ + 1 /*shot angle*/,
      null,
      {
        mutation: methods.mutation.ALL,
        popsize : Define.PLAYER_AMOUNT,
        mutationRate: Define.MUTATION_RATE,
        elitism: Math.round(Define.ELITISM_PERCENT * Define.PLAYER_AMOUNT),
        network: new architect.Random(
          Define.WIDTH*Define.HEIGHT + 1 /* fishPoint*/ ,
          Define.START_HIDDEN_SIZE,
          1 /* move or not*/ + 1 /*move angle*/ + 1 /*shot or not*/ + 1 /*shot angle*/,
        )
      }
    )
    if (true) {
      jsonfile.readFile('./data', (err, obj) =>{
        if (!err) {
          // var newPop = [];
          obj.forEach((current,index)=>{
            // newPop.push(neataptic.Network.fromJSON(current))
            this.neat.population[index] = neataptic.Network.fromJSON(current)
            console.log('load ',index)
          })

        }else{
          console.log(err)
        }

        console.log('read done')
      })
    }

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
  onHaveNewPlayer(cb){
    var havePlayerLeft =  this.player.some((current)=>{
      if (current.process === 0) {
        return true
      }else{
        return false
      }
    })
    // console.log('onHaveNewPlayer ',havePlayerLeft)

    if (!havePlayerLeft) {
      // wait
      setTimeout(()=>{
        this.onHaveNewPlayer(cb)
      },100)
    }else{

      cb()
    }
  }
  getPlayer(cb){
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
      }else{
        // wait
        setTimeout(()=>{
          this.getPlayer(cb)
        },100)
      }


    }else{
      // find player not process yet
      this.player.some((current,index)=>{
        if (current.process === 0) {
          current.process = 1;
          current.startProcess = Date.now()
          cb(index,current)
          return true
        }else{
          return false
        }
      })


    }
  }
  setScore(index,score){
    console.log('set score',index,score)
    if (this.player[index].process === 1) {
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
      this.endEvaluation()
    }
  }
  setStopProcess(index){
    if (this.player[index]) {
        this.player[index].process =0
    }
  }

  endEvaluation(){
    if (this.endEvaluationProcess) {
      return;
    }
    this.endEvaluationProcess = true
    console.log('Generation:', this.neat.generation, '- average score:', this.neat.getAverage());

    var data =[]
    // var data = neataptic.Network.toJSON(this.neat.population);
    if (!isNaN(this.neat.getAverage()) ) {
      this.player.forEach((current)=>{
        data.push(current.toJSON())
      })

      jsonfile.writeFile('./data' /*+ (new Date()).getHours()*/, data, (err) => {
        console.error('err write file',err)

        this.neat.sort();
        var newPopulation = [];

        // Elitism
        for(var i = 0; i < this.neat.elitism; i++){
          newPopulation.push(this.neat.population[i]);
        }

        // Breed the next individuals
        for(var i = 0; i < this.neat.popsize - this.neat.elitism; i++){
          newPopulation.push(this.neat.getOffspring());
        }

        // Replace the old population with the new population
        this.neat.population = newPopulation;
        this.neat.mutate();

        this.neat.generation++;
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
