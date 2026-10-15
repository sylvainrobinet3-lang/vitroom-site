<?php
/**
 * Vitroom — réception des formulaires du site (devis, questions, diagnostic).
 * Hébergement : Hostinger (PHP). Les demandes sont vérifiées puis envoyées par e-mail,
 * avec une copie de sauvegarde protégée dans api/data/ (inaccessible depuis le web).
 *
 * Réglages facultatifs : copier config.sample.php en config.php (sur le serveur uniquement)
 * pour changer l'adresse de réception ou activer Cloudflare Turnstile.
 */

declare(strict_types=1);
date_default_timezone_set('Europe/Brussels');

$config = [
    'to'               => 'sylvainrobinet030308@gmail.com',
    'from'             => 'site@vitroom.be',
    'from_name'        => 'Site Vitroom',
    'turnstile_secret' => '',
    'min_ms'           => 3000,   // délai minimum entre l'ouverture de la page et l'envoi
    'max_per_hour'     => 6,      // envois maximum par adresse IP et par heure
];
if (is_file(__DIR__ . '/config.php')) {
    $local = include __DIR__ . '/config.php';
    if (is_array($local)) $config = array_merge($config, $local);
}

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
$isAjax = (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch') || str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function respond(bool $ok, string $message, int $status = 200): void {
    global $isAjax;
    http_response_code($status);
    if ($isAjax) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    } else {
        $back = '/';
        $ref = $_SERVER['HTTP_REFERER'] ?? '';
        $path = parse_url($ref, PHP_URL_PATH);
        if (is_string($path) && preg_match('#^/[a-z0-9\-/]*$#', $path)) $back = $path;
        header('Location: ' . $back . '?envoi=' . ($ok ? 'ok' : 'erreur'), true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(false, 'Méthode non autorisée.', 405);
}

// Même origine uniquement (protection contre l'envoi depuis un autre site)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !preg_match('#^https://(www\.)?vitroom\.be$#', $origin) && !preg_match('#^http://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
    respond(false, 'Origine non autorisée.', 403);
}

function field(string $k, int $max = 500): string {
    $v = $_POST[$k] ?? '';
    if (!is_string($v)) return '';
    $v = trim(str_replace(["\r\n", "\r"], "\n", $v));
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return mb_substr($v, 0, $max);
}
function valid_mail(string $v): bool { return $v !== '' && filter_var($v, FILTER_VALIDATE_EMAIL) !== false; }
function valid_tel(string $v): bool {
    $s = preg_replace('#[\s./()\-]#', '', $v) ?? '';
    return (bool) (preg_match('/^(\+32|0032)[1-9]\d{7,8}$/', $s) || preg_match('/^0[1-9]\d{7,8}$/', $s));
}

// ---------- Anti-spam ----------
$silentOk = 'Merci, votre demande est bien envoyée.';
if (field('site_web') !== '') respond(true, $silentOk);                      // champ piège rempli : robot
$elapsed = (int) field('t', 12);
if ($elapsed < $config['min_ms']) respond(false, 'Envoi trop rapide. Patientez quelques secondes puis réessayez.', 429);

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) @mkdir($dataDir, 0750, true);
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$ipHash = hash('sha256', $ip . '|' . __DIR__ . '|' . gmdate('Y-m-d'));
$rlDir = $dataDir . '/limite';
if (!is_dir($rlDir)) @mkdir($rlDir, 0750, true);
if (is_dir($rlDir)) {
    foreach (glob($rlDir . '/*.json') ?: [] as $f) { if (filemtime($f) < time() - 86400) @unlink($f); }
    $rlFile = $rlDir . '/' . $ipHash . '.json';
    $hits = is_file($rlFile) ? (json_decode((string) file_get_contents($rlFile), true) ?: []) : [];
    $hits = array_values(array_filter($hits, fn($ts) => is_int($ts) && $ts > time() - 3600));
    if (count($hits) >= $config['max_per_hour']) respond(false, 'Trop de demandes envoyées depuis votre connexion. Réessayez plus tard ou appelez le 0470 53 70 08.', 429);
    $hits[] = time();
    @file_put_contents($rlFile, json_encode($hits), LOCK_EX);
}

if ($config['turnstile_secret'] !== '') {
    $token = field('cf-turnstile-response', 4096);
    $ok = false;
    if ($token !== '') {
        $ctx = stream_context_create(['http' => ['method' => 'POST', 'timeout' => 8,
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => http_build_query(['secret' => $config['turnstile_secret'], 'response' => $token, 'remoteip' => $ip])]]);
        $res = @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $ctx);
        $ok = $res !== false && (json_decode($res, true)['success'] ?? false) === true;
    }
    if (!$ok) respond(false, 'La vérification anti-robot a échoué. Rechargez la page et réessayez.', 400);
}

// ---------- Champs ----------
$forms = [
    'devis' => ['subject' => 'Nouvelle demande de devis', 'fields' => [
        'metier' => 'Activité', 'entreprise' => 'Entreprise', 'commune' => 'Commune', 'situation' => 'Situation', 'existant' => 'Site actuel',
        'objectifs' => 'Objectifs', 'taille' => 'Taille du site', 'options' => 'Options', 'delai' => 'Délai', 'nom' => 'Nom',
        'telephone' => 'Téléphone', 'email' => 'E-mail', 'preference' => 'Préférence de contact', 'message' => 'Message']],
    'questions' => ['subject' => 'Nouvelle question', 'fields' => [
        'nom' => 'Nom', 'sujet' => 'Sujet', 'telephone' => 'Téléphone', 'email' => 'E-mail', 'question' => 'Question']],
    'diagnostics' => ['subject' => 'Demande de diagnostic gratuit', 'fields' => [
        'nom' => 'Nom', 'contact' => 'Contact', 'lien' => 'Site ou page', 'entreprise' => 'Entreprise', 'commune' => 'Commune',
        'metier' => 'Activité', 'score' => 'Score au questionnaire', 'points' => 'Points faibles']],
];
$type = field('formulaire', 20);
if (!isset($forms[$type])) respond(false, 'Formulaire inconnu.', 400);
$long = ['message', 'question', 'points'];
$data = [];
foreach ($forms[$type]['fields'] as $k => $label) $data[$k] = field($k, in_array($k, $long, true) ? 5000 : 300);

// ---------- Validation ----------
$err = '';
if (field('rgpd', 3) !== 'oui') $err = 'Cochez la case pour accepter l\'utilisation de vos données pour répondre à votre demande.';
elseif ($data['nom'] === '') $err = 'Indiquez votre nom.';
elseif ($type === 'devis') {
    if ($data['metier'] === '') $err = 'Choisissez votre activité.';
    elseif ($data['objectifs'] === '') $err = 'Choisissez au moins un objectif pour votre site.';
    elseif ($data['telephone'] === '' && $data['email'] === '') $err = 'Indiquez un numéro de téléphone ou une adresse e-mail.';
    elseif ($data['telephone'] !== '' && !valid_tel($data['telephone'])) $err = 'Le numéro de téléphone ne semble pas valide (ex. 0470 12 34 56).';
    elseif ($data['email'] !== '' && !valid_mail($data['email'])) $err = 'L\'adresse e-mail ne semble pas valide.';
} elseif ($type === 'questions') {
    if (!valid_tel($data['telephone']) && !valid_mail($data['email'])) $err = 'Indiquez un numéro de téléphone belge ou une adresse e-mail valide.';
    elseif ($data['question'] === '') $err = 'Écrivez votre question.';
} elseif ($type === 'diagnostics') {
    if (!valid_tel($data['contact']) && !valid_mail($data['contact'])) $err = 'Indiquez un numéro de téléphone belge ou une adresse e-mail valide.';
}
if ($err !== '') respond(false, $err, 422);

// ---------- Copie de sauvegarde ----------
$record = ['date' => date('c'), 'formulaire' => $type] + $data;
if (is_dir($dataDir)) @file_put_contents($dataDir . '/demandes-' . date('Y-m') . '.jsonl', json_encode($record, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);

// ---------- E-mail ----------
$clean = fn(string $s) => trim(preg_replace('/[\r\n]+/', ' ', $s) ?? '');
$subject = $forms[$type]['subject'] . ' — ' . $clean($data['nom']) . ($data['entreprise'] ?? '' ? ' (' . $clean($data['entreprise']) . ')' : '');
$lines = [];
foreach ($forms[$type]['fields'] as $k => $label) {
    if ($data[$k] === '') continue;
    $v = $data[$k];
    $lines[] = str_contains($v, "\n") ? $label . " :\n" . $v : $label . ' : ' . $v;
}
$lines[] = '';
$lines[] = '— Envoyé depuis vitroom.be le ' . date('d/m/Y à H:i') . '. Consentement RGPD donné.';
$body = implode("\n", $lines);

$replyTo = '';
if (valid_mail($data['email'] ?? '')) $replyTo = $data['email'];
elseif (valid_mail($data['contact'] ?? '')) $replyTo = $data['contact'];

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: ' . mb_encode_mimeheader($config['from_name'], 'UTF-8') . ' <' . $config['from'] . '>',
    'X-Mailer: Vitroom',
];
if ($replyTo !== '') $headers[] = 'Reply-To: ' . $clean($replyTo);

$sent = @mail($config['to'], mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n"), $body, implode("\r\n", $headers), '-f' . $config['from']);
if (!$sent) {
    // La demande est quand même conservée dans la copie de sauvegarde.
    respond(false, 'L\'envoi n\'a pas abouti. Réessayez dans un instant, ou contactez-nous directement au 0470 53 70 08.', 500);
}
respond(true, 'Merci, votre demande est bien envoyée.');
