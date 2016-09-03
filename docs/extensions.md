Extensions
==========

Atom-Mocha includes a few extras to help with writing specs:

* [.class](#class)
* [attachToDOM](#attachtodom)

These are always available unless [`noExtensions`](options.md#noextensions) is set.

In addition, the following objects are made globally-accessible:

```js
global.Mocha  = require("mocha");
global.Chai   = require("chai");
global.expect = Chai.expect;
```


### .class
A Chai extension that examines the `classList` of an HTML element:

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



### attachToDOM
Attaches an HTML element to the spec-runner window. Does nothing if running headlessly.

```js
const workspace = atom.views.getView(atom.workspace);
attachToDOM(workspace);
```

Fulfils the same duty as Atom's `jasmine.attachToDOM` extension.
