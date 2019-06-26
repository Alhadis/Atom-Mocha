"use strict";
const {flattenList} =

module.exports = {
	
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
	 * "Flatten" a (possibly nested) list of strings into a single-level array.
	 *
	 * Strings are split by whitespace as separate elements of the final array.
	 *
	 * @param {Array|String} input
	 * @param {WeakSet} [refs=null]
	 * @return {String[]} An array of strings
	 */
	flattenList(input, refs = null){
		refs = refs || new WeakSet();
		input = "string" === typeof input
			? [input]
			: refs.add(input) && Array.from(input).slice();
		
		const output = [];
		for(const value of input){
			if(!value) continue;
			switch(typeof value){
				case "object":
					if(refs.has(value)) continue;
					refs.add(value);
					output.push(...flattenList(value, refs));
					break;
				default:
					output.push(...String(value).trim().split(/\s+/));
			}
		}
		return output;
	},
	
	
	/**
	 * Format a list of strings for human-readable output.
	 *
	 * @example
	 * formatList(["A", "B"])            == '"A" and "B"';
	 * formatList(["A", "B", "C"])       == '"A", "B", and "C"';
	 * formatList(["A", "B", "C"], "or") == '"A", "B", or "C"';
	 *
	 * @param {String[]} list
	 * @param {String} [rel="and"]
	 * @return {String}
	 */
	formatList(list, rel = "and"){
		const inspect = input => JSON.stringify(input);
		list = [...list];
		if(list.length > 1){
			list = list.map(inspect);
			const last = list.pop();
			return list.join(", ")
				+ (list.length > 2 ? "," : "")
				+ ` ${rel} ${last}`;
		}
		else{
			list = list.map(inspect).join(", ") || "''";
			return list;
		}
	},
};
