Utility functions
=================

These functions are used internally by `atom-mocha`, but may be useful for authors:

* [`addTo()`](#addto)
* [`escapeHTML()`](#escapehtml)
* [`escapeRegExp()`](#escaperegexp)
* [`findBasePath()`](#findbasepath)
* [`flattenList()`](#flattenlist)
* [`formatList()`](#formatlist)
* [`getScrollbarWidth()`](#getscrollbarwidth)
* [`nearest()`](#nearest)
* [`New()`](#new)
* [`parseKeywords()`](#parsekeywords)
* [`regexFromString()`](#regexfromstring)

Since `v2.2.0`, they can be accessed from the `.utils` property of the `AtomMocha` global:

~~~js
const {utils} = global.AtomMocha;
~~~

More self-contained utilities can be found at [`Alhadis/Utils`](https://github.com/Alhadis/Utils).




<a name="addto">addTo (parent)</a>
----------------------------------
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


<a name="escapehtml">escapeHTML (input)</a>
-------------------------------------------
Replace HTML metacharacters with numeric character references.

Affected characters are `& < > "`.

__NOTE:__ Named entities are NOT checked, and *will* be double-escaped.
Exceptions are made for `&quot;`, `&lt;` and `&gt;`, due to their abundant use.
Numeric entities, even with invalid codepoints, are also safe from double-encoding.

**Returns:** [String]

**Parameters:**
* [String] `input`

**Example:**
~~~js
escapeHTML('"name"<email>'); // -> "&#34;name&#34;&#60;email&#62;"
~~~



<a name="escaperegexp">escapeRegExp (input)</a>
-----------------------------------------------
Escape special regex characters within a string.

**Returns:** [String]

**Parameters:**  
* [String] `input`

**Examples:**
~~~js
escapeRegExp("file.js (2 KBs)"); // -> "file\\.js \\(2 KBs\\)"
~~~




<a name="findbasepath">findBasePath (paths)</a>
-----------------------------------------------
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



<a name="flattenlist">flattenList (input)</a>
---------------------------------------------
“Flatten” a (possibly nested) list of strings into a single-level array.

Strings are split by whitespace as separate elements of the final array.
The function is otherwise identical to [`Array.prototype.flat`](https://mdn.io/Array.prototype.flat).

**Returns:** [Array] - An array of strings

**Parameters:**
* [Array]/[String] input



<a name="formatlist">formatList (list [, any])</a>
--------------------------------------------------
Format a list of strings for human-readable output.

**Returns:** [String]

**Parameters:**
* [Array] `list` - An array of strings
* [String] `rel` - Word to insert between the last and second-last items (default: `"and"`).

**Examples:**
~~~js
formatList(["A", "B"]);             // -> "A" and "B"
formatList(["A", "B", "C"]);        // -> "A", "B", and "C"
formatList(["A", "B", "C"], "or");  // -> "A", "B", or "C"
~~~


getScrollbarWidth
-----------------
Return the width of the scrollbars being displayed by this user's OS/device.

**Returns:** [Number]

**Example:**
~~~js
const width = getScrollBarWidth(); // Windows: 17, macOS: 0

// Compensate for added scrollbar
if(width){
	element.style.right = "-" + width + "px";
	element.style.paddingRight = width + "px";
}
~~~



<a name="nearest">nearest (subject, selector [, ignoreSelf])</a>
----------------------------------------------------------------
Return the containing element of a node that matches the given selector.

If the node itself matches, it'll be returned unless `ignoreSelf` is set.

**Returns:** [Element] - The closest matching element, or `null` if none of the node's parents matched the selector.

**Parameters:**  
* [Node] `subject` - A document node to inspect the hierarchy of
* [String] `selector` - A CSS selector
* [Boolean] `ignoreSelf` - If given a truthy value, only the parents of a node will be queried




<a name="new">New (nodeType [, obj])</a>
----------------------------------------
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




<a name="parsekeywords">parseKeywords (keywords)</a>
----------------------------------------------------
Parse a list of keywords into an object of boolean `true` values.

**Returns:** [Object]

**Parameters:**  
* [Array]/[String] `keywords` - A space-delimited string or an array of strings

**Example:**
~~~js
parseKeywords("top left"); // -> {top: true, left: true}
~~~




<a name="regexfromstring">regexFromString (src [, flags])</a>
-------------------------------------------------------------
Generate a regular expression from its string-based representation. Useful for "deserialising" a regex from JSON.

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
[Number]:    https://mdn.io/JavaScript/Reference/Global_Objects/Number
[Object]:    https://mdn.io/JavaScript/Reference/Global_Objects/Object
[RegExp]:    https://mdn.io/JavaScript/Reference/Global_Objects/RegExp
[String]:    https://mdn.io/JavaScript/Reference/Global_Objects/String
[Symbol]:    https://mdn.io/JavaScript/Reference/Global_Objects/Symbol
