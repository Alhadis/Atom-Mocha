"use strict";

const fs      = require("fs");
const path    = require("path");
const diff    = require("diff");
const print   = require("print");
const utils   = require("./utils.js");
const painter = require("./patch-painter.js");
const {clean} = require("mocha/lib/utils.js");
const {addTo, nearest, link, New, escapeRegExp, parseKeywords} = utils;

const cssPath = require.resolve("./reporter.css");
const el      = Symbol("Atom-Mocha-Elements");


/**
 * TTY emulator to show spec results in interactive mode.
 */
class Reporter{
	
	constructor(runner, options){
		this.runner = runner;
		this.options = options;
		
		/** Register Mocha handlers */
		const events = {
			start:      this.onStart,
			suite:      this.onSuite,
			pass:       this.onPass,
			fail:       this.onFail,
			end:        this.onEnd,
			pending:    this.onPending,
			"test end": this.onTestEnd
		};
		for(const event in events)
			runner.on(event, events[event].bind(this));
		
		/** Construct something to actually show stuff with */
		this.element = New("div", {id: "mocha"});
		this.report  = New("div", {id: "mocha-report"});
		this.element.appendChild(this.report);
		this.element.addEventListener("mousedown", this.onClick);
		
		/** Generate stat-bar */
		this.statBar = New("footer", {id: "mocha-stats"});
		this.element.appendChild(addTo(this.statBar)(
			this.statBar.passes   = New("div", {textContent: "0", id: "mocha-passes"}),
			this.statBar.duration = this.createDuration(...[,,{tagName: "div", id:"mocha-duration"}]),
			this.statBar.pending  = New("div", {textContent: "0", id: "mocha-pending"}),
			this.statBar.failures = New("div", {textContent: "0", id: "mocha-failures"})
		)[0]);
		
		/** Check if this operating system uses opaque scrollbars (e.g., Windows) */
		if(this.scrollbarWidth = utils.getScrollbarWidth()){
			const offset = this.scrollbarWidth + "px";
			this.report.style.marginRight  = "-" + offset;
			this.report.style.paddingRight = offset;
		}
		
		document.title = options.title || "Mocha";
		document.body.classList.add("hide");
		document.body.appendChild(this.element);
		document.head.appendChild(New("link", {
			rel: "stylesheet",
			type: "text/css",
			href: "file://" + cssPath
		}));
		
		/** Manage element to store dynamic styling */
		const ed = Reporter.editorSettings || {};
		const rules = [
			`background-color: rgba(0,0,0,${options.opacity || .8})`,
			ed.fontSize   ? `font-size: ${ed.fontSize}px`     : null,
			ed.lineHeight ? `line-height: ${ed.lineHeight}`   : null,
			ed.fontFamily ? `font-family: "${ed.fontFamily}"` : null,
			ed.tabLength  ? `tab-size: ${ed.tabLength}`       : null
		].filter(Boolean).map(s => `\t${s};`);
		document.head.appendChild(New("style", {
			textContent: `#mocha{\n${ rules.join("\n") }\n}`
		}));
		
		/** Preserve the spec-runner's title when opening projects */
		let title = "";
		Object.defineProperty(document, "title", {
			get(){ return title },
			set(i){ title = i; }
		});
		
		/** Configure slideable behaviour */
		if(options.slide){
			const dir = parseKeywords(true === options.slide
				? "up down left right"
				: options.slide);
			
			this.element.classList.add("sliding");
			for(const key of Object.keys(dir)){
				
				/** Spawn a new clickable arrowhead */
				const arrow = New("div", {
					direction: key,
					className: "slide-indicator " + key
				});
				
				arrow.addEventListener("click", e => {
					this.element.classList.toggle("offset-" + key);
					e.preventDefault();
					e.stopImmediatePropagation();
					return false;
				});
				
				addTo(this.element)(arrow);
				this.element.classList.add("slide-" + key);
			}
		}
		
		/** Hide the statbar if hideStatBar is enabled */
		this.element.classList.toggle("hide-stats", !!options.hideStatBar);
		
		/** Use a more compact look */
		if(options.minimal){
			this.minimal = true;
			this.dots    = New("div", {id: "mocha-dots"});
			this.element.classList.add("minimal");
			this.element.insertBefore(this.dots, this.report);
			this.element.insertBefore(this.statBar, this.report);
		}
	}
	
	
	get passes(){ return +this.statBar.passes.dataset.value || 0 }
	set passes(input){
		input            = Math.max(0, +input || 0);
		const el         = this.statBar.passes;
		el.textContent   = `${input} passing`;
		el.dataset.value = input;
		el.classList.toggle("zero", input === 0);
	}
	
	get pending(){ return +this.statBar.pending.dataset.value || 0 }
	set pending(input){
		input            = Math.max(0, +input || 0);
		const el         = this.statBar.pending;
		el.textContent   = `${input} pending`;
		el.dataset.value = input;
		el.classList.toggle("zero", input === 0);
	}
	
	get failures(){ return +this.statBar.failures.dataset.value || 0 }
	set failures(input){
		input            = Math.max(0, +input || 0);
		const el         = this.statBar.failures;
		el.textContent   = `${input} failing`;
		el.dataset.value = input;
		el.classList.toggle("zero", input === 0);
	}
	
	get duration(){ return this.statBar.duration || 0 }
	set duration(input){
		const el = this.statBar.duration;
		el.value = input;
	}
	
	
	onStart(){
		this.passes     = 0;
		this.failures   = 0;
		this.total      = 0;
		this.pending    = 0;
		this.started    = performance.now();
		setTimeout(() => {
			document.body.classList.remove("hide");
		}, 10);
	}
	
	
	onSuite(suite){
		
		/** We haven't created elements for this Mocha suite yet */
		if(!suite[el] && !suite.root)
			this.addSuite(suite);
	}
	
	
	onTestEnd(){
		++this.total;
		this.duration = performance.now() - this.started;
	}
	
	
	onPass(test){
		++this.passes;
		this.addResult(test);
	}
	
	
	onFail(test, reason){
		++this.failures;
		this.addResult(test, reason);
	}
	
	
	onPending(test){
		if(this.options.hidePending) return;
		++this.pending;
		this.addResult(test);
	}
	
	
	onEnd(){
		this.finished = performance.now();
		this.duration = this.finished - this.started;
	}
	
	
	
	/**
	 * Handler fired when a user clicks the Reporter's HTML container.
	 *
	 * @param {MouseEvent} event
	 */
	onClick(event){
		const hideClass = "collapsed";
		const {target, altKey} = event;
		let title, node, parent, isClosed, siblings;
		
		/** Individual test */
		if(title = nearest(target, ".test-title")){
			parent   = title[el].container;
			isClosed = parent.classList.toggle(hideClass);
			
			if(altKey){
				for(const e of Array.from(parent.parentElement.children)){
					if(!e[el] || !e[el].details) continue;
					e.classList.toggle(hideClass, isClosed);
				}
			}
		}
		
		/** Suite */
		else if(title = nearest(target, ".suite-title")){
			parent   = title.parentNode;
			isClosed = !parent.classList.toggle(hideClass);
			
			if(altKey){
				siblings = Array.from(parent[el].parent.children);
				siblings = siblings.filter(e => e.classList.contains("suite"));
				
				for(const e of siblings){
					if(e !== parent)
						e.classList.toggle(hideClass, !isClosed);
					
					/** Toggle all entries in this one */
					for(const s of Array.from(e.querySelectorAll(".suite, .test")))
						s.classList.toggle(hideClass, !isClosed);
				}
			}
		}
		
		/** Stop the event bubbling up the DOM tree if it landed on something */
		if(node){
			event.preventDefault();
			event.stopPropagation();
			return false;
		}
	}
	
	
	/**
	 * Add an HTML container for a suite of tests.
	 *
	 * @param {Suite} suite
	 */
	addSuite(suite){
		const container = New("article", {className: "suite"});
		const title     = New("h1", {className: "suite-title", textContent: suite.title});
		const results   = New("div", {className: "results"});
		
		container.appendChild(title);
		container.appendChild(results);
		const nodeRefs  = {suite, container, title, results};
		
		const parent    = suite.parent[el];
		const parentEl  = parent ? parent.results : this.report;
		nodeRefs.parent = addTo(parentEl)(container)[0];
		link(el, nodeRefs);
	}
	
	
	/**
	 * Display the result of a finished test in the spec-runner.
	 *
	 * @param {Runnable} test
	 * @param {Error} error
	 */
	addResult(test, error){
		const speed = this.rankSpeed(test);
		const state = error ? "fail" : (test.pending ? "pending" : "pass");
		const show  = error ? "" : " collapsed";
		
		const {autoIt}  = this.options;
		const container = New("div", {className: `test ${state} ${speed}` + show});
		const title     = New("div", {className: "test-title"});
		const h2        = New("h2", {textContent: (autoIt? "It ":"") + test.title});
		addTo(title)(h2);
		
		if(!test.pending){
			const duration  = this.createDuration(test.duration, true);
			duration.title += ` (${speed === "okay" ? "medium" : speed})`;
			addTo(title)(duration);
		}
		
		container.appendChild(title);
		const details = (error
			? addTo(container)(this.createErrorBlock(error))
			: test.pending || addTo(container)(this.createCodeBlock(test.body)))[1];
		test.parent[el].results.appendChild(container);
		link(el, {container, title, details});
		error && test.parent[el].container.classList.add("has-failures");
		
		if(this.dots){
			const dot = New("div", {className: container.className.replace(/test/, "dot")});
			addTo(this.dots)(dot);
		}
	}
	
	
	/**
	 * Generate a block to display the details of a failed test.
	 *
	 * @param {AssertionError} error
	 * @return {HTMLElement}
	 */
	createErrorBlock(error){
		const div = New("div", {className: "error-block"});
		let title, stack, diffEl;
		
		/** No stack? Improvise */
		if(!error.stack){
			title = error.name + ": ";
			
			/** We're pretty much copying what Mocha's doing in reporters/base.js */
			if(error.message && "function" === typeof error.message.toString)
				stack = error.message;
			else if("function" === typeof error.inspect)
				stack = error.inspect() + "";
		}
		
		/** We have an error stack; polish it up a little */
		else{
			[title, stack] = this.formatStackTrace(error);
			if(error.showDiff && (diffEl = this.createDiffBlock(error)))
				div.classList.add("has-diff");
		}
		
		if(error.uncaught)
			title = "Uncaught " + title;
		
		/** Encode HTML entities */
		if(this.options.escapeHTML)
			title = title.replace(/[<>&]/g, s => "&#"+s.charCodeAt(0)+";");
		
		title = title.replace(/[{}:()\]\[]/g, s => `<span class="error-stack">`+s+"</span>");
		return addTo(div)(
			New("div", {innerHTML: title, className: "error-title"}),
			diffEl,
			New("div", {innerHTML: stack, className: "error-stack"})
		)[0];
	}
	
	
	
	/**
	 * Generate a chunk of (possibly) highlighted JavaScript source.
	 *
	 * @param {String} src
	 * @return {HTMLPreElement}
	 */
	createCodeBlock(src){
		const pre  = New("pre", {className: "code-block"});
		const code = New("code", {textContent: src});
		
		if(this.options.formatCode){
			code.textContent = "";
			src = clean(src).replace(/^(\x20{2})+/gm, s => "\t".repeat(s.length / 2));
			for(let node of this.highlight(src))
				code.appendChild(node);
		}
		
		pre.appendChild(code);
		return pre;
	}
	
	
	
	/**
	 * Generate an HTML node for an "expected value VS actual value" comparison.
	 *
	 * If the error lacks "expected" and "actual" properties, null is returned.
	 *
	 * @param {AssertionError} error
	 * @return {HTMLElement}
	 */
	createDiffBlock(error){
		if(!error || !("expected" in error && "actual" in error))
			return null;
		
		const div = New("div", {className: "error-diff"});
		
		const legend = addTo(
			New("div",  {className: "diff-legend"})
		)(
			New("span", {className: "diff-expected", textContent: "+ expected"}),
			New("span", {className: "diff-actual",   textContent: "- actual"})
		)[0];
		
		
		const patch = diff.createPatch("--",
			print(error.actual),
			print(error.expected)
		);
		
		const details = New("div", {
			className: "diff-details",
			innerHTML: painter.html(patch)
		});
		return addTo(div)(legend, details)[0];
	}
	
	

	/**
	 * Generate an HTML node for displaying a duration.
	 *
	 * @param {Number} input - Time expressed in milliseconds
	 * @param {Boolean} noUnits - Always display time in milliseconds
	 * @param {Object} attr - Additional HTML attributes to add to container
	 * @return {HTMLElement}
	 */
	createDuration(input = 0, noUnits = false, attr = {}){
		const attrib  = Object.assign({}, attr, {className: "duration"});
		const tagName = attr.tagName || "span";
		delete attrib.tagName;
		
		const span = New(tagName, attrib);
		const data = New("data", {className: "amount"});
		const unit = New("span", {className: "unit"});
		
		Object.defineProperty(span, "value", {
			get(){ return +data.value || 0; },
			
			set(input){
				input = Math.max(0, +input || 0);
				data.value = input;
				
				/** Display a reader-friendly version of the duration */
				if(noUnits || input < 1000){
					input = parseFloat(input.toFixed(2));
					span.title = `${input} millisecond${input==1 ? "":"s"}`;
					data.textContent = input;
					unit.textContent = "ms";
				}
				
				else if(input >= 60000){
					input = parseFloat((input / 60000).toFixed(2));
					span.title = `${input} minute${input==1 ? "":"s"}`;
					data.textContent = input;
					unit.textContent = "m";
				}
				
				else{
					input = parseFloat((input / 1000).toFixed(2));
					span.title = `${input} second${input==1 ? "":"s"}`;
					data.textContent = input;
					unit.textContent = "s";
				}
			}
		});
		
		span.value = input;
		span.appendChild(data);
		span.appendChild(unit);
		return span;
	}
	
	

	/**
	 * Gauge the speed of a finished test.
	 *
	 * @param {Runnable} test
	 * @return {String} Either "fast", "medium" or "slow"
	 */
	rankSpeed(test){
		const thresh = test.slow();
		if(test.duration > thresh)      return "slow";
		if(test.duration > thresh / 2)  return "okay";
		return "fast";
	}
	
	
	/**
	 * Generate HTML code to display a formatted stack trace.
	 *
	 * @param {AssertionError} error
	 * @return {Array} 2-string array with HTML code for title and stack
	 */
	formatStackTrace(error){
		let text = error.stack;
		
		/** Shorten filesystem paths to omit the package's base directory */
		if(this.options.clipPaths){
			const escaped = escapeRegExp(this.options.packagePath + path.sep);
			text = text.replace(new RegExp(escaped, "g"), "");
		}
		
		text = text.split(/^\s+(?=at)/gm);
		const splitAt = text.findIndex(s => /^at\b/.test(s));
		let title = text.slice(0, splitAt).join("\n");
		let html  = text.slice(splitAt);
		
		/** Print stack traces in reverse order if the option's enabled */
		if(this.options.flipStack)
			html = html.reverse();
		
		/** Generate the prettified stack trace */
		html = html.filter(i => i).join("\n").replace(
			/^at\s+((?:[\S\\/]+[\\/])+[^:\n]+):([^:\n]+):([^:\n]+)$/gm,
			function(match, file, line, col){
				return '<span class="stack-closure">'
					+ 'at <span class="stack-source">'
						+ '<span class="stack-filename">' + file + "</span>:"
						+ '<span class="stack-line">'     + line + "</span>:"
						+ '<span class="stack-column">'   + col  + "</span>"
					+ "</span>"
			}
		).replace(
			/^at\s+(\S+)(\s+.*?)\(([^:\n]+):([^:\n]+):([^:\n]+)\)/gm,
			function(match, callee, notes, file, line, col){
				callee = callee.replace(/[<>&]/g, m => "&#"+m.codePointAt(0));
				notes  = notes.replace(/^\n+|\n+$/g, "");
				return '<span class="stack-closure">'
					+ 'at <span class="stack-callee">' + callee + "</span>"
						+ '<span class="stack-notes">' + notes  + "</span>"
						+ '<span class="stack-source">('
							+ '<span class="stack-filename">' + file + '</span>:'
							+ '<span class="stack-line">'     + line + '</span>:'
							+ '<span class="stack-column">'   + col  + '</span>'
						+ ")</span>"
					+ "</span>"
			}
		)
		
		.replace(
			/^at\s+(\S+)(\s+\(native\).*)$/gm,
			function(match, type, notes){
				return '<span class="stack-closure other">'
					+ 'at <span class="stack-callee">' + type  + "</span>"
					+ '<span class="stack-notes">'     + notes + "</span>"
					+ "</span>"
			}
		)
		
		/** Mop up any stray line-breaks floating between tags */
		.replace(/>(?:[\x20\t]*\n[\x20\t]*)+</g, ">\n<")
		
		return [title, html];
	}
	
	
	/**
	 * Highlight code chunks embedded in test results.
	 *
	 * @param  {Reporter} input - Mocha reporter object
	 * @param  {Object} atom - Reference to the Atom environment object
	 * @return {Array} An array of DOM nodes
	 */
	highlight(input, atom){
		const {grammars} = Reporter;
		const nodes = [];
		
		/** Highlighting is disabled/unavailable */
		if(grammars === undefined)
			return nodes;
		
		for(let line of grammars["source.js"].tokenizeLines(input)){
			for(let token of line){
				const tag       = document.createElement("span");
				tag.textContent = token.value;
				
				const scopes    = token.scopes.join(".").split(/\./g);
				const s         = parseKeywords(scopes);
				tag.dataset.scopes = Array.from(new Set(scopes).values()).join(" ");
				
				/** Don't use scopes as classes; they'll be targeted by themes */
				if(s.punctuation) tag.className = s.string ? "js-quote" : "js-punct";
				else if(s.meta && s.brace || s.delimiter) tag.className = "js-punct";
				else if(s.keyword  || s.entity && s.name) tag.className = "js-key";
				else if(s.function || s.storage)          tag.className = "js-key";
				else if(s.constant || s.string)           tag.className = "js-value";
				else if(s.property || s.variable)         tag.className = "js-ident";
				else tag.className = "js";
				
				nodes.push(tag);
			}
			nodes.push(document.createTextNode("\n"));
		}
		return nodes;
	}
	
	
	/**
	 * Perform any asynchronous operations that need to complete before starting Mocha.
	 *
	 * @param {AtomMocha} main - Reference to the running AtomMocha instance.
	 * @return {Promise}
	 */
	static beforeStart(main){
		const promises = [this.loadEditorSettings()];
		
		/** Load JavaScript grammar to provide syntax highlighting */
		if(main.options.formatCode){
			this.grammars = {};
			
			promises.push(atom.packages.activatePackage("language-javascript").then(p => {
				p.grammars.forEach(g => this.grammars[g.scopeName] = g);
				
				/** Make sure we don't screw with specs */
				atom.packages.deactivatePackage("language-javascript");
			}));
		}
		
		return Promise.all(promises);
	}
	
	
	
	/**
	 * Attempt to load user's config to improve feedback quality.
	 *
	 * User configs are parsed statically. Because this feature is so cosmetic,
	 * it's not worth adding CSON/CoffeeScript as a hard dependency over.
	 *
	 * @return {Promise}
	 */
	static loadEditorSettings(){
		
		return new Promise((resolve, reject) => {
			const configPath = atom.config.configFilePath;
			
			fs.readFile(configPath, (error, data) => {
				if(error) return reject(error);
				
				/** Break the config's content apart by top-level scope */
				const scopes = {};
				data.toString().split(/^(?=\S)/gm).forEach(s => {
					const scope  = /^(?:"(?:[^"\\]|\\.)+"|'(?:[^'\\]|\\.)+'|\w+)/;
					const editor = /\n {2}editor:\n[^\x00]+?\n(?: {2}\S|$)/;
					const ed     = (s.match(editor) || [""])[0];
					
					/** Pinch a bunch of parsed editor settings */
					if(s = (s.match(scope) || [""])[0].replace(/["']/g, ""))
						scopes[s] = {
							fontFamily: (ed.match(/^ +fontFamily:\s*("|')(.+)\1/im) || []).pop(),
							fontSize:   (ed.match(/^ +fontSize:\s*([\d.]+)/im)      || []).pop(),
							lineHeight: (ed.match(/^ +lineHeight:\s*([\d.]+)/im)    || []).pop(),
							tabLength:  (ed.match(/^ +tabLength:\s*(\d+)/im)        || []).pop()
						};
				});
				
				/** Now collate them in ascending order of precedence */
				const ed = {};
				for(let scope of ["*", ".atom-mocha"]){
					for(let k in scopes[scope]){
						let v = scopes[scope][k]
						if(v != null) ed[k] = v
					}
				}
				Reporter.editorSettings = ed;
				resolve();
			});
		});
	}
}


module.exports = Reporter;
