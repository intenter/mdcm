//ast visitor for handlebas
var Handlebars = require('handlebars');
var Visitor = Handlebars.Visitor;

function NamesScanner() {
  this.names = [];
}

NamesScanner.prototype = new Visitor();
NamesScanner.prototype.MustacheStatement = function(statement) {
  this.names.push(statement.path.original);
  Visitor.prototype.MustacheStatement.call(this, statement);
};

//Config Manager itself
function ConfigManager(){
  this.vars = {};
}

ConfigManager.prototype.setVars = function setVars(varsDef){
  var def = {name: varsDef.name, vars: {}};
  Object.keys(varsDef.vars).forEach(function (key) {
    var templateString = varsDef.vars[key];
    var ast = Handlebars.parse(templateString);
    var namesScanner = new NamesScanner();
    namesScanner.accept(ast);
    var varDef = {
      name: key, 
      value: templateString, 
      dependsOn: namesScanner.names,
      isTemplate: namesScanner.names.length > 0
      };
    def.vars[key] = varDef;
  });
  this.vars[varsDef.name] = def; 
};

ConfigManager.prototype.getConfig = function getConfig(appName, tags){
  var app = this.vars[appName];
  return app; 
}

module.exports = new ConfigManager();