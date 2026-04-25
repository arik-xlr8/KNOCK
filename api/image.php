<?php

require_once __DIR__ . '/common.php';

try {
    $imageModel = env_value('POLLINATIONS_IMAGE_MODEL', 'flux');
    $subject = substr((string) ($_GET['subject'] ?? ''), 0, 500);
    $upstream = http_get_binary(pollinations_image_url($subject, $imageModel));

    header('Content-Type: ' . $upstream['contentType']);
    header('Cache-Control: no-store');
    echo $upstream['body'];
} catch (Exception $error) {
    send_json(['error' => $error->getMessage()], 500);
}
