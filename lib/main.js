"use strict";

const fs       = require("fs");
const path     = require("path");
const Mocha    = require("mocha");
const Chai     = require("chai");
const getOpt   = require("get-options");
const Electron = require("electron");
const {New, addTo, regexFromString} = require("./utils");


class AtomMocha{
	
	constructor(args){
		
		// Load and manage configuration
		this.headless = args.headless;
		this.files    = this.getFiles(args.testPaths);
		this.options  = this.getOptions(this.files, args);
		this.files    = this.filterSpecs(this.files.specs);
		
		// Activate extensions, unless instructed not to
		this.options.noExtensions || require("./extensions");
		
		// Talk to Mocha
		this.mocha = new Mocha(this.options);
		this.reporter = this.mocha._reporter;
		
		// Tell it what specs to load
		this.files.forEach(s => this.mocha.addFile(s));
		
		// Finally, initialise Atom's test environment
		this.setup(args);
		
		// Globalise `AtomMocha` instance.
		global.AtomMocha = this;
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
		
		// Shiv to let Mocha print to STDOUT/STDERR with unmangled feedback
		if(this.headless){
			const {remote} = Electron;
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
		
		// Prep the spec-runner window if we're using Mocha's HTML reporter
		if("html" === this.options.reporter){
			document.querySelector("atom-styles").remove();
			addTo(document.body)(New("div", {id: "mocha"}))
			addTo(document.head)(New("link", {
				type: "text/css",
				rel: "stylesheet",
				href: require.resolve("mocha/mocha.css")
			}))
		}
	}
	
	
	/**
	 * Locate specs and configs in the specified directories.
	 *
	 * The returned object contains two arrays: "specs" and "opts",
	 * for loaded spec files and `mocha.opts` files, respectively.
	 *
	 * @todo Add support for loading multiple option files.
	 * @param {Array} paths
	 * @return {Object}
	 */
	getFiles(paths){
		const specs = [];
		const opts  = [];
		
		for(let testPath of paths){
			const stats = fs.statSync(testPath);
			
			// Individually-specified file
			if(stats.isFile()){
				
				// This is an options file, not a spec
				if(/[\\/]mocha.opts$/.test(testPath))
					opts.push(testPath);
				
				else specs.push(testPath);
			}
			
			// Folder of specs and possible configuration files
			else if(stats.isDirectory()){
				for(let file of fs.readdirSync(testPath)){
					const filePath = path.join(testPath, file);
					
					if("mocha.opts" === file)
						opts.push(filePath);
					
					// Toss it in as a spec, we'll filter it later
					else specs.push(filePath);
				}
			}
		}
		
		return {specs, opts};
	}
	
	
	/**
	 * Load and resolve runtime options, handling defaults when necessary.
	 *
	 * @param {Array} files - Paths loaded by getFiles()
	 * @param {Object} args - Arguments supplied by Atom's test-runner API
	 * @return {Object} An object to pass directly to Mocha
	 */
	getOptions(files, args){
		const {specs, opts} = files;
		const {findBasePath} = require("./utils");

		const opt = {
			
			// Spec-runner options
			autoIt:          false,
			autoScroll:      true,
			formatCode:      true,
			escapeHTML:      true,
			clipPaths:       true,
			linkPaths:       true,
			slide:           true,
			minimal:         false,
			title:           "Mocha",
			
			// Mocha options
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
		
		// Locate the package's "package.json" file
		let basePath = findBasePath([...specs, ...opts]);
		while(basePath && basePath !== "/"){
			const packagePath = path.join(basePath, "package.json");
			
			if(fs.existsSync(packagePath)){
				try{
					let data = require(packagePath);
					this.packagePath = basePath;
					
					// Assign options from an object read from package.json
					const grabOptions = (data) => {
						Object.assign(opt, data.mocha || {});
						
						// Load Atom-Mocha's options
						if(null != data.slide)        opt.slide        = data.slide;
						if(null != data.title)        opt.title        = data.title;
						if(null != data.autoIt)       opt.autoIt       = data.autoIt;
						if(null != data.minimal)      opt.minimal      = data.minimal;
						if(null != data.clipPaths)    opt.clipPaths    = data.clipPaths;
						if(null != data.linkPaths)    opt.linkPaths    = data.linkPaths;
						if(null != data.formatCode)   opt.formatCode   = data.formatCode;
						if(null != data.escapeHTML)   opt.escapeHTML   = data.escapeHTML;
						if(null != data.escapeHtml)   opt.escapeHTML   = data.escapeHtml;
						if(null != data.autoScroll)   opt.autoScroll   = data.autoScroll;
						if(null != data.hidePending)  opt.hidePending  = data.hidePending;
						if(null != data.hideStatBar)  opt.hideStatBar  = data.hideStatBar;
						if(null != data.specPattern)  opt.specPattern  = data.specPattern;
						if(null != data.stackFilter)  opt.stackFilter  = data.stackFilter;
						if(null != data.noExtensions) opt.noExtensions = data.noExtensions;
						
						if(null != data.js)  opt.js  = this.mergeAssets(opt.js,  this.resolveAssets(data.js,  this.packagePath));
						if(null != data.css) opt.css = this.mergeAssets(opt.css, this.resolveAssets(data.css, this.packagePath));
						
						// Paths to additional specs/options
						let {tests, optFiles} = data, extraPaths;
						tests      = Array.isArray(tests)    ? tests    : (tests    ? [tests]    : []);
						optFiles   = Array.isArray(optFiles) ? optFiles : (optFiles ? [optFiles] : []);
						extraPaths = tests.concat(optFiles);
						
						// If any were found, push them onto our existing lists
						if(extraPaths.length){
							extraPaths = this.getFiles(extraPaths.map(p => path.resolve(basePath, p)));
							if(extraPaths.opts.length)  opts.push(...extraPaths.opts);
							if(extraPaths.specs.length) files.specs.push(...extraPaths.specs);
						}
					};
					
					// We have options described in package.json
					if(data = data["atom-mocha"]){
						grabOptions(data);
						
						// Load any mode-specific options
						if(!args.headless && data.interactive) grabOptions(data.interactive);
						if( args.headless && data.headless)    grabOptions(data.headless);
					}
				}
				catch(e){ console.error(e) }
				break;
			}
			basePath = path.dirname(basePath);
		}
		
		
		// We found at least one "mocha.opts" file
		if(opts.length){
			let mochaOpts = this.parseMochaOpts(opts[0]);
			
			// Hack to stop getOpts treating the last option as a boolean
			mochaOpts.push("--delet=this");
			mochaOpts = getOpt(mochaOpts).options;
			delete mochaOpts.delet;
			delete mochaOpts.opts;
			
			// Resolve any CSS/JS paths relative to .opts file
			if(mochaOpts.css) opt.css = this.mergeAssets(opt.css, this.resolveAssets(mochaOpts.css, path.dirname(opts[0])));
			if(mochaOpts.js)  opt.js  = this.mergeAssets(opt.js,  this.resolveAssets(mochaOpts.js,  path.dirname(opts[0])));
			delete mochaOpts.css;
			delete mochaOpts.js;
			
			Object.assign(opt, mochaOpts);
		}
		
		
		
		// Handle any --require'd resources; Mocha doesn't check for it in the constructor
		if(opt.require){
			
			try{
				let mode;
				
				// Special scenario: activate Chai's assertion methods if given "chai/should" or whatever
				if(mode = opt.require.match(/chai\/(\w+)/i)){
					global.Chai = Chai;
					mode = mode[1].toLowerCase();
					
					// Store a global reference to the chosen assertion mode
					if("expect" === mode || "assert" === mode)
						global[mode] = Chai[mode];
					
					// … or activate Chai's "should"-style assertions
					else if("should" === mode)
						Chai.should();
					
					// Otherwise, die
					else throw new ReferenceError(`Unrecognised Chai assertion mode: ${mode}`);
				}
				
				else opt.require = require(opt.require);
			}
			catch(e){
				console.error(e);
			}
		}
		
		// Negate some boolean options that're enabled by default
		if(opt.noAutoScroll) opt.autoScroll = false;
		if(opt.noClipPaths)  opt.clipPaths  = false;
		if(opt.noLinkPaths)  opt.linkPaths  = false;
		if(opt.noFormatCode) opt.formatCode = false;
		if(opt.noSlide)      opt.slide      = false;
		if(opt.noEscapeHTML || opt.noEscapeHtml)
			opt.escapeHTML = false;
		
		
		// Don't enable the "autoIt" option unless BDD is being used
		if(opt.autoIt && ("bdd" !== opt.ui && null != opt.ui))
			opt.autoIt = false;
		
		// Disable coloured output if output is redirected
		if(!Electron.remote.process.stdout.isTTY)
			opt.useColors = false;
		
		// Always disable colours when running interactively
		if(!args.headless){
			opt.useColors = false;
			
			// Use default reporter if unspecified (or a console-only reporter)
			switch(opt.reporter){
				case "json-stream":
				case "json":
				case "landing":
				case "list":
				case "markdown":
				case "min":
				case "doc":
				case "nyan":
				case "progress":
				case "spec":
				case "tap":
				case "xunit":
				case undefined:
				case null:
					opt.reporter = "atom";
					break;
				
				// Activate minimal-mode if requesting the "dot" reporter
				case "dot":
					opt.minimal = true;
					opt.reporter = "atom";
					break;
			}
		}
		
		// Don't try using an HTML reporter when running headlessly
		else if("atom" === opt.reporter || "html" === opt.reporter)
			opt.reporter = "spec";
		
		// Finally, replace "atom" with a working instance of the default reporter
		if("atom" === opt.reporter)
			opt.reporter = require("./reporter");
		
		
		// Make sure patterns are actual regular expressions.
		opt.specPattern = regexFromString(opt.specPattern) || /[-_.](?:spec|test)\.(?:coffee|js)$/i;
		opt.stackFilter = regexFromString(opt.stackFilter) || /node_modules([\\\/])mocha(?:\1|\.js|[:\)])/;
		
		// Stop commas showing between words for multi-word titles
		if(Array.isArray(opt.title))
			opt.title = opt.title.join(" ");
		
		// Store the package's directory for the "clipPaths" option
		opt.packagePath = this.packagePath;
		return opt;
	}
	
	
	
	/**
	 * Purge an array of files that aren't specs.
	 *
	 * Because package.json is loaded *after* the testPaths have been scanned, it has the
	 * potential to modify the "specPattern" property that governs which files are picked
	 * up as specs. We do things this way because the testPaths determine where to search
	 * for package.json… and we can't always rely on the CWD to tell us where to look.
	 *
	 * @param {Array} paths
	 * @return {Array}
	 */
	filterSpecs(paths){
		const specs = [];
		const {specPattern} = this.options;
		
		for(const path of paths)
			if(specPattern.test(path))
				specs.push(path);
		return specs;
	}
	
	
	
	/**
	 * Attach any user-defined scripts or stylesheets.
	 *
	 * @param {Object} assets - Hash holding CSS/JS paths
	 * @return {Promise}
	 * @private
	 */
	attachAssets(assets){
		return new Promise(resolve => {
			if(assets.css){
				const {header, footer} = assets.css;
				if(header) header.forEach(s => this.attachStyle(s));
				if(footer) footer.forEach(s => this.attachStyle(s, true));
			}
			
			if(assets.js){
				const {header, footer} = assets.js;
				if(header) header.forEach(s => this.attachScript(s));
				if(footer) footer.forEach(s => this.attachScript(s, true));
			}
			resolve();
		});
	}
	
	
	/**
	 * Attach a user-supplied script to the test-runner environment.
	 *
	 * @param {String} path - Absolute path to script
	 * @param {Boolean} footer - Append to <html> instead of <head>
	 * @return {HTMLScriptElement}
	 * @private
	 */
	attachScript(path, footer = false){
		const el = New("script", {
			src: path,
			type: /\.coffee$/i.test(path)
				? "text/coffeescript"
				: "application/javascript"
		});
		addTo(footer ? document.documentElement : document.head)(el);
		return el;
	}
	
	
	/**
	 * Attach a user-supplied stylesheet to the test-runner environment.
	 *
	 * @param {String} path - Absolute path to stylesheet
	 * @param {Boolean} footer - Append to <html> instead of <head>
	 * @return {HTMLStyleElement}
	 * @private
	 */
	attachStyle(path, footer = false){
		const el = New("link", {
			type: "text/css",
			href: path,
			rel: /\.less$/i.test(path)
				? "stylesheet/less"
				: "stylesheet"
		});
		addTo(footer ? document.documentElement : document.head)(el);
		return el;
	}
	
	
	/**
	 * Normalise asset paths relative to a given directory.
	 *
	 * @param {Mixed} paths - Either a string, array or object
	 * @param {String} against - Path to resolve relative paths against
	 * @return {Object}
	 * @private
	 */
	resolveAssets(paths, against){
		if(!paths) return null;
		
		// Box any paths supplied as strings or arrays
		if("string" === typeof paths) paths = {header: [paths]};
		else if(Array.isArray(paths)) paths = {header: paths};
		
		else{
			if("string" === typeof paths.header) paths.header = [paths.header];
			if("string" === typeof paths.footer) paths.footer = [paths.footer];
			if(!paths.header && !paths.footer) return null;
		}
		
		// Resolve asset paths relative to a directory
		if(against)
			for(let k in paths) if(paths[k])
				paths[k] = paths[k].map(p => path.resolve(against, p));
		
		return paths;
	}
	
	
	/**
	 * Merge a normalised assets object into another.
	 *
	 * @param {Object} into - An object holding previously-resolved paths
	 * @param {Object} from - The new data to append
	 * @return {Object}
	 * @private
	 */
	mergeAssets(into, from){
		if(!into) return from;
		if(!from) return into;
		
		if(from.header) into.header = (into.header || []).concat(from.header);
		if(from.footer) into.footer = (into.footer || []).concat(from.footer);
		return into;
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
	 * @return {Array} Options that Mocha tried storing in process.argv
	 */
	parseMochaOpts(path){
		process.env.LOADED_MOCHA_OPTS = false;
		const argv   = process.argv;
		process.argv = ["--opts", path];
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
		
		// Add user-supplied DOM juice
		run = run.then(this.attachAssets(this.options));
		
		return run.then(_=> new Promise(resolve =>
			(this.runner = this.mocha.run(failures => resolve(failures)))
		));
	}
}

module.exports = AtomMocha;
