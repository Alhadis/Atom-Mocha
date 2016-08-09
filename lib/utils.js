"use strict";

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
		};
		const node = document.createElement(nodeType);
		if(obj) absorb(node, obj);
		return node;
	},


	/**
	 * Curried method to append multiple nodes at once.
	 *
	 * @example addTo(node)(el1, el2, …)
	 * @example node = addTo(node)(…)[0]
	 * @return {Function} fn
	 */
	addTo(parent){
		const fn = (...nodes) => {
			for(let node of nodes){
				if("string" === typeof node)
					node = document.createTextNode(node);
				node != null && parent.appendChild(node);
			}
			return fn;
		};
		fn[0] = parent;
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
	 * @return {String} root
	 */
	findBasePath(paths){
		const POSIX = paths[0].indexOf("/") !== -1;
		let matched = [];
		
		/** Spare ourselves the trouble if there's only one path */
		if(1 === paths.length){
			matched = (paths[0].replace(/[\\/]+$/, "")).split(/[\\/]/g);
			matched.pop();
		}
		
		/** Otherwise, comb each array */
		else{
			const rows   = paths.map(d => d.split(/[\\/]/g));
			const width  = Math.max(...rows.map(d => d.length));
			const height = rows.length;
			
			let x, y;
			X: for(x = 0; x < width; ++x){
				const str = rows[0][x];
				for(let y = 1; y < height; ++y)
					if(str !== rows[y][x]) break X;
				matched.push(str);
			}
		}

		return matched.join(POSIX ? "/" : "\\");
	}
};
