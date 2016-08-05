"use strict";

/** Core NodeJS modules */
const fs     = require("fs");
const path   = require("path");


/** Bring on a real test-runner */
const Mocha = require("mocha");
const Chai  = require("chai");
Chai.should();


/** Check if an element contains one or more CSS classes */
Chai.Assertion.addMethod("class", function(classNames){
	const subject   = Chai.util.flag(this, "object");
	const classList = subject.classList;
	
	if(!Array.isArray(classNames))
		classNames = classNames.split(/\s+/g);
	
	for(let name of classNames){
		this.assert(
			classList.contains(name),
			"expected classList '" + subject.className + "' to include #{exp}",
			"expected classList '" + subject.className + "' not to include #{exp}",
			name
		);
	}
});


const patchReporter = require("./reporter-patch");

module.exports = function(args){

	const tests = new Mocha({
		ui: "bdd",
		reporter: "html"
	});
	
	const feedback = document.createElement("div");
	feedback.id    = "mocha";
	document.body.appendChild(feedback);
	
	window.atom = args.buildAtomEnvironment({
		applicationDelegate: args.buildDefaultApplicationDelegate(),
		window,
		document,
		configDirPath: process.env.ATOM_HOME,
		enablePersistence: false
	});
	
	patchReporter(tests._reporter, atom);
	document.title = "Terminal Emulator Emulator";
	
	/** Running in an Atom window */
	if(!args.headless){
		
		/** Attach our own styling */
		const stylePath   = path.resolve(__dirname, "..", "test-runner.css");
		const styleSource = fs.readFileSync(stylePath).toString();
		
		atom.styles.addStyleSheet(styleSource, {
			sourcePath: stylePath,
			priority:   3
		});
		
		/** Add something retarded to make inspecting the workspace layer easier */
		Object.defineProperty(window, "hide", {
			get: function(){  feedback.classList.add("hide"); },
			set: function(i){ feedback.classList.toggle("hide", i); }
		});
	}
	
	
	for(let testPath of args.testPaths){
		const files = fs.readdirSync(testPath);
		
		for(let file of files)
			if(file !== __filename && /-spec\.(?:coffee|js)$/i.test(file))
				tests.addFile(path.join(testPath, file));
	}
	
	return new Promise ((resolve, reject) => {
		return tests.run(failures => resolve(failures));
	});
}
