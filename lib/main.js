"use strict";

const fs     = require("fs");
const path   = require("path");
const Mocha  = require("mocha");
const Chai   = require("./chai-extras");


class AtomMocha{
	
	constructor(args){
		
		/** Load and manage configuration */
		this.headless = args.headless;
		this.files    = this.getFiles(args.testPaths);
		this.options  = this.getOptions(this.files, args);
		
		/** Talk to Mocha */
		this.runner   = new Mocha(this.options);
		this.reporter = this.runner._reporter;
		
		/** Tell it what specs to load */
		this.files.specs.forEach(s => {
			this.runner.addFile(s);
		});
		
		/** Finally, initialise Atom's test environment */
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
	 * The returned object contains two arrays: "specs" and "opts",
	 * for loaded spec files and `mocha.opts` files, respectively.
	 *
	 * TODO: Add support for loading multiple option files.
	 *
	 * @param {Array} paths
	 * @return {Object} files
	 */
	getFiles(paths){
		const specs = [];
		const opts  = [];
		
		for(let testPath of paths){
			const stats = fs.statSync(testPath);
			
			/** Individually-specified spec file */
			if(stats.isFile())
				specs.push(testPath);
			
			/** Folder of specs and possible configuration files */
			else if(stats.isDirectory()){
				for(let file of fs.readdirSync(testPath)){
					const filePath = path.join(testPath, file);
					
					if("mocha.opts" === file)
						opts.push(file);
					
					else if(/-spec\.(?:coffee|js)$/i.test(file))
						specs.push(filePath);
				}
			}
		}
		
		return {specs, opts};
	}
	
	
	
	getOptions(files, args){
		const {specs, opts} = files;
		
		const defaults = {
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
		if(!args.headless){
			defaults.useColors       = false;
			defaults.reporter        = require("./reporter");
			defaults.formatCode      = true;
			defaults.reporterOptions = {autoIt: true};
		}
		
		return defaults;
	}
	
	
	
	/**
	 * HACK: Use Mocha's own option-handling to parse `mocha.opts` files.
	 *
	 * This offers better stability than writing our own parsing logic.
	 * We can't assume Mocha's interpretation of these files is set in
	 * stone, and this approach spares us from updating too much of our
	 * own code. Still a seriously ugly/hacky way to do this, though.
	 *
	 * @param {String} path - Path pointing to a "mocha.opts" file
	 * @return {Array} opts - Options that Mocha tried storing in process.argv
	 */
	parseMochaOpts(path){
		process.env.LOADED_MOCHA_OPTS = false;
		const argv   = process.argv;
		process.argv = ["--opts", filePath];
		require("mocha/bin/options")();
		const result = process.argv;
		process.argv = argv;
		return result;
	}
	
	
	/** Start Mocha. Called by Atom's test-runner API */
	run(){
		let run = Promise.resolve();
		
		if("function" === typeof this.reporter.beforeStart)
			run = this.reporter.beforeStart(this);
		
		return run.then(_=> this.runner.run());
	}
}

module.exports = AtomMocha;
