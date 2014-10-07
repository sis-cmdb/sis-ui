Table of Contents
=================

- [Description](#description)
- [Requirements](#requirements)
- [Building](#building)
- [Configuration](#configuration)

# Description

The SIS-ui is a generic UI that lets users create schemas, hooks, and entities.
It is built with angular.js and is a completely standalone application that
uses only HTTP to communicate with the backend.  There is no server side
rendering component.

# Requirements

[Grunt](http://gruntjs.com) is used to build the UI.  Ensure grunt is installed
via `npm install -g grunt-cli`.

# Building

The default target produces a UI distribution in the `dist` directory.

The UI requires SIS-js to build.  This can be specified via the `--sisjspath`
option.  Additionally, SIS API Documentation can be built into the UI by
specifying the `--docpath` option.

A live reload server can be started via the `serve` target.  For example:

`grunt serve --sisjspath=../SIS-js/lib/sis-js.js --docpath=../SIS-web/docs`

will start a live reload server on port 9000 that serves up the UI and renders
the API documentation found in `../SIS-web/docs`.

# Configuration

Configuration for the SIS UI is specified via the angular `sisconfig` module
defined in `src/app/js/config.js`.  The only configuration required is the
SIS backend URL.  See `src/app/js/config.js.sample` for an example.
