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

//Define some errors
function UnresolvedVariablesError(message, unresolvedVars) {
  this.name = 'UnresolvedVariablesError';
  this.message = message;
  this.unresolvedVars = unresolvedVars;
}
UnresolvedVariablesError.prototype = Object.create(Error.prototype);
UnresolvedVariablesError.prototype.constructor = UnresolvedVariablesError;

function VariablesConflictError(message, conflictedVar, conflictedTags) {
  this.name = 'VariablesConflictError';
  this.message = message;
  this.conflictedVar = conflictedVar;
  this.conflictedTags = conflictedTags;
}
VariablesConflictError.prototype = Object.create(Error.prototype);
VariablesConflictError.prototype.constructor = VariablesConflictError;

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
    normalizedTagName = tagName.slice().sort().join('+');
  } else {
    throw new Error('Unsupported tag name type');
  }
  //console.log(`Normalized name >${normalizedTagName}<` ); 
  return normalizedTagName; 
}

ConfigManager.prototype.setTag = function setTag(appName, tagName, tagProps) {
  var app = this.apps[appName]; //todo: handle no app
  app.tags[getNormalizedTagName(tagName)] = extendProps(tagProps);  
}

function collectContextProps(context, props, sourceName) {
    Object.keys(props).forEach(function (variable){
      var varValue = props[variable];
      var existingVar = context[variable];
      if (existingVar) { //var already exists
        console.log("Conflict for " + variable+": " + existingVar.source + " vs " + sourceName);
        throw new VariablesConflictError('Variables Conflict', variable, [existingVar.source, sourceName])
      } else { //new var
        context[variable] = {
          value: varValue.value,
          dependsOn: varValue.dependsOn,
          isTemplate: varValue.isTemplate,
          source: sourceName
        };
      }
    });
}

ConfigManager.prototype.collectContext = function collectContext(context, appName, tags) {
  var self = this;
  tags.forEach(function(name){
    //console.log(`Collecting ${name}`);
    if (name) {
      collectContextProps(context, self.apps[appName].tags[name], name)
    }
  });
}

function resolveVar(name, context, unresolved){
  //console.log(`Resolving var ${name}`);
  var curr = context[name];
  if (!curr.isTemplate) {
    //console.log(`Not a template returning ${curr.value}`);
    return curr.value;
  } else {
    var intContext = {};
    //check deps
    //console.log('Var is a template checking dependencies');
    curr.dependsOn.forEach(function(depName){
      //console.log(`Checking dep ${depName}`);
      var dep = context[depName];
      if (typeof dep === 'undefined') { //this is a missing dependency
        unresolved.push(depName);
        intContext[depName] = '_UNRESOLVED_';
      } else {
        if (dep.isTemplate) {
          dep.value = resolveVar(depName, context, unresolved);
          dep.isTemplate = false;
        }
        intContext[depName] = dep.value;      
      }

    });
    var template = Handlebars.compile(curr.value);
    //curr.value = template(context);
    //curr.isTemplate = false
    return template(intContext);
  }
}

ConfigManager.prototype.getConfig = function getConfig(appName, tags){
  var self = this
  return new Promise(function(resolve, reject){
    var app = self.apps[appName];
    var res = {name: appName, vars: {}, unresolvedVars: []};
    var context = {};
    collectContextProps(context, app.props);
    self.collectContext(context, appName, tags);
    if (tags.length >= 2){
      self.collectContext(context, appName, [getNormalizedTagName(tags)]);
    }
    //console.log(JSON.stringify(context, null, 2));
    
    Object.keys(app.props).forEach(function(name){
      context[name] = app.props[name];
      res.vars[name] = resolveVar(name, context, res.unresolvedVars);
      //console.log(JSON.stringify(res.vars[name], null, 2));
    });
    
    if (res.unresolvedVars.length > 0) {
      return reject(new UnresolvedVariablesError("Can't resolve variables", res.unresolvedVars));
    }
    //console.log(JSON.stringify(context, null, 2));
    //res.fullyResolved = res.unresolvedVars.length === 0;
    resolve(res); 
  });
}

module.exports = {
  ConfigManager: ConfigManager,
  UnresolvedVariablesError: UnresolvedVariablesError,
  VariablesConflictError: VariablesConflictError
}