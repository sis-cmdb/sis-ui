Table of Contents
=================

- [Description](#description)
- [Requirements](#requirements)
- [Building](#building)
- [Configuration](#configuration)
- [LICENSE](#license)

# Description

The sis-ui is a generic UI that lets users create schemas, hooks, and entities.
It is built with angular.js and is a completely standalone application that
uses only HTTP to communicate with the backend.  There is no server side
rendering component.

# Requirements

[Grunt](http://gruntjs.com) is used to build the UI.  Ensure grunt is installed
via `npm install -g grunt-cli`.  `sudo` might be required depending on your
installation.

# Building

Bower is required to build.  

1. `sudo npm install -g bower`
2. `npm install`
  a. If the git protocol (9418/tcp) access to github.com is blocked, run `git config --global url."https://".insteadOf git://` and re-run `npm install`.
  b. `npm install` does a `bower install` for the UI components
3. `grunt`

The default target produces a UI distribution in the `dist` directory.

# Configuration

Configuration for the SIS UI is specified via the angular `sisconfig` module
defined in `src/app/js/config.js`.  The only configuration required is the
SIS backend URL.  See `src/app/js/config.js.sample` for an example.

# Running the server

A live reload server can be started via the `serve` target.  SIS API
Documentation can be built into the UI by specifying the `--docpath` option.
For example:

`grunt serve --sisjspath=../sis-js/lib/sis-client.js --docpath=../sis-api/docs`

will start a live reload server on port 9000 that serves up the UI and renders
the API documentation found in `../sis-api/docs`.

# LICENSE

This software is licensed under the BSD 3-Clause license.  Please refer to the [LICENSE](./LICENSE) for more information.
