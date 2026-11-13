<?php

$publicPath = getcwd();

$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? ''
);

// Force /uploads/* through Laravel so PublicController::serveUpload handles
// direct-navigation redirects, bot rules, anti-hotlinking, and caching headers.
if ($uri !== '/' && !str_starts_with($uri, '/uploads/') && file_exists($publicPath . $uri)) {
    return false;
}

$formattedDateTime = date('D M j H:i:s Y');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$remoteAddress = $_SERVER['REMOTE_ADDR'] . ':' . $_SERVER['REMOTE_PORT'];

file_put_contents('php://stdout', "[$formattedDateTime] $remoteAddress [$requestMethod] URI: $uri\n");

// Ensure Laravel resolves `/` cleanly instead of treating a physical file under
// /uploads/* as SCRIPT_NAME when PHP's built-in server invokes this router.
$_SERVER['SCRIPT_FILENAME'] = $publicPath . '/index.php';
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

require_once $publicPath . '/index.php';
