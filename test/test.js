var cm = require('../cmj.js');
var expect = require('chai').expect;

describe('Config manager', function(){
    
  it ('should return config for the app', function(){
    cm.setApp('App1', {
        'config': `proxy={{proxy}}, port={{port}}`,
        'port': '8081'
      });

    cm.setTag('App1', 'NYDC', {'proxy': 'nyproxy.company.org'});
    cm.setTag('App1', 'LDNDC', {'proxy': 'ldnproxy.company.org'});
    
    var confNy = cm.getConfig('App1', ['NYDC']);
    expect(confNy).to.exist;
    expect(confNy.name).to.equal('App1');
    expect(confNy.vars['config']).to.equal(
      `proxy=nyproxy.company.org, port=8081`);
      
    var confLdn = cm.getConfig('App1', ['LDNDC']);   
    expect(confLdn).to.exist;
    expect(confLdn.name).to.equal('App1');
    expect(confLdn.vars['config']).to.equal(
      `proxy=ldnproxy.company.org, port=8081`);
  });
  
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

  it('should support dependencies matrix', function(){    
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
  
  describe('should report unresolved vars', function(){
    it('one level deep', function(){
      var conf1 = cm.getConfig('App2', []);
      expect(conf1.unresolvedVars).to.have.same.members(['region', 'env', 'db']);  
    });

    it('one level partly resolved', function(){
      var conf1 = cm.getConfig('App2', ['prod']);
      expect(conf1.unresolvedVars).to.have.same.members(['region', 'db']);  
    });
    
    it('second level deep', function(){
      cm.setApp('App2l', {'config': `prop1: {{value1}}, prop2: {{value2}}`});
      cm.setTag('App2l', 'level1', {'value1': '{{value11}}'});
      var config = cm.getConfig('App2l', ['level1']);
      expect(config.unresolvedVars).to.have.same.members(['value2', 'value11']);
    });
  });
  
});