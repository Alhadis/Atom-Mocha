"use strict";

const fs   = require("fs");
const path = require("path");


class Setup{
	
	/**
	 * Return a hash of default option values.
	 *
	 * @param {Object} args - Arguments provided by test-runner API
	 * @return {Object}
	 */
	getOptionDefaults(args){
		return {
			bail:            false,
			enableTimeouts:  true,
			fgrep:           null,
			grep:            null,
			reporter:        args.headless ? "spec" : "html",
			reporterOptions: {},
			retries:         0,
			slow:            75,
			timeout:         2000,
			ui:              "bdd",
			useColors:       args.headless
		};
	}
	
	
	/**
	 * Collect a list of paths for each spec to run.
	 *
	 * @param {Object} args - Argument object provided by Electron
	 * @return {Array} paths
	 */
	loadTests(args){
		const tests = [];
		
		for(let testPath of args.testPaths){
			const files = fs.readdirSync(testPath);
			
			for(let file of files){
				const filePath = path.join(testPath, file);
				
				/** If we're not running headlessly, point Mocha to the option-file ourselves */
				if(!args.headless && "mocha.opts" === file)
					this.readMochaOpts(filePath);
				
				else if(/-spec\.(?:coffee|js)$/i.test(file))
					tests.push(filePath);
			}
		}
		
		return tests;
	}
	
	
	/**
	 * HACK: Load options from a "mocha.opts" file.
	 *
	 * @param {String} path - Full path of the .opts file
	 */
	readMochaOpts(path){
		
		/** Only do this once */
		if(process.env.LOADED_MOCHA_OPTS){
			const holdEm   = process.argv;
			process.argv   = ["--opts", path];
			require("mocha/bin/options")();
			const yoink    = process.argv;
			process.argv   = holdEm;
		}
	}
};


module.exports = new Setup;
