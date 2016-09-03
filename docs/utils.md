Utility functions
=================

These functions were added for internal use, but may be useful to package authors.

~~~js
const utils = require("atom-mocha/lib/utils.js");
~~~

None of them have external dependencies, and may be used freely in any ES6-compatible environment.

More self-contained functions may be found [here](https://github.com/Alhadis/Snippets/blob/master/js/utils.js).




addTo (parent)
--------------
Curried method to append multiple nodes at once.

Successive calls to the returned function insert new nodes into the previous element.
For JavaScript programmers unfamiliar with currying, [this article](http://fr.umio.us/favoring-curry) offers a good introduction.

**Returns:** [Function]

**Parameters:**  
* [Element] `parent` - HTML element receiving the first addition

**Examples:**  
~~~js
addTo(document.body)
	(New("header"))
	(New("h1"))
	(New("strong"))
	("Heading");
~~~

This generates the following structure:
~~~html
<header>
	<h1>
		<strong>
			Heading
		</strong>
	</h1>
</header>
~~~



findBasePath (paths)
--------------------
Locate the root directory shared by multiple paths.

**Returns:** [String]

**Parameters:**
* [Array] `paths` - A list of filesystem paths

**Example:**  
~~~js
const paths = [
	"/Users/johngardner/Labs/Atom-Mocha/package.json",
	"/Users/johngardner/Labs/Atom-Mocha/spec",
	"/Users/johngardner/Labs/Atom-Mocha/spec/subdir/misc",
	"/Users/johngardner/Labs/Atom-Mocha/spec/subdir"
];

findBasePath(paths); // -> "/Users/johngardner/Labs/Atom-Mocha"
~~~




link (symbol, objects)
----------------------
Use a [Symbol] to store references between objects.

**Parameters:**
* [Symbol] `symbol`
* [Object] `objects`




nearest (subject, selector [, ignoreSelf])
------------------------------------------
Return the containing element of a node that matches the given selector.

If the node itself matches, it'll be returned unless `ignoreSelf` is set.

**Returns:** [Element] - The closest matching element, or `null` if none of the node's parents matched the selector.

**Parameters:**  
* [Node] `subject` - A document node to inspect the hierarchy of
* [String] `selector` - A CSS selector
* [Boolean] `ignoreSelf` - If given a truthy value, only the parents of a node will be queried




New (nodeType [, obj])
----------------------
Wrapper for creating a new DOM element, optionally assigning it a hash of properties upon construction.

**Returns:** [Element]

**Parameters:**  
* [String] `nodeType` - Element type to create
* [Object] `obj` - Hash of properties to assign the newly-created object

**Example:**  
~~~js
let div = New("div", {
	id: "wrapper-element",
	style: {
		fontSize: "15",
		color: "#ff0"
	}
});

// Equivalent to this:
let div = document.createElement("div");
div.id = "wrapper-element";
div.style.fontSize = "15";
div.style.color = "#ff0";
~~~




parseKeywords (keywords)
------------------------
Parse a list of keywords into an object of boolean `true` values.

**Returns:** [Object]

**Parameters:**  
* [Array]/[String] `keywords` - A space-delimited string or an array of strings

**Example:**
~~~js
parseKeywords("top left"); // -> {top: true, left: true}
~~~




regexFromString (src [, flags])
-------------------------------
Generate a RegEx from its string-based representation. Useful for "deserialising" a regex from JSON.

**Returns:** [RegExp]

**Parameters:**
* [String] `src` - String-based representation of a regex
* [String] `flags` - Optional flags to override those specified in `src`, if present

**Examples:**  
~~~js
regexFromString("/\\S+/i");      // ->  /\S+/i
regexFromString("\\d+\\.\\d+$"); // ->  /\d+\.\d+$/
~~~





[Referenced links]:_____________________________________________________________
[Array]:     https://mdn.io/JavaScript/Reference/Global_Objects/Array
[Boolean]:   https://mdn.io/JavaScript/Reference/Global_Objects/Boolean
[Element]:   https://developer.mozilla.org/en-US/docs/Web/API/Element
[Function]:  https://mdn.io/JavaScript/Reference/Global_Objects/Function
[Node]:      https://developer.mozilla.org/en-US/docs/Web/API/Node
[Object]:    https://mdn.io/JavaScript/Reference/Global_Objects/Object
[RegExp]:    https://mdn.io/JavaScript/Reference/Global_Objects/RegExp
[String]:    https://mdn.io/JavaScript/Reference/Global_Objects/String
[Symbol]:    https://mdn.io/JavaScript/Reference/Global_Objects/Symbol
