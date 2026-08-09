$ErrorActionPreference = 'Continue'

$base = 'http://54.39.107.85:7080/dcm/version/repo/website/pkg-website-v9.10.1.2210121414/'
$root = 'D:\projects\vimtag-recreate2\mipcm-site\pkg-website'

$queue = New-Object System.Collections.Generic.List[string]
$done = New-Object System.Collections.Generic.HashSet[string]
$queue.Add('index.html')

function Get-RelativeUrl {
    param([string]$href)
    if (-not $href) { return $null }
    if ($href -match '^[a-z]+:' -or $href -match '^//' -or $href -match '^#') { return $null }
    $href = $href -replace '^\./',''
    $href = $href -split '[?#]' | Select-Object -First 1
    if (-not $href) { return $null }
    return $href
}

function Scan-TextForAssets {
    param([string]$content, [string]$baseDir)
    $urls = New-Object System.Collections.Generic.List[string]

    $patterns = @(
        '(?:src|href)=["'']([^"'']+)["'']',
        '(?:src|href)=([^\s>]+)',
        'url\(["'']?([^"'')]+)["'']?\)',
        'import\(["'']([^"'']+)["'']\)'
    )
    foreach ($p in $patterns) {
        foreach ($m in [regex]::Matches($content, $p)) {
            $g = if ($m.Groups.Count -gt 1) { $m.Groups[1].Value } else { $m.Groups[0].Value }
            if ($g -match '^[a-z]+:' -or $g -match '^//' -or $g -match '^data:') { continue }
            $u = Get-RelativeUrl $g
            if ($u) { $urls.Add($u) }
        }
    }

    # webpack chunk map: "chunkId":"js/hash.js" inside JS
    foreach ($m in [regex]::Matches($content, '"((?:js|css)/[A-Za-z0-9._-]+\.(?:js|css))"')) {
        $urls.Add($m.Groups[1].Value)
    }
    foreach ($m in [regex]::Matches($content, "'((?:js|css)/[A-Za-z0-9._-]+\.(?:js|css))'")) {
        $urls.Add($m.Groups[1].Value)
    }
    return $urls
}

function Download-File {
    param([string]$rel)
    $clean = $rel -replace '^/',''
    if ($done.Contains($clean)) { return }
    $done.Add($clean) | Out-Null

    $target = Join-Path $root ($clean -replace '/', '\')
    $dir = Split-Path -Parent $target
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $uri = $base + $clean
    try {
        Invoke-WebRequest -Uri $uri -OutFile $target -UseBasicParsing -TimeoutSec 60
        Write-Host "OK  $clean"
    } catch {
        Write-Host "ERR $clean  $($_.Exception.Message)"
        return
    }

    $ext = [System.IO.Path]::GetExtension($clean).ToLowerInvariant()
    if ($ext -in '.html','.js','.css','.htm','.json','.map') {
        try {
            $content = [System.IO.File]::ReadAllText($target)
            foreach ($u in (Scan-TextForAssets $content $clean)) {
                $queue.Add($u) | Out-Null
            }
        } catch {}
    }
}

while ($queue.Count -gt 0) {
    $item = $queue[0]
    $queue.RemoveAt(0)
    Download-File $item
}

Write-Host "DONE. total files: $($done.Count)"
