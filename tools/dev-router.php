<?php
// Serveur local de test : php -S localhost:8080 tools/dev-router.php (reproduit les adresses propres de .htaccess)
$p = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$root = dirname(__DIR__);
if ($p === '/api/contact.php') { chdir($root . '/api'); require $root . '/api/contact.php'; return true; }
if ($p !== '/' && is_file($root . $p)) return false;
$f = $p === '/' ? '/index.html' : $p . '.html';
if (preg_match('#^/[a-z0-9\-]*$#', $p) && is_file($root . $f)) { header('Content-Type: text/html; charset=utf-8'); readfile($root . $f); return true; }
http_response_code(404); readfile($root . '/404.html'); return true;
