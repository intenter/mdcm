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


ConfigManager.prototype.collectContext = function collectContext(tags) {
  var context = {};
  var self = this;
  tags.forEach(function(name){
    console.log(`Collecting ${name}`);
    var varsSet = self.vars[name].vars;
    Object.keys(varsSet).forEach(function (variable){
      var varValue = varsSet[variable];
      context[variable] = {
        value: varValue.value,
        dependsOn: varValue.dependsOn,
        isTemplate: varValue.isTemplate
      };
    });
  });
  return context;
}

function resolveVar(name, context){
  var curr = context[name];
  if (!curr.isTemplate) {
    return curr.value;
  } else {
    var intContext = {};
    //check deps
    curr.dependsOn.forEach(function(depName){
      var dep = context[depName];
      if (dep.isTemplate) {
        dep.value = resolveVar(depName, context);
        dep.isTemplate = false;
      }
      intContext[depName] = dep.value;
    });
    var template = Handlebars.compile(curr.value);
    //curr.value = template(context);
    //curr.isTemplate = false
    return template(intContext);
  }
}

ConfigManager.prototype.getConfig = function getConfig(tags){
  var first = this.vars[tags[0]];
  var res = {name: first.name, vars: {}};
  var context = this.collectContext(tags);
  
  Object.keys(first.vars).forEach(function(name){
    res.vars[name] = resolveVar(name, context);
    console.log(JSON.stringify(res.vars[name], null, 2));
  });
  
  //console.log(JSON.stringify(context, null, 2));
   
  return res; 
}

module.exports = new ConfigManager();