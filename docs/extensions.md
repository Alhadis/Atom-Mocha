Extensions
==========

Atom-Mocha includes a few extras to help with writing specs:

* [`.buffer`](#buffer)
* [`.class`](#class)
* [`.drawn`](#drawn)
* [`.editor`](#editor)
* [`.equalPath`](#equalpath)
* [`.existOnDisk`](#existondisk)
* [`.focus`](#focus)
* [`attachToDOM()`](#attachtodom)
* [`resetDOM()`](#resetdom)
* [`unlessOnWindows()`](#unlessonwindows)
* [`when()`](#when)

These are always available unless [`noExtensions`](options.md#noextensions) is set.

In addition, the following objects are made globally-accessible:

```js
global.Mocha  = require("mocha");
global.Chai   = require("chai");
global.expect = Chai.expect;
```


### `.buffer`
Asserts that subject is a [`TextBuffer`][] instance. See also: [`.editor`](#editor).

```js
const editor = atom.workspace.getActiveTextEditor();
expect(editor.getBuffer()).to.be.a.buffer;
expect(editor).not.to.be.a.buffer;
```


### `class`
Asserts that an HTML element's [`classList`][] contains one or more CSS classes.

```js
expect(div).to.have.class("error-msg");
expect(btn).to.have.classes(["icon", "btn"]);
expect(btn).to.have.classes("icon", "btn");
expect([btn1, btn2]).to.have.class("btn");
btn1.should.have.classes("icon btn");
```

Class names may be specified as an array of strings, or a whitespace-delimited string.
The function is variadic: multiple arguments of either type may be passed at once.

Both `class` and `classes` are equivalent invocations; the pluralised form exists only for readability.



### `.drawn`
Assert that an HTML element is being rendered in the DOM tree.

```js
expect(New("div")).not.to.be.drawn;
expect(document.body).to.be.drawn;
```

Note that elements with `opacity: 0` or `visibility: hidden` are still "drawn",
because their dimensions affect the document's layout:

```js
expect(New("div", {style: {opacity: 0}})).to.be.drawn;
expect(New("div", {style: {visibility: "hidden"}})).to.be.drawn;
```

The same is true of positioned elements which are offset outside the viewport:

```css
#hidden-block{
	position: absolute;
	left: -9999px;
	top: -9999px;
}
```

```js
expect(document.querySelector("#hidden-block")).to.be.drawn;
```


### `.editor`
Asserts that subject is a [`TextEditor`][] object. See also [`.buffer`](#buffer).

```js
const editor = atom.workspace.getActiveTextEditor();
expect(editor).to.be.an.editor;
expect(editor.buffer).not.to.be.an.editor;
```


### `.equalPath`
Asserts that two filesystem paths are equal.

```js
expect("/foo/bar/..").to.equalPath("/foo");
```



### `.existOnDisk`
Asserts that a given string matches an existing file or directory:

```js
expect("/usr/local/").to.existOnDisk;
expect(__filename).to.existOnDisk;
"/usr/local/bin/atom".should.existOnDisk;
"/::<:N:O:P:E:>::*?/".should.not.existOnDisk;
```



### `.focus`
Assert that an HTML element has user focus, or contains an element which does.

```js
expect(treeView).to.have.focus;
expect(New("div")).not.to.have.focus;
document.activeElement.should.have.focus;
```

__Added in v2.2.0:__ `.focus` now works on [`TextEditor`][] objects, asserting that the editor is currently "active" in the user's workspace:

```js
const editor = atom.workspace.getActiveTextEditor();
expect(editor).to.have.focus;         // true
expect(editor.element).to.have.focus; // false
```

Additionally, the assertion also works on "component-like" objects.
That is, an object which doesn't inherit from [`HTMLElement`][], but contains an `.element` property that does.

For example, the [`tree-view`][] package creates a singleton `TreeView` which references the physical DOM element in its `.element` property:

```js
const {treeView} = atom.packages.getActivePackage("tree-view").mainModule;
expect(treeView).not.to.be.instanceOf(HTMLElement);
expect(treeView.element).to.be.instanceOf(HTMLElement);
await atom.commands.dispatch("atom-workspace", "tree-view:focus");
expect(treeView).to.have.focus; // true
```



### `attachToDOM()`
Attach an HTML element to the spec-runner window.

```js
const workspace = atom.views.getView(atom.workspace);
attachToDOM(workspace);
```

Fulfils the same duty as Atom's `jasmine.attachToDOM` extension.



### `resetDOM()`
Remove unrecognised DOM elements from the spec-runner's `body` element. Complements [`attachToDOM()`](#attachtodom).

```js
afterEach(() => resetDOM());
```

__WARNING:__  
This wipes any element that isn't `body > #mocha`. Avoid using this function if:
* You have a custom reporter with different element IDs
* Have programmatically added extra feedback elements using the [`js`](options.md#js) option (which sit outside the `#mocha` wrapper).



### `unlessOnWindows()`
Predicate to skip POSIX-only tests. Mocha's `.skip` function flags a test
as `pending`, implying temporary omission. For tests which are impossible
to run on Windows, this feedback is rarely warranted or desired.

`unlessOnWindows()` allows tests to be silently skipped if run on Windows.
No feedback is emitted, and no tests are marked pending. The whole block
becomes invisible to the spec-runner:

~~~js
unlessOnWindows.describe("Symlinks", …);
unlessOnWindows.it("tests hard-links", …);
unlessOnWindows.specify("More symlinks", …);
~~~

Arbitrary callbacks are also supported:

~~~js
unlessOnWindows(function(){
	unixyStuff(…);
});
~~~



### `when()`
Call Mocha's `describe()` with `"When "` prepended to its description:

~~~js
when("colours are disabled", () =>
	it("shows an uncoloured icon", () => {
		…logic
	}));
~~~

Complements the [`autoIt`][] setting, and helps specs read more naturally.
Only globalised if `when` doesn't already exist on the `global` object.

[`autoIt`]: options.md#autoit



<!-- Referenced links -->
[`TextBuffer`]:  https://atom.io/docs/api/v1.38.2/TextBuffer
[`TextEditor`]:  https://atom.io/docs/api/v1.38.2/TextEditor
[`tree-view`]:   https://github.com/atom/tree-view
[`HTMLElement`]: https://mdn.io/HTMLElement
[`classList`]:   https://mdn.io/Element.classList
