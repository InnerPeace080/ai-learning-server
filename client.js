var cmd=require('node-cmd');
const Define = require('./Define')

  setInterval(()=>{
    cmd.run('killall chrome');
    for (var i = 0; i < Define.NUM_CLIENT; i++) {
      cmd.run('google-chrome --disable-web-security --user-data-dir --app=http://makipos-smarthome.ddns.net:10001/');
    }
  },60*60*1000)

  cmd.run('killall chrome');
  for (var i = 0; i < Define.NUM_CLIENT; i++) {
    cmd.run('google-chrome --disable-web-security --user-data-dir --app=http://makipos-smarthome.ddns.net:10001/');
  }
  // cmd.run('i3-msg \'workspace $ws1 ;  append_layout /media/Data/Code/NodeJS/shipwar-ai-learning/workspace-1.json\'')
