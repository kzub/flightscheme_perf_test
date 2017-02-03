var fs = require('fs');
var async = require('async');
var context = JSON.parse(fs.readFileSync('../testdata/context.json'));
var testdata = JSON.parse(fs.readFileSync("../testdata/conditions.json"));
var conditions = require('./flightscheme');

var testCases = [];
var testCasesNumber = 45000;

for (var i = 0; i < testCasesNumber; i += testdata.length) {
    for (var testId in testdata) {
        testCases.push({
            params: testdata[testId].params,
            op: testdata[testId].op
        });
    }
}

var start = Date.now();
async.eachLimit(testCases, 50, iteratee, function finish() {
    var end = Date.now();
    console.log("time elapsed:", end - start, ' test cases:', testCases.length);
});

function iteratee(task, callback) {
    conditions.FlightScheme.execute(context, task.params, task.op, function() {
        setImmediate(callback);
    });
}