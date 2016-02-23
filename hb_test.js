var Handlebars = require('handlebars');
var templateStr = `Hi there. This is {{name}}`;

var template = Handlebars.compile(templateStr);

var data = {name: 'Alex'};

var result = template(data);

console.log(result);


var ast = Handlebars.parse(templateStr);
console.log(JSON.stringify(ast, null, 2));

var Visitor = Handlebars.Visitor;

function ImportScanner() {
  this.partials = [];
}

ImportScanner.prototype = new Visitor();

ImportScanner.prototype.MustacheStatement = function(partial) {
  this.partials.push(partial.path.original);

  Visitor.prototype.MustacheStatement.call(this, partial);
};

var scanner = new ImportScanner();
scanner.accept(ast);
console.log(scanner.partials);