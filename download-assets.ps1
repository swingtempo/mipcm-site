$ErrorActionPreference = 'Continue'

$base = 'http://54.39.107.85:7080/dcm/version/repo/website/pkg-website-v9.10.1.2210121414/'
$root = 'D:\projects\vimtag-recreate2\mipcm-site\pkg-website'

$assets = New-Object System.Collections.Generic.HashSet[string]
$queue = New-Object System.Collections.Generic.List[string]

$pattern = '(?:css|img|imgs|static|theme|fonts|font|js|media)/[A-Za-z0-9_./-]+\.(?:css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|mp3|json)'

function ScanDir {
    param([string]$dir)
    Get-ChildItem -Path $dir -File -Recurse | ForEach-Object {
        if ($_.Extension -in '.js','.css','.html','.json') {
            $content = [System.IO.File]::ReadAllText($_.FullName)
            foreach ($m in [regex]::Matches($content, $pattern)) {
                $v = $m.Value
                $null = $assets.Add($v)
                $queue.Add($v)
            }
        }
    }
}

function Download {
    param([string]$rel)
    $clean = $rel -replace '^\./','' -replace '^/',''
    $target = Join-Path $root ($clean -replace '/','\')
    $dir = Split-Path -Parent $target
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    if (Test-Path -LiteralPath $target) { return }
    try {
        Invoke-WebRequest -Uri ($base + $clean) -OutFile $target -UseBasicParsing -TimeoutSec 60
        Write-Host "OK  $clean"
    } catch {
        Write-Host "ERR $clean"
        return
    }
    $ext = [System.IO.Path]::GetExtension($clean).ToLowerInvariant()
    if ($ext -eq '.css') {
        try {
            $content = [System.IO.File]::ReadAllText($target)
            foreach ($m in [regex]::Matches($content, 'url\(["'']?([^"'')]+)["'']?\)')) {
                $u = $m.Groups[1].Value -replace '^\./',''
                if ($u -match '^[a-z]+:' -or $u -match '^//' -or $u -match '^data:' -or $u -match '^#') { continue }
                $u = ($u -split '[?#]')[0]
                if ($u) { $queue.Add($u) }
            }
        } catch {}
    }
}

ScanDir (Join-Path $root 'js')
ScanDir (Join-Path $root '.')

$i = 0
while ($i -lt $queue.Count) {
    Download $queue[$i]
    $i++
}

Write-Host "DONE. unique asset paths: $($assets.Count)"
