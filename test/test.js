var cmj = require('../cmj.js')
var ConfigManager = cmj.ConfigManager;
var UnresolvedVariablesError =  cmj.UnresolvedVariablesError
var cm = new ConfigManager();

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;

describe('Config manager', function(){
    
  it ('should return config for the app', function(){
    cm.setApp('App1', {
        'config': `proxy={{proxy}}, port={{port}}`,
        'port': '8081'
      });

    cm.setTag('App1', 'NYDC', {'proxy': 'nyproxy.company.org'});
    cm.setTag('App1', 'LDNDC', {'proxy': 'ldnproxy.company.org'});
    
    return Promise.all([
      expect(cm.getConfig('App1', ['NYDC']))
        .to.eventually.include({name: 'App1'})
        .and.have.deep.property('vars.config')
          .to.be.equal(`proxy=nyproxy.company.org, port=8081`),
      expect(cm.getConfig('App1', ['LDNDC']))
        .to.eventually.include({name: 'App1'})
        .and.have.deep.property('vars.config')
          .to.be.equal(`proxy=ldnproxy.company.org, port=8081`),
      ]);          
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
    return Promise.all([
      expect(cm.getConfig('App2', ['asia', 'prod']))
        .to.eventually.have.deep.property('vars.config')
        .equal('Region: asia, Env: prod, DB: asia_prod_db'),
      expect(cm.getConfig('App2', ['asia', 'qa']))
        .to.eventually.have.deep.property('vars.config')
        .equal('Region: asia, Env: qa, DB: asia_qa_db'),
      expect(cm.getConfig('App2', ['us', 'prod']))
        .to.eventually.have.deep.property('vars.config')
        .equal('Region: us, Env: prod, DB: us_prod_db'),
      expect(cm.getConfig('App2', ['us', 'qa']))
        .to.eventually.have.deep.property('vars.config')
        .equal('Region: us, Env: qa, DB: us_qa_db'),
    ]);    
  });
  
  describe('should report unresolved vars', function(){
    it('one level deep', function(){
      return expect(cm.getConfig('App2', []))
        .to.be.rejected.and.eventually
        .be.an.instanceOf(UnresolvedVariablesError)
        .and.have.property('unresolvedVars')
          .that.has.same.members(['region', 'env', 'db']);
    });

    it('one level partly resolved', function(){
      return expect(cm.getConfig('App2', ['prod']))
        .to.be.rejected.and.eventually
        .and.have.property('unresolvedVars')
          .that.has.same.members(['region', 'db']);
    });
    
    it('second level deep', function(){
      cm.setApp('App2l', {'config': `prop1: {{value1}}, prop2: {{value2}}`});
      cm.setTag('App2l', 'level1', {'value1': '{{value11}}'});
      return expect(cm.getConfig('App2l', ['level1']))
        .to.be.rejected.and.eventually
        .and.have.property('unresolvedVars')
          .that.has.same.members(['value2', 'value11']);
    });
  });
  
});