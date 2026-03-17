<?php
/**
 * プロフィール更新（ログインユーザー自身のみ）
 * POST { name, phone, chatworkId, sns1Type, ... , profileImageUrl, ... }
 */
ob_start();
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    json_headers();
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    json_response(['error' => 'Method not allowed'], 405);
    exit;
}

// 認証
$auth = get_authorization_header();
$token = preg_replace('/^Bearer\s+/i', '', $auth);
$payload = $token !== '' ? jwt_decode($token) : null;
if (!$payload || empty($payload['sub'])) {
    ob_end_clean();
    json_response(['error' => 'Unauthorized'], 401);
    exit;
}
$userId = (int) $payload['sub'];

$body = json_decode(file_get_contents('php://input'), true) ?: [];

$skills = isset($body['skills']) && is_array($body['skills']) ? json_encode($body['skills']) : null;
$interests = isset($body['interests']) && is_array($body['interests']) ? json_encode($body['interests']) : null;

try {
    $stmt = $pdo->prepare(<<<'SQL'
UPDATE users SET
  name = COALESCE(?, name),
  phone = COALESCE(?, phone),
  chatwork_id = COALESCE(?, chatwork_id),
  sns1_type = COALESCE(?, sns1_type),
  sns1_account = COALESCE(?, sns1_account),
  sns2_type = COALESCE(?, sns2_type),
  sns2_account = COALESCE(?, sns2_account),
  sns3_type = COALESCE(?, sns3_type),
  sns3_account = COALESCE(?, sns3_account),
  business_name = COALESCE(?, business_name),
  industry = COALESCE(?, industry),
  business_description = COALESCE(?, business_description),
  country = COALESCE(?, country),
  region = COALESCE(?, region),
  city = COALESCE(?, city),
  skills = COALESCE(?, skills),
  interests = COALESCE(?, interests),
  message = COALESCE(?, message),
  mission = COALESCE(?, mission),
  profile_image_url = COALESCE(?, profile_image_url)
WHERE id = ?
SQL);
    $stmt->execute([
        $body['name'] ?? null,
        $body['phone'] ?? null,
        $body['chatworkId'] ?? null,
        $body['sns1Type'] ?? null,
        $body['sns1Account'] ?? null,
        $body['sns2Type'] ?? null,
        $body['sns2Account'] ?? null,
        $body['sns3Type'] ?? null,
        $body['sns3Account'] ?? null,
        $body['businessName'] ?? null,
        $body['industry'] ?? null,
        $body['businessDescription'] ?? null,
        $body['country'] ?? null,
        $body['region'] ?? null,
        $body['city'] ?? null,
        $skills,
        $interests,
        $body['message'] ?? null,
        $body['mission'] ?? null,
        $body['profileImageUrl'] ?? null,
        $userId,
    ]);

    // 更新後のユーザー情報を返す
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    ob_end_clean();
    json_response(['success' => true, 'user' => $row ? row_to_user($row) : null]);
} catch (Throwable $e) {
    ob_end_clean();
    json_response(['error' => 'プロフィールの更新に失敗しました'], 500);
}
