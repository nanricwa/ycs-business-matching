<?php
/**
 * メール通知設定の取得・更新（管理者のみ）
 * GET  → 現在の設定を返す
 * POST → 設定を保存
 *
 * 設定キー:
 *   admin_notify_enabled        : 管理者通知メール ON/OFF ("1"/"0")
 *   admin_notify_subject        : 管理者通知メール 件名
 *   admin_notify_body           : 管理者通知メール 本文テンプレート
 *   user_welcome_enabled        : 登録完了メール ON/OFF ("1"/"0")
 *   user_welcome_subject        : 登録完了メール 件名
 *   user_welcome_body           : 登録完了メール 本文テンプレート
 *   password_reset_subject      : パスワードリセットメール 件名
 *   password_reset_body         : パスワードリセットメール 本文テンプレート
 *
 * テンプレート変数:
 *   {{name}}          ユーザー名
 *   {{email}}         メールアドレス
 *   {{date}}          登録日時 / リクエスト日時
 *   {{login_url}}     ログインURL
 *   {{reset_link}}    パスワードリセットリンク
 *   {{signature}}     署名（--\nYCS Business Matching）
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

// 管理者認証
$auth = get_authorization_header();
$token = preg_replace('/^Bearer\s+/i', '', $auth);
$payload = $token !== '' ? jwt_decode($token) : null;
if (!$payload || ($payload['role'] ?? 'user') !== 'admin') {
    ob_end_clean();
    json_response(['error' => 'Unauthorized', 'message' => 'Admin only'], 401);
    exit;
}

// デフォルト値
$defaults = [
    'admin_notify_enabled'   => '1',
    'admin_notify_subject'   => '[YCSマッチング] 新規登録がありました',
    'admin_notify_body'      => "新規登録がありました。\n\n名前: {{name}}\nメールアドレス: {{email}}\n登録日時: {{date}}\n\n{{signature}}",
    'user_welcome_enabled'   => '1',
    'user_welcome_subject'   => '[YCSマッチング] 登録が完了しました',
    'user_welcome_body'      => "{{name}} 様\n\nYCSマッチングプラットフォームへの登録が完了しました。\n\nこのメールアドレスと登録時にお決めいただいたパスワードで、以下のURLからログインできます。\n\nログインURL: {{login_url}}\n\n{{signature}}",
    'password_reset_subject'  => '[YCSマッチング] パスワード再設定のご案内',
    'password_reset_body'     => "パスワード再設定のリクエストを受け付けました。\n\n以下のリンクをクリックし、新しいパスワードを設定してください。\n（有効期限: 1時間）\n\n{{reset_link}}\n\nこのメールに心当たりがない場合は、無視してください。\n\n{{signature}}",
];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // 全設定を取得してデフォルトとマージ
    try {
        $stmt = $pdo->query('SELECT setting_key, setting_value FROM notification_settings');
        $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        $settings = array_merge($defaults, $rows ?: []);
    } catch (Throwable $e) {
        // テーブルが未作成・クエリ失敗時はデフォルト値を返す
        $settings = $defaults;
    }
    ob_end_clean();
    json_response(['settings' => $settings]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $settings = $body['settings'] ?? [];

    if (!is_array($settings) || empty($settings)) {
        ob_end_clean();
        json_response(['error' => '設定データが必要です'], 400);
        exit;
    }

    // 許可されたキーのみ保存
    $allowedKeys = array_keys($defaults);
    $saved = 0;

    try {
        $stmt = $pdo->prepare(<<<'SQL'
INSERT INTO notification_settings (setting_key, setting_value, updated_at)
VALUES (?, ?, NOW())
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
SQL);

        foreach ($settings as $key => $value) {
            if (in_array($key, $allowedKeys, true)) {
                $stmt->execute([$key, (string) $value]);
                $saved++;
            }
        }
    } catch (Throwable $e) {
        ob_end_clean();
        json_response(['error' => '設定の保存に失敗しました: ' . $e->getMessage()], 500);
        exit;
    }

    ob_end_clean();
    json_response(['success' => true, 'saved' => $saved]);
    exit;
}

ob_end_clean();
json_response(['error' => 'Method not allowed'], 405);
