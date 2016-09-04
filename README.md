Atom-Mocha
==========

Run package specs in [Atom](https://atom.io/) using [Mocha](https://mochajs.org/) and [Chai](http://chaijs.com/).

<img src="https://raw.githubusercontent.com/Alhadis/Atom-Mocha/static/preview.png" width="657" alt="Preview" />



Installation
------------
1. Run `npm install atom-mocha --save-dev`
2. Add this to your `package.json` file:

	```json
	"atomTestRunner": "./node_modules/.bin/atom-mocha"
	```

3. Quit and restart Atom to clear its internal cache.


Chai's [expect](http://chaijs.com/api/bdd/) function is automatically globalised when running specs, so you don't need to `require` it in every spec-file.
Check the [extensions reference](docs/extensions.md) for details on what's available.


Configuration
-------------
To pass options to Mocha, place a [`mocha.opts`](https://mochajs.org/#mochaopts) file in your package's specs directory.
Alternatively, you can use `package.json` instead:

~~~json
"atom-mocha": {
	"mocha": {
		"bail": true,
		"ui": "bdd"
	}
}
~~~

For details on Mocha's configuration settings, [consult their documentation](https://mochajs.org/#usage).
Options specific to this spec-runner are [described in depth here](docs/options.md).



Tips
----
* Reload the spec-runner window by pressing <kbd>Ctrl/Cmd + R</kbd>.
* Tests can be batch-toggled by <kbd>Alt</kbd>-clicking their title.
