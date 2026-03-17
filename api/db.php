<?php
/**
 * MariaDB 接続と users テーブル初期化
 */
$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    throw new RuntimeException('config.php が見つかりません。config.sample.php を config.php にコピーして設定してください。');
}
$config = require $configFile;
$dsn = sprintf(
    'mysql:host=%s;dbname=%s;charset=%s',
    $config['DB_HOST'],
    $config['DB_NAME'],
    $config['DB_CHARSET'] ?? 'utf8mb4'
);
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];
$pdo = new PDO($dsn, $config['DB_USER'], $config['DB_PASSWORD'], $options);

$createTable = <<<'SQL'
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(64) NOT NULL DEFAULT '',
  chatwork_id VARCHAR(128) NOT NULL DEFAULT '',
  sns1_type VARCHAR(64) NOT NULL DEFAULT '',
  sns1_account VARCHAR(255) NOT NULL DEFAULT '',
  sns2_type VARCHAR(64) NOT NULL DEFAULT '',
  sns2_account VARCHAR(255) NOT NULL DEFAULT '',
  sns3_type VARCHAR(64) NOT NULL DEFAULT '',
  sns3_account VARCHAR(255) NOT NULL DEFAULT '',
  business_name VARCHAR(255) NOT NULL DEFAULT '',
  industry VARCHAR(128) NOT NULL DEFAULT '',
  business_description TEXT,
  country VARCHAR(128) NOT NULL DEFAULT '',
  region VARCHAR(128) NOT NULL DEFAULT '',
  city VARCHAR(128) NOT NULL DEFAULT '',
  skills JSON,
  interests JSON,
  message TEXT,
  mission TEXT,
  profile_image_url VARCHAR(512) NOT NULL DEFAULT '',
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  registered_at DATE NOT NULL,
  UNIQUE KEY uk_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SQL;
$pdo->exec($createTable);

$createResetTable = <<<'SQL'
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_token (token),
  KEY idx_email (email),
  KEY idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SQL;
$pdo->exec($createResetTable);

$createNotificationSettingsTable = <<<'SQL'
CREATE TABLE IF NOT EXISTS notification_settings (
  setting_key VARCHAR(128) NOT NULL PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SQL;
$pdo->exec($createNotificationSettingsTable);

$createFavoritesTable = <<<'SQL'
CREATE TABLE IF NOT EXISTS favorites (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  target_user_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_target (user_id, target_user_id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SQL;
$pdo->exec($createFavoritesTable);

$createReviewsTable = <<<'SQL'
CREATE TABLE IF NOT EXISTS reviews (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reviewer_id INT UNSIGNED NOT NULL,
  target_user_id INT UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_reviewer_target (reviewer_id, target_user_id),
  KEY idx_target (target_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SQL;
$pdo->exec($createReviewsTable);

// --- マイグレーション: 登録完了メールテンプレートを更新 ---
// 新テンプレートのキーワード「ようこそ」が件名に含まれていなければ未更新と判断し UPSERT する
$newWelcomeSubject = '[YCSマッチング] ようこそ！登録が完了しました';
$newWelcomeBody    = "{{name}} 様\n\nYCSマッチングプラットフォームへのご登録ありがとうございます！\nあなたの新しいビジネスパートナーとの出会いが、ここから始まります。\n\n━━━━━━━━━━━━━━━━━━━━━━\n ■ ログイン情報\n━━━━━━━━━━━━━━━━━━━━━━\nログインURL: {{login_url}}\nメールアドレス: {{email}}\n※ パスワードは登録時にご自身で設定されたものをご利用ください\n\n━━━━━━━━━━━━━━━━━━━━━━\n ■ まず最初にやってみましょう\n━━━━━━━━━━━━━━━━━━━━━━\n\n 1. プロフィールを充実させましょう\n    スキルや興味分野を追加すると、\n    あなたにぴったりのメンバーが見つかりやすくなります。\n\n 2. メンバーを検索してみましょう\n    地域・業種・スキルで絞り込んで、\n    気になるメンバーを見つけてください。\n\n 3. マッチングリクエストを送りましょう\n    気になるメンバーが見つかったら、\n    まずはリクエストを送ってみましょう！\n\n━━━━━━━━━━━━━━━━━━━━━━\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n素敵なビジネスマッチングをお楽しみください！\n\n{{signature}}";

try {
    $needsUpdate = false;
    $stmt = $pdo->prepare('SELECT setting_value FROM notification_settings WHERE setting_key = ?');
    $stmt->execute(['user_welcome_subject']);
    $current = $stmt->fetchColumn();
    // 行が存在しない(false)、または「ようこそ」を含まない旧テンプレートなら更新
    if ($current === false || mb_strpos($current, 'ようこそ') === false) {
        $needsUpdate = true;
    }
    if ($needsUpdate) {
        $upsert = $pdo->prepare(<<<'SQL'
INSERT INTO notification_settings (setting_key, setting_value, updated_at)
VALUES (?, ?, NOW())
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
SQL);
        $upsert->execute(['user_welcome_subject', $newWelcomeSubject]);
        $upsert->execute(['user_welcome_body', $newWelcomeBody]);
    }
} catch (Throwable $e) {
    // テーブル未作成・エラー時は無視（デフォルト値が使われる）
}
