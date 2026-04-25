<?php

require_once __DIR__ . '/common.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        send_json(['error' => 'Method not allowed.'], 405);
        exit;
    }

    $textModel = env_value('POLLINATIONS_TEXT_MODEL', 'openai');
    $imageModel = env_value('POLLINATIONS_IMAGE_MODEL', 'flux');
    $body = json_decode(file_get_contents('php://input') ?: '{}', true);

    if (!is_array($body)) {
        throw new Exception('Invalid JSON body.');
    }

    $prompt = substr((string) ($body['prompt'] ?? ''), 0, 500);
    $wantsImage = !empty($body['generateImage']);
    $wantsDylanContext = !empty($body['dylanContext']);

    $source = 'Pollinations LLM (' . $textModel . ')';
    try {
        $analysis = analyze_prompt($prompt, $textModel);
    } catch (Exception $error) {
        $analysis = local_analysis($prompt);
        $source = 'local subject fallback - LLM failed: ' . $error->getMessage();
    }

    $notes = new stdClass();
    if ($wantsDylanContext) {
        try {
            $notes = build_dylan_notes($prompt, $analysis, $textModel);
        } catch (Exception $error) {
            $notes = local_dylan_notes($analysis);
        }
    }

    $result = [
        'source' => $source,
        'plan' => [
            'title' => $analysis['title'],
            'mood' => $analysis['mood'],
            'interpretation' => $analysis['interpretation'],
            'subject' => $analysis['subject'],
            'notes' => $notes,
            'palette' => [
                'backgroundA' => '#111111',
                'backgroundB' => '#252525',
                'accent' => '#d0a342'
            ],
            'tiles' => []
        ]
    ];

    if ($wantsImage) {
        $result['imageUrl'] = '/api/image?subject=' . rawurlencode($analysis['subject']);
        $result['source'] .= ' + Pollinations image (' . $imageModel . ')';
    }

    send_json($result);
} catch (Exception $error) {
    send_json(['error' => $error->getMessage()], 500);
}
