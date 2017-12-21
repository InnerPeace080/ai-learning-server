const express = require('express')
const app = express()
var bodyParser = require('body-parser')
var cmd=require('node-cmd');
const Define = require('./Define')

var url = require('url');

const neatManager = require('./NeatManager')
const qNetManager = require('./QNetManager')

app.use(bodyParser.json({limit: '500mb'}))
app.listen(10000, () => console.log('app listening on port 10000!'))

neatManager.initNeat({},()=>{
//   neatManager.train()
  // neatManager.startEvaluation({})
})

qNetManager.initQNet({},()=>{
  // setTimeout(()=>{
      // qNetManager.train()
  // })

})

app.get('/api/bot_struct',(req,res)=>{
  let respone ={}
  switch (req.query.botType) {
    case 'NEAT':{
      let data = neatManager.getPlayer()
      if (data) {
        respone.index = data.index
        respone.tag = data.tag
        console.log('sent ',data.index)
        respone.network = data.data.toJSON()
        res.send(JSON.stringify(respone))
      }else{
        res.status(404).send('no available bot')
      }
      break;
    }
    case 'QNET':{
      let data = qNetManager.getPlayer()
      respone=data
      res.send(JSON.stringify(respone))
      break;
    }
    default:

  }

})

app.post('/api/bot_struct',(req,res)=>{
  switch (req.query.botType) {
    case 'NEAT':{
      neatManager.setScore(req.body.index,req.body.tag,req.body.score)
      break;
    }
    case 'QNET':{
      qNetManager.writeNetworkDataFromClient(req.body.data)
      break;
    }
    default:
  }

  res.send(JSON.stringify({OK:'OK'}))
})

app.get('/api/keep_alive',(req,res)=>{
  neatManager.keepAlive(req.query.index)
  res.send(JSON.stringify({OK:'OK'}))
})

app.post('/api/training_data',(req,res)=>{
  console.log('received Data',req.body.data.length)
  switch (req.query.botType) {
    case 'NEAT':{
      neatManager.writeTrainingData(req.body.data)
      break;
    }
    case 'QNET':{
      qNetManager.writeTrainingData(req.body.data)
      break;
    }
    default:
  }

  res.send(JSON.stringify({OK:'OK'}))
})


setInterval(()=>{

})
