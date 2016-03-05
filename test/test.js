var cm = require('../cmj.js');
var expect = require('chai').expect;

describe('Config manager', function(){
    
  it ('Should return config for the app', function(){
    cm.setApp('App1', {
        'config.ini': 
        `#This is config file for the App1
proxy={{proxy}}
port={{port}}`,
        'port': '8081'
      });

    cm.setTag('App1', 'NYDC', {
        'dcName': 'New York DC',
        'proxy': 'nyproxy.company.org'
    });

    cm.setTag('App1', 'LDNDC', {
        'dcName': 'London DC',
        'proxy': 'ldnproxy.company.org'
    });
    
    var conf = cm.getConfig('App1', ['NYDC']);
    //console.log(JSON.stringify(conf, null, 2));

    expect(conf).to.exist;
    expect(conf.name).to.equal('App1');
    expect(conf.vars['config.ini']).to.equal(`#This is config file for the App1
proxy=nyproxy.company.org
port=8081`);
  });
  
  it('Should support dependencies matrix', function(){
    cm.setApp('App2', {
      'config':`Region: {{region}}, Env: {{env}}, DB: {{db}}`
    });
    cm.setTag('App2', 'asia', {'region': 'asia'});
    cm.setTag('App2', 'us', {'region': 'us'});
    cm.setTag('App2', 'prod', {'env': 'prod'});
    cm.setTag('App2', 'qa', {'env': 'qa'});
    cm.setTag('App2', ['asia', 'prod'], {'db': 'asia_prod_db'});
    cm.setTag('App2', ['asia', 'qa'], {'db': 'asia_qa_db'});
    cm.setTag('App2', ['us', 'prod'], {'db': 'us_prod_db'});
    cm.setTag('App2', ['us', 'qa'], {'db': 'us_qa_db'});
    
    var asiaProd = cm.getConfig('App2', ['asia', 'prod']);
    expect(asiaProd.vars['config']).to.equal(
      'Region: asia, Env: prod, DB: asia_prod_db');
    var asiaQa = cm.getConfig('App2', ['asia', 'qa']);
    expect(asiaQa.vars['config']).to.equal(
      'Region: asia, Env: qa, DB: asia_qa_db');
    var usProd = cm.getConfig('App2', ['us', 'prod']);
    expect(usProd.vars['config']).to.equal(
      'Region: us, Env: prod, DB: us_prod_db');
    var usQa = cm.getConfig('App2', ['us', 'qa']);
    expect(usQa.vars['config']).to.equal(
      'Region: us, Env: qa, DB: us_qa_db');
    
  });
  
});