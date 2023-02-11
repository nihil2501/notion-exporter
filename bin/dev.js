#!/usr/bin/env node

"use strict"

require("dotenv").config()

require("../dist").cli(process.argv.concat([process.env.NOTION_URL]))
