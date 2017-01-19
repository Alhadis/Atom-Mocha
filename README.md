Atom-Mocha
==========

Run package specs in [Atom](https://atom.io/) using [Mocha](https://mochajs.org/) and [Chai](http://chaijs.com/).

<img src="https://raw.githubusercontent.com/Alhadis/Atom-Mocha/static/preview.png" width="657" alt="Preview" />



Installation
------------
Run `npm install atom-mocha --save-dev` in your package's directory.

If nothing's happening:
* Check your `package.json` file contains `"atomTestRunner": "atom-mocha"`
* Atom may have cached your package's metadata. Refresh it by quitting and restarting the program.

If you're still experiencing difficulties, [please file an issue](https://github.com/Alhadis/Atom-Mocha/issues).



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



Reminders
---------
* Chai's [expect](http://chaijs.com/api/bdd/) function is automatically globalised for you.
* [Nifty extras are available](docs/extensions.md) to help with writing tests.
* Reload the spec-runner window by pressing <kbd>Ctrl/Cmd + R</kbd>.
* Tests can be batch-toggled by <kbd>Alt</kbd>-clicking their title.
