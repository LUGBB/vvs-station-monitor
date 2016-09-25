<?php


$url = null;
if (!empty($_REQUEST['type'])) {

    switch ($_REQUEST['type']) {
        case 'departures':
            $url = 'https://efa-api.asw.io/api/v1/station/' . (int)$_REQUEST['station'] . '/departures/';
            break;
    }
}

if (!empty($url)) {
    $contextOptions = [
        'http' => [
            'header'=> "Content-type: application/json"
        ]
    ];

    $context = stream_context_create($contextOptions);


    header('Content-Type: application/json');
    $content = file_get_contents($url, false, $context);

    if (!empty($content)) {
        echo $content;
    } else {
        echo '[]';
    }
} else {
    header('HTTP/1.0 404 Not Found');
}

