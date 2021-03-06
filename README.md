Atom-Mocha
==========

[![Build status: GitHub Actions][Actions-badge]][Actions-link]
[![Build status: Travis CI][TravisCI-badge]][TravisCI-link]
[![Build status: AppVeyor][AppVeyor-badge]][AppVeyor-link]
[![Latest package version][NPM-version]][Release-link]

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
To pass options to Mocha, place a [`.mocharc.{js,json,yml}`](https://mochajs.org/#configuring-mocha-nodejs) file in your package's base directory.
(or in your specs folder, whichever you prefer).
Alternatively, you can use `package.json`'s `"mocha":` property instead:

~~~json
{
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



[Referenced links]:____________________________________________________________________
[Actions-badge]:  https://img.shields.io/github/workflow/status/Alhadis/Atom-Mocha/Atom%20CI?label=GitHub%20Actions&logo=github
[Actions-link]:   https://github.com/Alhadis/Atom-Mocha/actions
[AppVeyor-badge]: https://img.shields.io/appveyor/build/Alhadis/Atom-Mocha?label=AppVeyor&logo=appveyor&logoColor=white
[AppVeyor-link]:  https://ci.appveyor.com/project/Alhadis/Atom-Mocha
[TravisCI-badge]: https://img.shields.io/travis/com/Alhadis/Atom-Mocha?label=Travis%20CI&logo=travis
[TravisCI-link]:  https://travis-ci.com/Alhadis/Atom-Mocha
[NPM-version]:    https://img.shields.io/npm/v/atom-mocha.svg?colorB=brightgreen
[Release-link]:   https://github.com/Alhadis/Atom-Mocha/releases/latest
