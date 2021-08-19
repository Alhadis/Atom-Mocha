"use strict";

// TODO/FIXME: Load the bundled functions in this file from Alhadis/Utils
const {resolve, dirname, sep, isAbsolute, normalize} = require("path");
const {defineAssertions, defineAssertion, flattenList, formatList} = require("chinotto");
const {deindent} =

module.exports = {
	
	/**
	 * Non-Atom related helpers moved to different repository.
	 * @see {@link https://github.com/Alhadis/Chinotto}
	 * @since v2.2.2
	 */
	defineAssertions,
	defineAssertion,
	flattenList,
	formatList,
	
	
	/**
	 * Save a screenshot of the entire desktop in PNG format (macOS/Windows only).
	 * @param {String} saveTo - Path to save screenshot to
	 * @return {void}
	 */
	captureScreen(saveTo){
		if(!(saveTo = String(saveTo)).endsWith(".png"))
			saveTo += ".png";
		const {execFileSync} = require("child_process");
		const {existsSync, mkdirSync} = require("fs");
		const dir = dirname(saveTo);
		existsSync(dir) || mkdirSync(dir, {recursive: true});
		switch(process.platform){
			case "darwin":
				execFileSync("screencapture", ["-xmt", "png", saveTo]);
				break;
			case "win32":
				const input = deindent `
					Set-StrictMode -Version Latest
					$ErrorActionPreference = "Stop"
					Add-Type -AssemblyName System.Windows.Forms
					[void] [Reflection.Assembly]::LoadWithPartialName("System.Drawing")
					[void] [System.Reflection.Assembly]::LoadWithPartialName("System.Drawing")
					[void] [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")
					
					$rect    = ([System.Windows.Forms.Screen]::PrimaryScreen).bounds
					$bitmap  = New-Object Drawing.Bitmap -argumentList $rect.width, $rect.height
					$context = [Drawing.Graphics]::FromImage($bitmap)
					$context.copyFromScreen($rect.location, [Drawing.Point]::Empty, $rect.size)
					$bitmap.save("${saveTo}")
					$context.dispose()
					$bitmap.dispose()
				`.replace(/\r?\n|\r|\u2028|\u2029/g, "\r\n");
				execFileSync("powershell.exe", [
					"-NoLogo",
					"-NoProfile",
					"-NonInteractive",
					"-WindowStyle", "Hidden",
					"-Command", "-",
				], {input, encoding: "utf8", windowsHide: true});
				break;
			default:
				throw new Error("Desktop capture requires Windows or macOS");
		}
	},
	
	
	/**
	 * Save a screenshot of the workspace window.
	 * @param {"png"|"jpg"|"pdf"} [format="png"] - Screenshot format
	 * @param {Number} [quality=75] - JPEG quality (0–100)
	 * @return {Promise<Uint8Array>}
	 */
	async captureWindow(format = "png", quality = 75){
		const {remote} = require("electron");
		const page = remote.getCurrentWebContents();
		
		switch(format = String(format).toLowerCase()){
			case "pdf":
				const width  = Math.ceil(CSS.px(window.innerWidth  * 1000).to("mm").value);
				const height = Math.ceil(CSS.px(window.innerHeight * 1000).to("mm").value);
				const {buffer} = await page.printToPDF({
					marginsType: 1,
					printBackground: true,
					pageSize: {width, height},
				});
				return new Uint8Array(buffer);
			
			case "jpg":
			case "jpeg":
				quality = isNaN(quality) ? 75 : Math.max(Math.min(100, ~~quality), 0);
				return (await page.capturePage()).toJPEG(quality);
			
			case "png":
				return (await page.capturePage()).toPNG();
			
			default:
				throw new TypeError(`Unsupported file-format: ${format}`);
		}
	},


	/**
	 * Open a file to a specific line and column in the user's editor-pane.
	 * @param {String} path
	 * @param {Number} line
	 * @param {Number} columns
	 */
	jumpToFile(path, line, column){
		const jumpURL = "atom://core/open/file?filename="
			+ encodeURIComponent(path)
			+ `&line=${line}&column=${column}`;
		return require("electron").shell.openExternal(jumpURL);
	},
	

	/**
	 * Open a list of files relative to currently-running test.
	 *
	 * @param {...String} paths
	 * @return {Promise<TextEditor|TextEditor[]>}
	 */
	async open(...paths){
		if(!paths.length) return atom.workspace.open();
		const testPath = dirname((AtomMocha.runner.currentRunnable || {file: __filename}).file);
		const editors = await Promise.all(paths.map(path => {
			path = path.replace(/[\\/]/g, sep);
			return atom.workspace.open(isAbsolute(path) ? path : resolve(testPath, normalize(path)));
		}));
		return (paths.length > 1) ? editors : editors[0];
	},
	
	
	/**
	 * Return a {@link Promise} which resolves once an event has been emitted.
	 *
	 * @param {EventEmitter} source - Something with an {@link Emitter} object
	 * @param {String} eventName - Name of event to listen for
	 * @return {Promise}
	 */
	async waitForEvent(source, eventName){
		return new Promise(resolve => {
			const disposable = source.emitter.on(eventName, result => {
				disposable.dispose();
				resolve(result);
			});
		});
	},


	/**
	 * Wrapper for creating a new DOM element, optionally assigning it a hash of properties upon construction.
	 *
	 * @param {String} nodeType - Element type to create.
	 * @param {Object} obj - An optional hash of properties to assign the newly-created object.
	 * @return {Element}
	 */
	New(nodeType, obj){
		function absorb(a, b){
			for(const i in b)
				if(Object(a[i]) === a[i] && Object(b[i]) === b[i])
					absorb(a[i], b[i]);
				else a[i] = b[i];
		}
		const node = document.createElement(nodeType);
		if(obj) absorb(node, obj);
		return node;
	},


	/**
	 * Curried method to append multiple nodes at once.
	 *
	 * @example addTo(node)(el1, el2, …)
	 * @example node = addTo(node)(…)[0]
	 * @return {Function}
	 */
	addTo(parent){
		let count = 0;
		let target = parent;
		
		const fn = (...nodes) => {
			let lastElement;
			
			for(let node of nodes){
				if("string" === typeof node)
					node = document.createTextNode(node);
				else if(node)
					lastElement =
					fn[++count] = node;
				node && target.appendChild(node);
			}
			
			target = lastElement || target;
			return fn;
		};
		fn[count] = target;
		return fn;
	},



	/**
	 * Return the containing element of a node that matches the given selector.
	 *
	 * If the node itself matches, it'll be returned unless ignoreSelf is set.
	 *
	 * @param {Node} node - A document node to inspect the hierarchy of
	 * @param {String} selector - A CSS selector string
	 * @param {Boolean} ignoreSelf - If given a truthy value, only the parents of a node will be queried
	 * @return {Element} The closest matching element, or NULL if none of the node's parents matched the selector.
	 */
	nearest(node, selector, ignoreSelf){
		let match;
		let parent        = ignoreSelf ? node.parentNode : node;
		const matches     = document.querySelectorAll(selector);
		const numMatches  = matches.length;

		if(numMatches) while(parent){
			for(match = 0; match < numMatches; ++match)
				if(matches[match] === parent) return parent;
			parent = parent.parentNode;
		}
		return null;
	},


	/**
	 * Locate the root directory shared by multiple paths.
	 *
	 * @param {Array} paths - A list of filesystem paths
	 * @return {String}
	 */
	findBasePath(paths){
		const POSIX = paths[0].indexOf("/") !== -1;
		let matched = [];
		
		// Spare ourselves the trouble if there's only one path
		if(1 === paths.length){
			matched = (paths[0].replace(/[\\/]+$/, "")).split(/[\\/]/g);
			matched.pop();
		}
		
		// Otherwise, comb each array
		else{
			const rows   = paths.map(d => d.split(/[\\/]/g));
			const width  = Math.max(...rows.map(d => d.length));
			const height = rows.length;
			
			let x;
			X: for(x = 0; x < width; ++x){
				const str = rows[0][x];
				for(let y = 1; y < height; ++y)
					if(str !== rows[y][x]) break X;
				matched.push(str);
			}
		}

		return matched.join(POSIX ? "/" : "\\");
	},
	
	
	/**
	 * Return the width of the scrollbars being displayed by this user's OS/device.
	 *
	 * @return {Number}
	 */
	getScrollbarWidth(){
		const el       = document.createElement("div");
		const {style}  = el;
		const size     = 120;
		style.width    =
		style.height   = size+"px";
		style.overflow = "auto";
		el.innerHTML   = Array(size*5).join(" W ");
		(document.body || document.documentElement).appendChild(el);

		const result = el.offsetWidth - el.scrollWidth;
		el.parentNode.removeChild(el);
		return result;
	},
	
	
	/**
	 * Generate a RegEx from its string-based representation.
	 *
	 * Useful for "deserialising" a regex from JSON. Optional flags can be given
	 * to override trailing modifiers found in the source, if any.
	 *
	 * @example "/\\S+/i"       -> /\S+/i
	 * @example "\\d+\\.\\d+$"  -> /\d+\.\d+$/
	 * @param  {String} src
	 * @param  {String} flags
	 * @return {RegExp}
	 */
	regexFromString(src, flags){
		src = (src || "").toString();
		if(!src) return null;
		
		const matchEnd = src.match(/\/([gimuy]*)$/);
		
		// Input is a "complete" regular expression
		if(matchEnd && /^\//.test(src))
			return new RegExp(
				src.replace(/^\/|\/([gimuy]*)$/gi, ""),
				flags != null ? flags : matchEnd[1]
			);
		
		return new RegExp(src, flags);
	},
	
	
	/**
	 * Escape special regex characters within a string.
	 *
	 * @example "file.js" -> "file\\.js"
	 * @param {String} input
	 * @return {String}
	 */
	escapeRegExp(input){
		return input.replace(/([/\\^$*+?{}[\]().|])/g, "\\$1");
	},
	
	
	/**
	 * Replace HTML metacharacters with numeric character references.
	 *
	 * Affected characters are: & < > "
	 *
	 * NOTE: Named entities are NOT checked, and will be double-escaped.
	 * Exceptions are made for `&quot;`, `&lt;` and `&gt;`, due to their
	 * abundant use. Numeric entities, even with invalid codepoints, are
	 * also safe from double-encoding.
	 * 
	 * @example "name"<email> -> &#34;name&#34;&#60;email&#62;
	 * @param {String} input
	 * @return {String}
	 */
	escapeHTML(input){
		return input.replace(/["<>]|&(?!quot;|gt;|lt;|#x?[A-F\d]+;)/gi, s => "&#"+s.charCodeAt(0)+";");
	},
	
	
	/**
	 * Parse a list of keywords into an object of boolean "true" values.
	 *
	 * @example parseKeywords("top left") -> {top: true, left: true}
	 * @param {Mixed} keywords - A space-delimited string or an array of strings
	 * @return {Object}
	 */
	parseKeywords(keywords){
		if(!Array.isArray(keywords)){
			if(!keywords) return null;
			keywords = [keywords];
		}
		
		const output = {};
		for(const k of keywords)
			k.split(/\s+/g).filter(i => i).forEach(k => output[k] = true);
		return output;
	},

	
	/**
	 * Return a {@link Promise} which auto-resolves after a delay.
	 *
	 * @param {Number} [delay=100] - Delay in milliseconds
	 * @return {Promise<void>}
	 */
	wait(delay = 100){
		return new Promise(resolve => {
			setTimeout(() => resolve(), delay);
		});
	},


	/**
	 * Keep calling a function until it returns a truthy value.
	 *
	 * @example poll(async () => (await fetch(url)).done);
	 * @param {Function} fn
	 * @param {Object} [opts={}]
	 * @param {Number} [opts.rate=100]
	 * @param {Number} [opts.timeout=0]
	 * @param {Boolean} [opts.negate=false]
	 * @return {Promise<void>}
	 */
	async poll(fn, opts = {}){
		const {rate = 100, timeout = 0, negate = false} = opts;
		const start = Date.now();
		for(;;){
			const result = await fn();
			if(!negate === !!result) return result;
			if(timeout && Date.now() - start > timeout)
				throw new Error("Timed out");
			await new Promise($ => setTimeout($, rate));
		}
	},
	
	
	/**
	 * Strip excess whitespace from a multiline string.
	 *
	 * Intended to be used with tagged template literals,
	 * but will work on any multiline string value.
	 *
	 * @example
	 * const HTML = deindent;
	 * let output = HTML `
	 *     <div>
	 *         (Text)
	 *     </div>
	 * `;
	 * output == "<div>\n\t(Text)\n</div>";
	 *
	 * @param {Object|String} input
	 * @param {...String} [args]
	 * @return {String}
	 */
	deindent(input, ...args){
		
		// Avoid breaking on String.raw if called as an ordinary function
		if("object" !== typeof input || "object" !== typeof input.raw)
			return deindent `${input}`;
		
		const depthTable = [];
		let maxDepth = Number.NEGATIVE_INFINITY;
		let minDepth = Number.POSITIVE_INFINITY;
		
		// Normalise newlines and strip leading or trailing blank lines
		const chunk = String.raw.call(null, input, ...args)
			.replace(/\r(\n?)/g, "$1")
			.replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, "");

		for(const line of chunk.split(/\n/)){
			// Ignore whitespace-only lines
			if(!/\S/.test(line)) continue;
			
			const indentString = line.match(/^[ \t]*(?=\S|$)/)[0];
			const indentLength = indentString.replace(/\t/g, " ".repeat(8)).length;
			if(indentLength < 1) continue;

			const depthStrings = depthTable[indentLength] || [];
			depthStrings.push(indentString);
			maxDepth = Math.max(maxDepth, indentLength);
			minDepth = Math.min(minDepth, indentLength);
			if(!depthTable[indentLength])
				depthTable[indentLength] = depthStrings;
		}

		if(maxDepth < 1)
			return chunk;
		
		const depthStrings = new Set();
		for(const column of depthTable.slice(0, minDepth + 1)){
			if(!column) continue;
			depthStrings.add(...column);
		}
		depthStrings.delete(undefined);
		const stripPattern = [...depthStrings].reverse().join("|");
		return chunk.replace(new RegExp(`^(?:${stripPattern})`, "gm"), "");
	},
};
