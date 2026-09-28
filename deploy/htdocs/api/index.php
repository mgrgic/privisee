<?php

// Shim: this directory (htdocs/api/) is the public entry point for the backend,
// while the actual PHP source (src/, vendor/, bin/, .env) lives one level above
// htdocs so it is never directly web-accessible. Adjust the path below if your
// account puts backend/ somewhere else relative to htdocs/.
require dirname(__DIR__, 2) . '/backend/public/index.php';
