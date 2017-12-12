const WebSocket = require('ws');

const neatManager = require('./NeatManager')


const wss = new WebSocket.Server({ port: 60606 });

neatManager.initNeat({training:false},()=>{
    // neatManager.startEvaluation()
    neatManager.train()
})

wss.on('listening', (arg)=> {
  console.log('listening',arg)
})

wss.on('close', (arg)=> {
  console.log('close',arg)
})

wss.on('error', (arg)=> {
  console.log('error',arg)
})

wss.on('connection',(ws)=> {
  ws.myData ={}
  console.log('new connection ');
  ws.on('message', (message)=> {
    // console.log('received: %s', message);
    // var index
    switch (message) {
      case 'getBot':{
        let network
        neatManager.getPlayer((index,data)=>{
            ws.myData.index = index
            network = data
            console.log('send',ws.myData.index)
            try{
              ws.send('getBot:' + JSON.stringify(network.toJSON()));
            }catch(err){
              neatManager.setStopProcess(ws.myData.index)
              console.log(err)
            }
        })

        break;
      }
      default:{
        if (message.indexOf('sendBotRet:') === 0) {
          if (ws.myData.index !== undefined) {
            neatManager.setScore(ws.myData.index,parseInt(message.slice(11)))
            neatManager.onHaveNewPlayer(()=>{
              try{
                console.log('send requestGetNewBot')
                ws.send('requestGetNewBot:')
              }catch(err){console.log(err)}
            })
          }
        }else if(message.indexOf('sentTrainingData:') === 0){
          let data = JSON.parse(message.slice(17) )
          console.log('received Data',data)
          neatManager.writeTrainingData(data)
        }
      }
    }

  });

  ws.on('close', ()=> {
    console.log('close ',ws.myData.index)
    neatManager.setStopProcess(ws.myData.index)
  })
  ws.on('error', ()=> {
    console.log('error ',ws.myData.index)
    neatManager.setStopProcess(ws.myData.index)
  })


  // ws.send('something');
});
