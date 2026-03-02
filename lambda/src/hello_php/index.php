<?php

require __DIR__ . '/vendor/autoload.php';

/**
 * GET /hello_php?name=xxx
 * Response: { "message": "Hello, {name} from PHP!" }
 */
return function (array $event): array {
    $name = $event['queryStringParameters']['name'] ?? 'World';

    return [
        'statusCode' => 200,
        'headers' => ['Content-Type' => 'application/json'],
        'body' => json_encode(['message' => "Hello, {$name} from PHP!"]),
    ];
};
