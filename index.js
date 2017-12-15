const express = require('express')
const app = express()
var bodyParser = require('body-parser')
var cmd=require('node-cmd');
const Define = require('./Define')

var url = require('url');

const neatManager = require('./NeatManager')

app.use(bodyParser.json({limit: '50mb'}))
app.listen(10000, () => console.log('app listening on port 10000!'))

neatManager.initNeat({},()=>{
  if (Define.TRAIN) {
    neatManager.train()
  }else{
    neatManager.startEvaluation({})
    setInterval(()=>{
      cmd.run('killall chrome');
      for (var i = 0; i < Define.NUM_CLIENT; i++) {
        cmd.run('google-chrome --disable-web-security --user-data-dir --app=http://localhost/ShootFishNengiJS/');
      }
    },60*60*1000)
    setInterval(()=>{
      if (!neatManager.havePlayerProcessing()) {
        cmd.run('killall chrome');
        for (var i = 0; i < Define.NUM_CLIENT; i++) {
          cmd.run('google-chrome --disable-web-security --user-data-dir --app=http://localhost/ShootFishNengiJS/');
        }
      }
    },60*1000)
    cmd.run('killall chrome');
    for (var i = 0; i < Define.NUM_CLIENT; i++) {
      cmd.run('google-chrome --disable-web-security --user-data-dir --app=http://localhost/ShootFishNengiJS/');
    }
    // cmd.run('i3-msg \'workspace $ws1 ;  append_layout /media/Data/Code/NodeJS/shipwar-ai-learning/workspace-1.json\'')
  }
})

app.get('/api/bot_struct',(req,res)=>{
  let respone ={}
  let data = neatManager.getPlayer()
  if (data) {
    respone.index = data.index
    console.log('sent ',data.index)
    respone.network = data.data.toJSON()
    res.send(JSON.stringify(respone))
  }else{
    res.status(404).send('no available bot')
  }
})

app.post('/api/bot_struct',(req,res)=>{
  neatManager.setScore(req.body.index,req.body.score)
  res.send(JSON.stringify({OK:'OK'}))
})

app.get('/api/keep_alive',(req,res)=>{
  neatManager.keepAlive(req.query.index)
  res.send(JSON.stringify({OK:'OK'}))
})

app.post('/api/training_data',(req,res)=>{
  console.log('received Data',req.body.data.length)
  neatManager.writeTrainingData(req.body.data)

  res.send(JSON.stringify({OK:'OK'}))
})


setInterval(()=>{

})
