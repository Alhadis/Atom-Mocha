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
			options.reporter  = require("./reporter");
			options.reporterOptions = {
				formatCode: true,
				autoIt:     true
			};
		}
		
		const {specs, opts} = this.getFiles(args.testPaths);
		this.runner = new Mocha(options);
		specs.forEach(s => this.runner.addFile(s));
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
	 * Locate specs and configs in the specified directories.
	 *
	 * The returned object contains two arrays: "specs" and "opts", for
	 * loaded spec files and `mocha-opts` files, respectively.
	 *
	 * @param {Array} paths
	 * @return {Object} files
	 */
	getFiles(paths){
		const files = {
			specs: [],
			opts:  []
		};
		
		for(let testPath of paths){
			const dirFiles = fs.readdirSync(testPath);
			
			for(let file of dirFiles){
				const filePath = path.join(testPath, file);
				
				/** HACK: Help Mocha find/load option-files */
				if(!this.headless && "mocha.opts" === file){
					process.env.LOADED_MOCHA_OPTS = false;
					const argv   = process.argv;
					process.argv = ["--opts", filePath];
					require("mocha/bin/options")();
					files.opts.push(process.argv);
					process.argv = argv;
				}
				
				else if(/-spec\.(?:coffee|js)$/i.test(file))
					files.specs.push(filePath);
			}
		}
		
		return files;
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
