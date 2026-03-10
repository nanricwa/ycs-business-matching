<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    json_headers();
    http_response_code(204);
    exit;
}

$auth = get_authorization_header();
$token = preg_replace('/^Bearer\s+/i', '', $auth);
$payload = $token !== '' ? jwt_decode($token) : null;
if (!$payload) {
    json_response(['error' => 'Unauthorized'], 401);
    exit;
}
$userId = (int) ($payload['userId'] ?? 0);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('SELECT target_user_id FROM favorites WHERE user_id = ?');
    $stmt->execute([$userId]);
    $ids = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $ids[] = (int) $row['target_user_id'];
    }
    json_response(['favoriteIds' => $ids]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $targetId = (int) ($body['targetUserId'] ?? 0);
    if ($targetId <= 0) {
        json_response(['error' => 'targetUserId is required'], 400);
        exit;
    }
    if ($targetId === $userId) {
        json_response(['error' => 'Cannot favorite yourself'], 400);
        exit;
    }

    $stmt = $pdo->prepare('SELECT id FROM favorites WHERE user_id = ? AND target_user_id = ?');
    $stmt->execute([$userId, $targetId]);
    if ($stmt->fetch()) {
        $pdo->prepare('DELETE FROM favorites WHERE user_id = ? AND target_user_id = ?')->execute([$userId, $targetId]);
        json_response(['success' => true, 'action' => 'removed']);
    } else {
        $pdo->prepare('INSERT INTO favorites (user_id, target_user_id) VALUES (?, ?)')->execute([$userId, $targetId]);
        json_response(['success' => true, 'action' => 'added']);
    }
    exit;
}

json_response(['error' => 'Method not allowed'], 405);
