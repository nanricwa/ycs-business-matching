<?php
/**
 * プロフィール画像アップロード
 * POST multipart/form-data { "image": <file> }
 * 認証不要（登録時にも使用するため）
 *
 * レスポンス: { "url": "/match/api/uploads/xxxx.webp" }
 */
ob_start();
require_once __DIR__ . '/helpers.php';

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

// アップロードディレクトリ
$uploadDir = __DIR__ . '/uploads';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// .htaccess でPHP実行を禁止（セキュリティ）
$htaccess = $uploadDir . '/.htaccess';
if (!is_file($htaccess)) {
    file_put_contents($htaccess, "php_flag engine off\nAddHandler default-handler .php .phtml\n<FilesMatch \"\\.(php|phtml|php3|php4|php5|phps)$\">\n  Deny from all\n</FilesMatch>\n");
}

// ファイルチェック
if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    ob_end_clean();
    json_response(['error' => '画像ファイルが必要です'], 400);
    exit;
}

$file = $_FILES['image'];
$maxSize = 5 * 1024 * 1024; // 5MB
if ($file['size'] > $maxSize) {
    ob_end_clean();
    json_response(['error' => '画像サイズは5MB以下にしてください'], 400);
    exit;
}

// MIME タイプ検証
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);
if (!in_array($mimeType, $allowedTypes, true)) {
    ob_end_clean();
    json_response(['error' => '許可されていないファイル形式です（JPEG, PNG, GIF, WebP のみ）'], 400);
    exit;
}

// 拡張子マッピング
$extMap = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
    'image/webp' => 'webp',
];
$ext = $extMap[$mimeType] ?? 'jpg';

// ユニークなファイル名を生成
$filename = bin2hex(random_bytes(16)) . '.' . $ext;
$destPath = $uploadDir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    ob_end_clean();
    json_response(['error' => 'ファイルの保存に失敗しました'], 500);
    exit;
}

// 公開URLを生成（相対パス）
$url = 'api/uploads/' . $filename;

ob_end_clean();
json_response(['url' => $url]);
