"use strict";

/** Bring on a real test-runner */
const Mocha        = require("mocha");
const Chai         = require("./chai-extras");
Chai.should();

/** Package interfaces */
const Setup        = require("./setup");
const Reporter     = require("./reporter");


module.exports = function(args){
	const options  = Setup.getOptionDefaults(args);
	const tests    = Setup.loadTests(args);
	const runner   = new Mocha(options);
	
	Reporter.kludgeEmAll(args, runner);
	tests.forEach(test => runner.addFile(test));
	
	return new Promise ((resolve, reject) => {
		return runner.run(failures => resolve(failures));
	});
}
