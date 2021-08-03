"use strict";

const fs       = require("fs");
const path     = require("path");
const Mocha    = require("mocha");
const Electron = require("electron");
const utils    = require("./utils.js");
const {New, addTo, regexFromString} = utils;


class AtomMocha{
	
	constructor(args){
		
		// Initialise Atom's test environment
		global.AtomMocha = this;
		this.headless = args.headless;
		this.isCI =
			!!(process.env.CI
			|| process.env.CONTINUOUS_INTEGRATION
			|| process.env.BUILD_NUMBER
			|| process.env.TRAVIS_JOB_ID
			|| process.env.GITHUB_ACTIONS
			|| process.env.APPVEYOR
			|| process.env.RUN_ID);
		this.utils = utils;
		this.setup(args);
		
		// Load and manage configuration
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
		
		// Prep the spec-runner window if we're using Mocha's HTML reporter
		if("html" === this.options.reporter){
			document.querySelector("atom-styles").remove();
			addTo(document.body)(New("div", {id: "mocha"}));
			addTo(document.head)(New("link", {
				type: "text/css",
				rel: "stylesheet",
				href: require.resolve("mocha/mocha.css"),
			}));
		}
	}
	
	
	/** Configure Atom's test environment */
	setup(args){
		
		const applicationDelegate = args.buildDefaultApplicationDelegate();
		window.atom = args.buildAtomEnvironment({
			applicationDelegate,
			window,
			document,
			configDirPath: process.env.ATOM_HOME,
			enablePersistence: false,
		});
		
		// Shiv to let Mocha print to STDOUT/STDERR with unmangled feedback
		if(this.headless){
			const {remote} = Electron;
			const {format} = require("util");
			
			Object.defineProperties(process, {
				stdout: {value: remote.process.stdout},
				stderr: {value: remote.process.stderr},
			});
			
			const stdout = (...x) => process.stdout.write(format(...x) + "\n");
			const stderr = (...x) => process.stderr.write(format(...x) + "\n");
			console.info = console.log   = stdout;
			console.warn = console.error = stderr;
			
			// Terminate with correct status on interrupt
			remote.process.on("SIGINT", () => {
				process.stdout.write("\n");
				if(this.runner) this.runner.abort();
				remote.process.exit(130);
			});
		}
	}
	
	
	/**
	 * Locate specs and configs in the specified directories.
	 *
	 * The returned object contains two arrays: "specs" and "opts",
	 * for loaded spec files and `mocha.opts` files, respectively.
	 *
	 * @param {Array} paths
	 * @return {Object}
	 */
	getFiles(paths){
		const specs = [];
		const opts  = [];
		
		for(const testPath of paths){
			const stats = fs.statSync(testPath);
			
			// Individually-specified file
			if(stats.isFile()){
				
				// This is an options file, not a spec
				if(this.isOptionsFile(testPath))
					opts.push(testPath);
				
				else specs.push(testPath);
			}
			
			// Folder of specs and possible configuration files
			else if(stats.isDirectory()){
				for(const file of fs.readdirSync(testPath)){
					const filePath = path.join(testPath, file);
					
					if(fs.statSync(filePath).isFile()){
						if(this.isOptionsFile(file))
							opts.push(filePath);
						
						// Toss it in as a spec, we'll filter it later
						else specs.push(filePath);
					}
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
		const {findBasePath} = utils;

		const opt = {
			
			// Spec-runner options
			autoIt:          true,
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
			color:           true,
			fgrep:           null,
			grep:            null,
			reporter:        "spec",
			reporterOptions: {},
			require:         [],
			retries:         0,
			slow:            75,
			timeout:         2000,
			ui:              "bdd",
		};
		
		// Locate the package's "package.json" file
		let basePath = findBasePath([...specs, ...opts]);
		while(basePath && basePath !== "/"){
			const packagePath = path.join(basePath, "package.json");
			
			if(fs.existsSync(packagePath)){
				
				// If there's a `.mocharc.*` file in the package's base directory, load it
				for(const ext of ["js", "yaml", "yml", "json", "jsonc"]){
					const file = path.join(basePath, `.mocharc.${ext}`);
					if(fs.existsSync(file)){
						this.readOptionsFile(opt, file);
						break;
					}
				}
				
				try{
					let data = require(packagePath);
					this.packagePath = basePath;
					
					// Assign options from an object read from package.json
					const grabOptions = data => {
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
						if(args.headless  && data.headless)    grabOptions(data.headless);
					}
				}
				catch(e){ console.error(e); }
				break;
			}
			basePath = path.dirname(basePath);
		}
		
		
		// Load externally-defined options
		opts.forEach(file => this.readOptionsFile(opt, file));
		
		
		// Make sure patterns are actual regular expressions.
		opt.specPattern = regexFromString(opt.specPattern) || /[-_.](?:spec|test)\.(?:coffee|[jt]sx?)$/i;
		opt.stackFilter = regexFromString(opt.stackFilter) || /node_modules([\\/])mocha(?:\1|\.js|[:)])/;
		
		
		// Load specs in subdirectories if --recursive is enabled
		if(opt.recursive){
			const dirs = new Set([
				...files.specs.map(file => path.dirname(file)),
				...files.opts.map(file => path.dirname(file)),
			]);
			const load = dirPath => {
				fs.statSync(dirPath).isDirectory() && fs.readdirSync(dirPath).forEach(entity => {
					if(~files.specs.indexOf(entity = path.join(dirPath, entity))) return;
					const realPath = fs.realpathSync(entity);
					const stats    = fs.statSync(entity);
					if(stats.isDirectory() && !dirs.has(realPath)){
						dirs.add(realPath);
						load(entity);
					}
					else if(stats.isFile() && opt.specPattern.test(entity))
						files.specs.push(entity);
				});
			};
			[...dirs].forEach(load);
			files.specs.sort();
		}
		
		
		// Load any --require'd resources
		if(opt.require && opt.require.length){
			if(!Array.isArray(opt.require))
				opt.require = [opt.require];
			
			for(let file of opt.require)
				try{
					if(/^chai\/(assert|expect|should)$/.test(file))
						file = "chai/register-" + RegExp.lastParen;
					require(file);
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
			opt.color = false;
		
		// Always disable colours when running interactively
		if(!args.headless){
			opt.color = false;
			
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
		
		
		// Stop commas showing between words for multi-word titles
		if(Array.isArray(opt.title))
			opt.title = opt.title.join(" ");
		
		// Store the package's directory for the "clipPaths" option
		opt.packagePath = this.packagePath;
		return opt;
	}
	
	
	/**
	 * Determine whether a pathname would be recognised by Mocha as an options file.
	 *
	 * @param {String} path
	 * @return {Boolean}
	 * @internal
	 */
	isOptionsFile(path){
		return /(?:^|[\\/])(?:\.mocharc\.(?:js|jsonc?|ya?ml)|mocha\.opts)$/.test(path);
	}
	
	
	/**
	 * Load options from a `.mocharc.*` or `mocha.opts` file.
	 *
	 * @param {Object} target - Object to store parsed options upon
	 * @param {String} file - Path to options file
	 * @return {Object}
	 * @internal
	 */
	readOptionsFile(target, file){
		const {loadRc, loadMochaOpts} = require("mocha/lib/cli/options");
		const mochaOpts = "mocha.opts" === path.basename(file)
			? loadMochaOpts({opts: file})
			: loadRc({config: file});
		delete mochaOpts._;
		
		// Convert "kebab-cased" keys to camelCase
		const keys = "autoIt autoScroll clipPaths escapeHtml formatCode hidePending hideStatBar linkPaths noExtensions specPattern stackFilter";
		for(const key of keys.split(" ")){
			let kebab = key.replace(/([a-z]+)([A-Z])/g, (_, a, B) => `${a}-${B}`).toLowerCase();
			if(kebab in mochaOpts || (kebab = "no-" + kebab) in mochaOpts){
				mochaOpts[key] = mochaOpts[kebab];
				delete mochaOpts[kebab];
			}
		}
		
		// Resolve any --require'd modules relative to options file
		const arrayify = x => Array.isArray(x) ? x : [x];
		if(mochaOpts.require && mochaOpts.require.length){
			target.require = arrayify(target.require);
			const req = arrayify(mochaOpts.require)
				.filter(s => s && !~target.require.indexOf(s))
				.map(spec => /^\.+(?:[\\/]|$)|^[\\/]/.test(spec)
					? path.resolve(path.dirname(file), spec)
					: spec)
				.filter(s => s && !~target.require.indexOf(s));
			target.require.push(...req);
		}
		delete mochaOpts.require;
		
		// Resolve any CSS/JS paths relative to options file
		if(mochaOpts.css) target.css = this.mergeAssets(target.css, this.resolveAssets(mochaOpts.css, path.dirname(file)));
		if(mochaOpts.js)  target.js  = this.mergeAssets(target.js,  this.resolveAssets(mochaOpts.js,  path.dirname(file)));
		delete mochaOpts.css;
		delete mochaOpts.js;
		
		Object.assign(target, mochaOpts);
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
				: "application/javascript",
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
				: "stylesheet",
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
			for(const k in paths) if(paths[k])
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
	 * Start Mocha. Called by Atom's test-runner API.
	 *
	 * The returned promise *must* resolve with an exit code, even if tests
	 * were unsuccessful. Returning a rejected promise will hang the process.
	 * 
	 * @return {Promise<number>}
	 * @private
	 */
	run(){
		return new Promise(async resolve => {
			const runHook = async name => {
				try{
					if("function" === typeof this.options[name])  await this.options[name](this);
					if("function" === typeof this.reporter[name]) await this.reporter[name](this);
				} catch(error){
					this.displayError(error, `In "${name}" hook:`);
					return resolve(1);
				}
			};
			
			// Run `beforeStart` callback(s)
			runHook("beforeStart");
			
			// Add user-supplied DOM juice
			await this.attachAssets(this.options);
			
			// Start the actual tests
			this.runner = this.mocha.run(failures => {
				try{
					if("function" === typeof this.options.beforeFinish)
						return resolve(this.options.beforeFinish(failures));
				} catch(error){
					this.displayError(error, 'In "beforeFinish" hook:');
					return resolve(Math.max(1, failures));
				}
				return resolve(failures);
			});
			
			// Run `afterStart` callback(s)
			runHook("afterStart");
		}).catch(error => {
			this.displayError(error, "Unexpected error");
			return 1;
		});
	}
	
	
	/**
	 * Display an error caught whilst executing a lifecycle event handler.
	 * 
	 * @param {Error|String} error
	 * @param {String} [title=""]
	 * @private
	 */
	displayError(error, title = ""){
		if(this.headless){
			title && console.error("  " + String(title));
			error = this.formatError(error).replace(/^/gm, " ".repeat(title ? 4 : 2));
			console.error(error);
		}
		else{
			console.error(error);
			const mocha = document.querySelector("#mocha");
			
			// Default reporter: Display a properly-formatted stack-trace
			if(mocha && mocha.reporter instanceof require("./reporter.js")){
				const {report} = mocha.reporter;
				const div = addTo(report)
					(New("div", {className: "error-message"}))
					(title && New("h1", {className: "error-title", textContent: title}))[1];
				
				addTo(div)(error instanceof Error
					? mocha.reporter.createErrorBlock(error)
					: New("div", {className: "error-block", textContent: error}));
				
				if(this.options.autoScroll)
					report.scrollTop = report.scrollHeight;
			}
			
			// Other HTML-based reporters: Just stringify the error in a <pre> block
			else addTo(document.querySelector("#mocha-report") || mocha || document.body)
				(New("div", {className: "test error message"}))(
					New("h1", {className: "error-title", textContent: title}),
					New("pre", {error,
						className: "error-message error",
						textContent: error.stack
							? Mocha.utils.stackTraceFilter()(error.stack)
							: String(error),
					})
				);
		}
	}
	
	
	/**
	 * Format an {@link Error} with ANSI escapes for terminal display.
	 *
	 * @param {Error} error
	 * @return {String}
	 * @private
	 */
	formatError(error){
		const {generateDiff, color:colour} = Mocha.reporters.Base;
		
		if(error instanceof Error){
			const {inlineDiffs, stringify, stackTraceFilter} = Mocha.utils;
			let result = colour("error message", `${error.name}: ${error.message}`) + "\n";
			let indent = "  ";
			
			// Generate an inline diff if this error has `expected`/`actual` properties
			const exp = stringify(error.expected);
			const act = stringify(error.actual);
			if(false !== error.showDiff && undefined !== error.expected && act !== exp){
				Mocha.utils.inlineDiffs = true;
				result += utils.deindent(generateDiff(act, exp)) + "\n\n";
				Mocha.utils.inlineDiffs = inlineDiffs;
				indent = "";
			}
			
			return result + colour("error stack", stackTraceFilter()(error.stack)
				.split(/\n+/g)
				.map(line => line.trim())
				.filter(line => line && !~line.indexOf(error.message))
				.join("\n"))
				.replace(/^/gm, indent);
		}
		else return colour("error message", String(error));
	}
}

module.exports = AtomMocha;
