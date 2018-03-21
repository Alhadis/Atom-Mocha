"use strict";

const fs      = require("fs");
const path    = require("path");
const diff    = require("diff");
const print   = require("print");
const ipc     = require("./ipc.js");
const utils   = require("./utils.js");
const painter = require("./patch-painter.js");
const {clean} = require("mocha/lib/utils.js");
const {addTo, nearest, link, New, escapeRegExp, escapeHTML, parseKeywords} = utils;

const cssPath = require.resolve("./reporter.css");
const el      = Symbol("Atom-Mocha-Elements");


/**
 * TTY emulator to show spec results in interactive mode.
 *
 * @class
 */
class Reporter{
	
	constructor(runner, options){
		this.runner = runner;
		this.options = options;
		
		// Register Mocha handlers
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
		
		// Construct something to actually show stuff with
		this.element = New("div", {id: "mocha"});
		this.report  = New("div", {id: "mocha-report"});
		this.element.appendChild(this.report);
		this.element.addEventListener("mousedown", this.onClick);
		
		// Generate stat-bar
		this.statBar = New("footer", {id: "mocha-stats"});
		this.element.appendChild(addTo(this.statBar)(
			this.statBar.passes   = New("div", {textContent: "0", id: "mocha-passes"}),
			this.statBar.duration = this.createDuration(...[,,{tagName: "div", id:"mocha-duration"}]),
			this.statBar.pending  = New("div", {textContent: "0", id: "mocha-pending"}),
			this.statBar.failures = New("div", {textContent: "0", id: "mocha-failures"})
		)[0]);
		
		// Check if this operating system uses opaque scrollbars (e.g., Windows)
		if(this.scrollbarWidth = utils.getScrollbarWidth()){
			const offset = this.scrollbarWidth + "px";
			this.report.style.marginRight  = "-" + offset;
			this.report.style.paddingRight = offset;
		}
		
		document.title = options.title || "Mocha";
		document.body.classList.add("hide", "native-key-bindings");
		document.body.appendChild(this.element);
		document.head.appendChild(New("link", {
			rel: "stylesheet",
			type: "text/css",
			href: "file://" + cssPath
		}));
		
		// Manage element to store dynamic styling */
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
		
		// Preserve the spec-runner's title when opening projects
		let title = "";
		Object.defineProperty(document, "title", {
			get(){ return title },
			set(i){ title = i; }
		});
		
		// Configure slideable behaviour
		if(options.slide){
			const dir = parseKeywords(true === options.slide
				? "up down left right"
				: options.slide);
			
			this.element.classList.add("sliding");
			for(const key of Object.keys(dir)){
				
				// Spawn a new clickable arrowhead
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
		
		// Hide the statbar if hideStatBar is enabled
		this.element.classList.toggle("hide-stats", !!options.hideStatBar);
		
		// Use a more compact look
		if(options.minimal){
			this.minimal = true;
			this.dots    = New("div", {id: "mocha-dots"});
			this.element.classList.add("minimal");
			this.element.insertBefore(this.dots, this.report);
			this.element.insertBefore(this.statBar, this.report);
		}
		
		// Enable linked source-paths in stack traces
		if(options.linkPaths)
			ipc.init(options.packagePath);
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
		
		// We haven't created elements for this Mocha suite yet
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
		
		if(!this.summary){
			const total = this.runner.total - this.total;
			const textContent = total
				? this.options.bail
					? `Bailed with ${total} tests remaining`.replace(/\b(1 test)s/, "$1")
					: `Finished with ${total} aborted tests`.replace(/\b(1 aborted test)s/, "$1")
				: "Finished";
			this.summary = addTo(this.report)(New("div", {textContent}))[1];
			if(this.options.autoScroll)
				this.report.scrollTop = this.report.scrollHeight;
		}
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
		
		// Source path in stack-trace
		if(node = nearest(target, ".stack-source.link[data-path]")){
			const {path, line, column} = node.dataset;
			ipc.jumpToFile(path, line - 1, column - 1);
		}
		
		// Individual test
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
		
		// Suite
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
		
		// Stop the event bubbling up the DOM tree if it landed on something
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
		
		const prefix    = this.options.autoIt ? (test.type === "hook" ? "In " : "It ") : "";
		const container = New("div", {className: `test ${state} ${speed}` + show});
		const title     = New("div", {className: "test-title"});
		const h2        = New("h2", {textContent: prefix + test.title});
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
		
		if(this.options.autoScroll)
			this.report.scrollTop = this.report.scrollHeight;
	}
	
	
	/**
	 * Generate a block to display the details of a failed test.
	 *
	 * @param {AssertionError} error
	 * @return {HTMLDivElement}
	 */
	createErrorBlock(error){
		const div   = New("div", {error, className: "error-block"});
		const title = New("div", {error, className: "error-title"});
		const stack = New("div", {error, className: "stack-trace"});
		let diff;
		
		// No stack? Improvise
		if(!error.rawStack){
			const uncaught  = error.uncaught? "Uncaught " : "";
			const titleText = `${uncaught + error.name}: `;
			title.innerHTML = this.options.escapeHTML
				? escapeHTML(titleText)
				: titleText;
			
			// We're pretty much copying what Mocha's doing in `reporters/base.js`
			if(error.message && "function" === typeof error.message.toString)
				stack.textContent = error.message;
			else if("function" === typeof error.inspect)
				stack.textContent = error.inspect();
		}
		
		// Format stack-trace if available
		else{
			const [titleText, stackData] = this.formatStackTrace(error);
			title.innerHTML = titleText.replace(/[{}:()\]\[]+/g, s =>
				`<span class="stack-trace">${s}</span>`);
			
			for(const [html, callSite] of stackData){
				const frame = New("span", {
					className: "stack-frame",
					innerHTML: html + "\n"
				});
				const {textContent} = frame;
				if(this.options.stackFilter.test(textContent))
					frame.hidden = true;
				stack.appendChild(Object.assign(frame, {error, callSite}));
			}
			if(error.showDiff && (diff = this.createDiffBlock(error)))
				div.classList.add("has-diff");
		}
		
		return addTo(div)(title, diff, stack)[0];
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
				
				// Display a reader-friendly version of the duration
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
	 * @see {@link https://github.com/v8/v8/wiki/Stack-Trace-API}
	 * @param {AssertionError} error
	 * @return {Array} 2-string array with HTML code for title and stack
	 */
	formatStackTrace(error){
		let title = error.toString();
		let stack = error.rawStack.slice();
		
		// Reverse order if `flipStack` is used
		if(this.options.flipStack)
			stack.reverse();
		
		const frames = stack.map(frame => {
			const html = this.formatStackFrame(frame);
			return [html, frame];
		});
		return [title, frames];
	}
	
	
	/**
	 * Generate HTML source for a stack frame.
	 *
	 * @param {CallSite} frame
	 * @return {String}
	 */
	formatStackFrame(frame){
		const result = ["at "];
		const anon = "<anonymous>";
		
		// Callee
		const type   = frame.getTypeName();
		const method = frame.getMethodName();
		const name   = frame.getFunctionName();
		const callee = frame.isConstructor()
			? "new " + (type || anon)
			: (type ? type + "." : "")
			+ (name || method || anon);
		result.push('<span class="stack-callee">'
			+ callee.replace(/(^new )?((?:[$\w]+\.)*<anonymous>)/, (_,a,b) =>
				`${a || ""}<span class="stack-trace">${escapeHTML(b)}</span>`)
			+ "</span>");
		
		// Bracketed sidenote about aliased method-call
		if(method && method !== name)
			result.push(`<span class="stack-notes"> [as ${escapeHTML(method)}]</span>`);
		
		// Source file
		let file = frame.getScriptNameOrSourceURL();
		if(file){
			const row = frame.getLineNumber();
			const col = frame.getColumnNumber();
			const escapedPath = escapeRegExp(this.options.packagePath + path.sep);
			const pathPattern = new RegExp("^" + escapedPath);
			const openingTag = this.options.linkPaths && pathPattern.test(file)
				? `<span class="stack-source link" data-line=${row} data-column=${col} data-path="${file}">`
				: '<span class="stack-source">';
			
			if(this.options.clipPaths)
				file = file.replace(pathPattern, "");
			
			file = escapeHTML(file);
			result.push(` ${openingTag}(`
				+ '<span class="stack-filename">' + file + "</span>:"
				+ '<span class="stack-line">'     + row  + "</span>:"
				+ '<span class="stack-column">'   + col  + "</span>"
				+ ")</span>");
		}
		
		// Other source
		else{
			result.push('<span class="stack-source other">(');
			if    (frame.isNative()) result.push("native");
			else if (frame.isEval()) result.push("eval at " + escapeHTML(frame.getPosition()));
			result.push(")</span>");
		}
		
		return result.join("");
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
		
		// Highlighting is disabled/unavailable
		if(grammars === undefined)
			return nodes;
		
		for(let line of grammars["source.js"].tokenizeLines(input)){
			for(let token of line){
				const tag       = document.createElement("span");
				tag.textContent = token.value;
				
				const scopes    = token.scopes.join(".").split(/\./g);
				const s         = parseKeywords(scopes);
				tag.dataset.scopes = Array.from(new Set(scopes).values()).join(" ");
				
				// Don't use scopes as classes; they'll be targeted by themes
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
		const promises = [];
		
		// Load JavaScript grammar to provide syntax highlighting
		if(main.options.formatCode){
			this.grammars = {};
			
			promises.push(atom.packages.activatePackage("language-javascript").then(p => {
				p.grammars.forEach(g => this.grammars[g.scopeName] = g);
				
				// Make sure we don't screw with specs
				atom.packages.deactivatePackage("language-javascript");
			}));
		}
		
		return Promise.all(promises);
	}
}


module.exports = Reporter;
