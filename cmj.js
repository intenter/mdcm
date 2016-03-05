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
  this.apps = {};
}

ConfigManager.prototype.setApp = function setApp(appName, appProps){
  //todo: hanle update
  this.apps[appName] = {name: appName, props: extendProps(appProps), tags: {}};
}

function extendProps(props){
  var res = {};
  Object.keys(props).forEach(function(propName){
    var templateString = props[propName];
    var ast = Handlebars.parse(templateString);
    var namesScanner = new NamesScanner();
    namesScanner.accept(ast);
    res[propName]= {
      value: templateString, 
      dependsOn: namesScanner.names,
      isTemplate: namesScanner.names.length > 0
      };
    
  });
  return res
}

function getNormalizedTagName(tagName) {
  var normalizedTagName;
  if (typeof tagName === 'string') {
    normalizedTagName = tagName;  
  } else if (Array.isArray(tagName)) {
    normalizedTagName = tagName.join('+');
  } else {
    throw new Error('Unsupported tag name type');
  } 
  return normalizedTagName; 
}

ConfigManager.prototype.setTag = function setTag(appName, tagName, tagProps) {
  var app = this.apps[appName]; //todo: handle no app
  app.tags[getNormalizedTagName(tagName)] = extendProps(tagProps);  
}

function collectContextProps(context, props) {
    Object.keys(props).forEach(function (variable){
      var varValue = props[variable];
      context[variable] = {
        value: varValue.value,
        dependsOn: varValue.dependsOn,
        isTemplate: varValue.isTemplate
      };
    });
}

ConfigManager.prototype.collectContext = function collectContext(context, appName, tags) {
  var self = this;
  tags.forEach(function(name){
    console.log(`Collecting ${name}`);
    collectContextProps(context, self.apps[appName].tags[name])
  });
}

function resolveVar(name, context){
  console.log(`Resolving var ${name}`);
  var curr = context[name];
  if (!curr.isTemplate) {
    console.log(`Not a template returning ${curr.value}`);
    return curr.value;
  } else {
    var intContext = {};
    //check deps
    console.log('Var is a template checking dependencies');
    curr.dependsOn.forEach(function(depName){
      console.log(`Checking dep ${depName}`);
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

ConfigManager.prototype.getConfig = function getConfig(appName, tags){
  var app = this.apps[appName];
  var res = {name: appName, vars: {}};
  var context = {};
  collectContextProps(context, app.props);
  this.collectContext(context, appName, tags);
  this.collectContext(context, appName, [getNormalizedTagName(tags)]);
  console.log(JSON.stringify(context, null, 2));
  
  Object.keys(app.props).forEach(function(name){
    context[name] = app.props[name];
    res.vars[name] = resolveVar(name, context);
    console.log(JSON.stringify(res.vars[name], null, 2));
  });
  
  //console.log(JSON.stringify(context, null, 2));
   
  return res; 
}

module.exports = new ConfigManager();