<?php
/**
 * 共通: CORS ヘッダーと JSON レスポンス、メール送信
 */
function smtp_send(string $host, int $port, string $user, string $pass, string $from, string $to, string $subject, string $body_plain): bool {
    $errno = 0;
    $errstr = '';
    $sock = @stream_socket_client(
        $host . ':' . $port,
        $errno,
        $errstr,
        15,
        STREAM_CLIENT_CONNECT,
        stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]])
    );
    if (!$sock) {
        return false;
    }
    $read = function () use ($sock) {
        $line = @fgets($sock, 512);
        return $line !== false ? trim($line) : '';
    };
    $send = function ($cmd) use ($sock) {
        @fwrite($sock, $cmd . "\r\n");
    };
    if ($read() === '') {
        fclose($sock);
        return false;
    }
    $send('EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
    while ($line = $read()) {
        if (strpos($line, ' ') !== false) {
            $code = (int) substr($line, 0, 3);
            if ($code !== 250) {
                break;
            }
        }
        if (strpos($line, '250 ') === 0) {
            break;
        }
    }
    if ($port === 587) {
        $send('STARTTLS');
        if ($read() !== '220 Ready to start TLS') {
            fclose($sock);
            return false;
        }
        if (!@stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($sock);
            return false;
        }
        $send('EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
        while ($line = $read()) {
            if (strpos($line, '250 ') === 0) {
                break;
            }
        }
    }
    $send('AUTH LOGIN');
    $read();  // 334 VXNlcm5hbWU6
    $send(base64_encode($user));
    $read();  // 334 UGFzc3dvcmQ6
    $send(base64_encode($pass));
    if (strpos($read(), '235') !== 0) {
        fclose($sock);
        return false;
    }
    $send('MAIL FROM:<' . $from . '>');
    $read();
    $send('RCPT TO:<' . $to . '>');
    $read();
    $send('DATA');
    $read();
    $headers = "Subject: " . $subject . "\r\nFrom: " . $from . "\r\nTo: " . $to . "\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n";
    $send($headers . "\r\n" . $body_plain);
    $send('.');
    $read();
    $send('QUIT');
    fclose($sock);
    return true;
}

function send_mail(string $to, string $subject, string $body_plain, string $from_address = ''): bool {
    $configFile = __DIR__ . '/config.php';
    if (is_file($configFile)) {
        $config = require $configFile;
        $host = trim((string) ($config['SMTP_HOST'] ?? ''));
        $port = (int) ($config['SMTP_PORT'] ?? 587);
        $user = trim((string) ($config['SMTP_USER'] ?? ''));
        $pass = (string) ($config['SMTP_PASSWORD'] ?? '');
        $from = trim((string) ($config['MAIL_FROM'] ?? $user));
        if ($host !== '' && $user !== '' && $pass !== '' && $from !== '') {
            return smtp_send($host, $port, $user, $pass, $from, $to, $subject, $body_plain);
        }
    }
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];
    if ($from_address !== '') {
        $headers[] = 'From: ' . $from_address;
    }
    return @mail($to, $subject, $body_plain, implode("\r\n", $headers));
}

/**
 * Authorization ヘッダーを取得する（Apache CGI/FastCGI 環境対応）
 */
function get_authorization_header(): string {
    // 標準
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        return $_SERVER['HTTP_AUTHORIZATION'];
    }
    // Apache mod_rewrite の SetEnvIf / RewriteRule で渡した場合
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    // apache_request_headers() が使える場合
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            return $headers['Authorization'];
        }
        // キーが小文字になる場合
        if (isset($headers['authorization'])) {
            return $headers['authorization'];
        }
    }
    // getallheaders() のフォールバック
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (strtolower($key) === 'authorization') {
                return $value;
            }
        }
    }
    return '';
}

function json_headers(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

function json_response(array $data, int $status = 200): void {
    json_headers();
    http_response_code($status);
    echo json_encode($data);
}

/**
 * メール通知テンプレートを DB から取得する。
 * 未設定のキーにはデフォルト値を返す。
 */
function get_notification_settings(PDO $pdo): array {
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
    try {
        $stmt = $pdo->query('SELECT setting_key, setting_value FROM notification_settings');
        $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        return array_merge($defaults, $rows ?: []);
    } catch (Throwable $e) {
        // テーブルが未作成の場合はデフォルト値を返す
        return $defaults;
    }
}

/**
 * テンプレート変数を置換する
 */
function render_template(string $template, array $vars): string {
    foreach ($vars as $key => $value) {
        $template = str_replace('{{' . $key . '}}', (string) $value, $template);
    }
    return $template;
}

function row_to_user(array $row): array {
    $skills = $row['skills'] ?? '[]';
    $interests = $row['interests'] ?? '[]';
    if (is_string($skills)) $skills = json_decode($skills, true) ?: [];
    if (is_string($interests)) $interests = json_decode($interests, true) ?: [];
    $region = $row['region'] ?? '';
    $city = $row['city'] ?? '';
    $location = $region . ($region && $city ? '・' : '') . $city;
    return [
        'id' => (int) $row['id'],
        'email' => $row['email'] ?? '',
        'name' => $row['name'] ?? '',
        'phone' => $row['phone'] ?? '',
        'chatworkId' => $row['chatwork_id'] ?? '',
        'sns1Type' => $row['sns1_type'] ?? '',
        'sns1Account' => $row['sns1_account'] ?? '',
        'sns2Type' => $row['sns2_type'] ?? '',
        'sns2Account' => $row['sns2_account'] ?? '',
        'sns3Type' => $row['sns3_type'] ?? '',
        'sns3Account' => $row['sns3_account'] ?? '',
        'businessName' => $row['business_name'] ?? '',
        'industry' => $row['industry'] ?? '',
        'businessDescription' => $row['business_description'] ?? '',
        'business' => $row['business_description'] ?: ($row['business_name'] ?? ''),
        'country' => $row['country'] ?? '',
        'region' => $region,
        'city' => $city,
        'location' => $location,
        'skills' => $skills,
        'interests' => $interests,
        'message' => $row['message'] ?? '',
        'mission' => $row['mission'] ?? '',
        'profileImageUrl' => $row['profile_image_url'] ?? '',
        'profileImage' => !empty($row['profile_image_url']) ? $row['profile_image_url'] : null,
        'role' => $row['role'] ?? 'user',
        'registeredAt' => $row['registered_at'] ?? '',
    ];
}
