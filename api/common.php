<?php

function load_env_file($path) {
    if (!file_exists($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (preg_match('/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/', $line, $matches)) {
            $value = trim($matches[2], "\"'");
            if (getenv($matches[1]) === false) {
                putenv($matches[1] . '=' . $value);
            }
        }
    }
}

function env_value($key, $fallback) {
    $value = getenv($key);
    return $value === false || $value === '' ? $fallback : $value;
}

function http_get_text($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 45,
            CURLOPT_USERAGENT => 'KNOCK-256-Tile-Mosaic/1.0'
        ]);
        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($body === false || $status >= 400) {
            throw new Exception($error ?: 'HTTP ' . $status . ': ' . substr((string) $body, 0, 160));
        }

        return $body;
    }

    $body = file_get_contents($url);
    if ($body === false) {
        throw new Exception('Remote request failed.');
    }
    return $body;
}

function http_get_binary($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_HEADER => true,
            CURLOPT_USERAGENT => 'KNOCK-256-Tile-Mosaic/1.0'
        ]);
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/jpeg';
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false || $status >= 400) {
            throw new Exception($error ?: 'HTTP ' . $status);
        }

        return [
            'body' => substr($response, $headerSize),
            'contentType' => $contentType
        ];
    }

    $body = file_get_contents($url);
    if ($body === false) {
        throw new Exception('Remote image request failed.');
    }
    return [
        'body' => $body,
        'contentType' => 'image/jpeg'
    ];
}

function clean_json_text($text) {
    $text = trim($text);
    $text = preg_replace('/^```json\s*/i', '', $text);
    $text = preg_replace('/^```\s*/', '', $text);
    $text = preg_replace('/\s*```$/', '', $text);
    return trim($text);
}

function common_subject($prompt) {
    $text = strtolower($prompt);
    $pairs = [
        ['/\\bbear\\b/', 'bear'],
        ['/\\bbird\\b/', 'bird'],
        ['/\\bdoor\\b/', 'door'],
        ['/\\bbadge\\b/', 'badge'],
        ['/\\bskull\\b/', 'skull'],
        ['/\\bmama\\b|\\bmother\\b/', 'mother'],
        ['/\\bfarewell\\b/', 'farewell symbol'],
        ['/\\bflower\\b/', 'flower'],
        ['/\\bcar\\b/', 'car'],
        ['/\\bhouse\\b/', 'house']
    ];

    foreach ($pairs as $pair) {
        if (preg_match($pair[0], $text)) {
            return $pair[1];
        }
    }

    return $prompt;
}

function local_analysis($prompt) {
    $subject = common_subject($prompt);
    return [
        'subject' => $subject,
        'title' => $subject,
        'mood' => 'generated',
        'interpretation' => '"' . $prompt . '" was interpreted as "' . $subject . '". The 256 CSS tiles sample the generated reference image and imitate its colors.'
    ];
}

function analyze_prompt($prompt, $model) {
    $common = common_subject($prompt);
    if ($common !== $prompt) {
        return [
            'subject' => $common,
            'title' => $common,
            'mood' => 'generated',
            'interpretation' => '"' . $prompt . '" was recognized as "' . $common . '", so the image and 256 CSS tiles follow the requested subject.'
        ];
    }

    $instruction = implode("\n", [
        "Extract the visual subject from the user's prompt.",
        "Translate it to concise English for image generation.",
        "Do not add extra people, story, history, artist names, or unrelated context.",
        "Return only raw JSON with keys: subject, title, mood, interpretation.",
        "User prompt: " . $prompt
    ]);
    $url = 'https://text.pollinations.ai/' . rawurlencode($instruction) . '?model=' . rawurlencode($model);
    $parsed = json_decode(clean_json_text(http_get_text($url)), true);

    if (!is_array($parsed)) {
        throw new Exception('LLM returned invalid JSON.');
    }

    return [
        'subject' => substr((string) ($parsed['subject'] ?? $common), 0, 120),
        'title' => substr((string) ($parsed['title'] ?? $parsed['subject'] ?? $prompt), 0, 80),
        'mood' => substr((string) ($parsed['mood'] ?? 'generated'), 0, 40),
        'interpretation' => substr((string) ($parsed['interpretation'] ?? '"' . $prompt . '" was converted into a visual subject for a 256-tile mosaic.'), 0, 500)
    ];
}

function build_dylan_notes($prompt, $analysis, $model) {
    $instruction = implode("\n", [
        "Write concise artwork notes for a creative AI project based on Bob Dylan's Knockin' on Heaven's Door.",
        "Do not alter the visual subject. The image generation must remain about the user's subject.",
        "Connect the subject symbolically to: threshold, badge/burden, farewell/mortality, and 1973 historical context including Vietnam-era counterculture and the western film context.",
        "Return only raw JSON with keys: subject, threshold, badge, farewell, historical.",
        "User prompt: " . $prompt,
        "Visual subject: " . $analysis['subject']
    ]);
    $url = 'https://text.pollinations.ai/' . rawurlencode($instruction) . '?model=' . rawurlencode($model);
    $parsed = json_decode(clean_json_text(http_get_text($url)), true);

    if (!is_array($parsed)) {
        throw new Exception('Dylan notes returned invalid JSON.');
    }

    return [
        'subject' => substr((string) ($parsed['subject'] ?? 'The visual subject remains ' . $analysis['subject'] . '.'), 0, 260),
        'threshold' => substr((string) ($parsed['threshold'] ?? ''), 0, 260),
        'badge' => substr((string) ($parsed['badge'] ?? ''), 0, 260),
        'farewell' => substr((string) ($parsed['farewell'] ?? ''), 0, 260),
        'historical' => substr((string) ($parsed['historical'] ?? ''), 0, 320)
    ];
}

function local_dylan_notes($analysis) {
    return [
        'subject' => 'The visual subject remains "' . $analysis['subject'] . '" so the free prompt is respected.',
        'threshold' => 'The subject is treated as something encountered at a symbolic door: an image at the moment before crossing.',
        'badge' => 'The badge idea appears as burden: the object can stand for something carried, named, or finally put down.',
        'farewell' => 'The mosaic frames the subject as a farewell image, echoing transition, mortality, and release.',
        'historical' => 'The notes connect the work to 1973, the Vietnam-era anti-war atmosphere, and the western film context without forcing those themes into the generated image.'
    ];
}

function hash_subject($value) {
    $hash = 0;
    for ($i = 0; $i < strlen($value); $i++) {
        $hash = (($hash * 31) + ord($value[$i])) & 0xffffffff;
    }
    return $hash;
}

function pollinations_image_url($subject, $model) {
    $imagePrompt = implode(' ', [
        'MAIN SUBJECT: ' . $subject . '.',
        'Create only this subject as a centered, recognizable pixel-art icon.',
        'Simple plain background. No text. No extra objects. No extra people unless the subject is a person.',
        'High contrast silhouette, clean edges, square composition, 16-bit pixel art.'
    ]);

    $params = http_build_query([
        'width' => '1024',
        'height' => '1024',
        'nologo' => 'true',
        'model' => $model,
        'seed' => (string) (abs(hash_subject($subject)) % 100000)
    ]);

    return 'https://image.pollinations.ai/prompt/' . rawurlencode($imagePrompt) . '?' . $params;
}

function send_json($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
}

load_env_file(dirname(__DIR__) . '/.env');
