function ConfigManager(){
  this.vars = {};
}

ConfigManager.prototype.setVars = function setVars(varsDef){    
  this.vars[varsDef.name] = varsDef; 
};

ConfigManager.prototype.getConfig = function getConfig(appName, tags){
  var app = this.vars[appName];
  return app; 
}

module.exports = new ConfigManager();