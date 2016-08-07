"use strict";

const fs     = require("fs");
const path   = require("path");
const Mocha  = require("mocha");
const Chai   = require("./chai-extras");
Chai.should();


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
			options.reporter  = "html";
		}
		
		this.runner = new Mocha(options);
		this.loadTests(args.testPaths);
		
		
		/** Start setting up Atom's test environment */
		const applicationDelegate = args.buildDefaultApplicationDelegate();
		window.atom = args.buildAtomEnvironment({
			applicationDelegate,
			window,
			document,
			configDirPath: process.env.ATOM_HOME,
			enablePersistence: false
		});
		
		this.buildEnv();
	}
	
	
	buildEnv(args){
		
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
		
		/** Pour a glass of DOM juice for Atom's spec-runner window */
		else{
			require("./reporter").patchCodeBlocks(this.runner._reporter, atom);
			
			const feedback = document.createElement("div");
			feedback.id    = "mocha";
			document.title = "Mocha";
			document.body.appendChild(feedback);
			
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
		return new Promise (resolve =>
			this.runner.run(failures => resolve(failures))
		);
	}
}

module.exports = AtomMocha;
