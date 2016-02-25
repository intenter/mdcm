var cm = require('../cmj.js');
var expect = require('chai').expect;



describe('Config manager', function(){
  cm.setVars({
    'name': 'NYDC',
    'vars': {
      'dcName': 'New York DC',
      'proxy': 'nyproxy.company.org'
    }
  });

  cm.setVars({
    'name': 'LDNDC',
    'vars': {
      'dcName': 'London DC',
      'proxy': 'ldnproxy.company.org'
    }
  });

  cm.setVars({
    'name': 'App1',
    'vars': {
      'config.ini': 
      `#This is config file for the App1
proxy={{proxy}}
port={{port}}`,
      'port': '8081'
    }
  });
  
    
  it ('Should return config for the app', function(){
    var conf = cm.getConfig(['App1', 'NYDC']);
    console.log(JSON.stringify(conf, null, 2));

    expect(conf).to.exist;
    expect(conf.name).to.equal('App1');
    expect(conf.vars['config.ini']).to.equal(`#This is config file for the App1
proxy=nyproxy.company.org
port=8081`);
  })
});