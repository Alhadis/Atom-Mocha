"use strict";

const fs     = require("fs");
const path   = require("path");
const Mocha  = require("mocha");
const Chai   = require("./chai-extras");


class AtomMocha{
	
	constructor(args){
		this.headless = args.headless;
		
		let options = {
			bail:            false,
			enableTimeouts:  true,
			fgrep:           null,
			grep:            null,
			reporter:        "spec",
			reporterOptions: {},
			retries:         0,
			slow:            75,
			timeout:         2000,
			ui:              "bdd",
			useColors:       true
		};
		
		/** We have a head */
		if(!this.headless){
			options.useColors = false;
			options.reporter  = require("./reporter/reporter");
			options.reporterOptions = {
				formatCode: true,
				autoIt:     true
			};
		}
		
		this.runner = new Mocha(options);
		this.loadTests(args.testPaths);
		this.reporter = this.runner._reporter;
		this.setup(args);
	}
	
	
	/** Configure Atom's test environment */
	setup(args){
		
		const applicationDelegate = args.buildDefaultApplicationDelegate();
		window.atom = args.buildAtomEnvironment({
			applicationDelegate,
			window,
			document,
			configDirPath: process.env.ATOM_HOME,
			enablePersistence: false
		});
		
		/** Shiv to let Mocha print to STDOUT/STDERR with unmangled feedback */
		if(this.headless){
			const {remote} = require("electron");
			const {format} = require("util");
			
			Object.defineProperties(process, {
				stdout: {value: remote.process.stdout},
				stderr: {value: remote.process.stderr}
			});
			
			const stdout = (...x) => process.stdout.write(format(...x) + "\n");
			const stderr = (...x) => process.stderr.write(format(...x) + "\n");
			console.info = console.log   = stdout;
			console.warn = console.error = stderr;
		}
	}
	
	
	/**
	 * Find and load specs from a list of directories.
	 *
	 * @param {Array} paths
	 */
	loadTests(paths){
		
		for(let testPath of paths){
			const files = fs.readdirSync(testPath);
			
			for(let file of files){
				const filePath = path.join(testPath, file);
				
				/** HACK: Help Mocha find/load option-files */
				if(!this.headless && "mocha.opts" === file){
					
					/** Only do this once */
					if(process.env.LOADED_MOCHA_OPTS){
						const holdEm   = process.argv;
						process.argv   = ["--opts", path];
						require("mocha/bin/options")();
						const yoink    = process.argv;
						process.argv   = holdEm;
					}
				}
				
				else if(/-spec\.(?:coffee|js)$/i.test(file))
					this.runner.addFile(filePath);
			}
		}
	}
	
	
	
	/** Start Mocha. Called by Atom's test-runner API */
	run(){
		const run = new Promise(resolve =>
			this.runner.run(failures => resolve(failures))
		);
		return this.reporter.loadHighlighter
			? this.reporter.loadHighlighter().then(_ => run)
			: run;
	}
}

module.exports = AtomMocha;
