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
    $targetId = (int) ($_GET['userId'] ?? 0);
    if ($targetId <= 0) {
        json_response(['error' => 'userId is required'], 400);
        exit;
    }
    $stmt = $pdo->prepare(
        'SELECT r.id, r.reviewer_id, r.comment, r.created_at, r.updated_at, u.name AS reviewer_name, u.profile_image_url AS reviewer_image '
        . 'FROM reviews r JOIN users u ON r.reviewer_id = u.id '
        . 'WHERE r.target_user_id = ? ORDER BY r.created_at DESC'
    );
    $stmt->execute([$targetId]);
    $reviews = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $reviews[] = [
            'id' => (int) $row['id'],
            'reviewerId' => (int) $row['reviewer_id'],
            'reviewerName' => $row['reviewer_name'],
            'reviewerImage' => $row['reviewer_image'] ?: '',
            'comment' => $row['comment'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }
    json_response(['reviews' => $reviews]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $targetId = (int) ($body['targetUserId'] ?? 0);
    $comment = trim((string) ($body['comment'] ?? ''));
    if ($targetId <= 0) {
        json_response(['error' => 'targetUserId is required'], 400);
        exit;
    }
    if ($targetId === $userId) {
        json_response(['error' => 'Cannot review yourself'], 400);
        exit;
    }
    if ($comment === '') {
        json_response(['error' => 'Comment is required'], 400);
        exit;
    }
    if (mb_strlen($comment) > 500) {
        json_response(['error' => 'Comment must be 500 characters or less'], 400);
        exit;
    }

    $stmt = $pdo->prepare('SELECT id FROM reviews WHERE reviewer_id = ? AND target_user_id = ?');
    $stmt->execute([$userId, $targetId]);
    if ($stmt->fetch()) {
        $pdo->prepare('UPDATE reviews SET comment = ? WHERE reviewer_id = ? AND target_user_id = ?')
            ->execute([$comment, $userId, $targetId]);
        json_response(['success' => true, 'action' => 'updated']);
    } else {
        $pdo->prepare('INSERT INTO reviews (reviewer_id, target_user_id, comment) VALUES (?, ?, ?)')
            ->execute([$userId, $targetId, $comment]);
        json_response(['success' => true, 'action' => 'created']);
    }
    exit;
}

json_response(['error' => 'Method not allowed'], 405);
