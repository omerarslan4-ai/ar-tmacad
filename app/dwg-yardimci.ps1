# AritmaCAD DWG yardimcisi
# ODA File Converter (ucretsiz) ile DWG <-> DXF donusturur. Yalnizca bu bilgisayardan (127.0.0.1) baglanti kabul eder.
$ErrorActionPreference = 'Stop'
$port = 47321

function Find-Oda {
  $roots = @($env:ProgramFiles, ${env:ProgramFiles(x86)}, (Join-Path $env:LOCALAPPDATA 'Programs')) | Where-Object { $_ -and (Test-Path $_) }
  # 1) ODA File Converter (ucretsiz kurulum): <Program Files>\ODA\ODAFileConverter x.y.z\
  foreach ($r in $roots) {
    $d = Join-Path $r 'ODA'
    if (Test-Path $d) {
      $exe = Get-ChildItem -Path $d -Recurse -Filter 'ODAFileConverter.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
      if ($exe) { return $exe.FullName }
    }
  }
  # 2) ODA deneme / gelistirici paketi (ODATrial, ODAToolkit): ...\ODAToolkit\exe\<platform>\ODAFileConverter.exe
  foreach ($r in $roots) {
    foreach ($n in @('ODATrial', 'ODAToolkit', 'ODA SDK')) {
      $d = Join-Path $r $n
      if (Test-Path $d) {
        $exe = Get-ChildItem -Path (Join-Path $d '*\exe\*\ODAFileConverter.exe'), (Join-Path $d 'exe\*\ODAFileConverter.exe') -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
        if ($exe) { return $exe.FullName }
      }
    }
  }
  return $null
}

function Send-Resp($stream, [int]$code, [string]$ctype, [byte[]]$data) {
  $names = @{ 200 = 'OK'; 204 = 'No Content'; 404 = 'Not Found'; 500 = 'Internal Server Error' }
  if ($null -eq $data) { $data = New-Object byte[] 0 }
  $h = "HTTP/1.1 $code $($names[$code])`r`n" +
       "Access-Control-Allow-Origin: *`r`n" +
       "Access-Control-Allow-Methods: GET, POST, OPTIONS`r`n" +
       "Access-Control-Allow-Headers: *`r`n" +
       "Access-Control-Allow-Private-Network: true`r`n" +
       "Content-Type: $ctype`r`n" +
       "Content-Length: $($data.Length)`r`n" +
       "Connection: close`r`n`r`n"
  $hb = [System.Text.Encoding]::ASCII.GetBytes($h)
  $stream.Write($hb, 0, $hb.Length)
  if ($data.Length -gt 0) { $stream.Write($data, 0, $data.Length) }
  $stream.Flush()
}

function Send-Text($stream, [int]$code, [string]$text) {
  Send-Resp $stream $code 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes($text))
}

function Convert-File([byte[]]$body, [string]$mode, [string]$ver) {
  $tmp = Join-Path $env:TEMP ('aritmacad_' + [guid]::NewGuid().ToString('N'))
  $in = Join-Path $tmp 'in'; $out = Join-Path $tmp 'out'
  New-Item -ItemType Directory -Path $in -Force | Out-Null
  New-Item -ItemType Directory -Path $out -Force | Out-Null
  try {
    if ($mode -eq 'dwg2dxf') { $src = 'girdi.dwg'; $fmt = 'DXF'; $ver = 'ACAD2018'; $filt = '*.DWG'; $res = 'girdi.dxf' }
    else { $src = 'girdi.dxf'; $fmt = 'DWG'; $filt = '*.DXF'; $res = 'girdi.dwg' }
    [System.IO.File]::WriteAllBytes((Join-Path $in $src), $body)
    $argList = @("`"$in`"", "`"$out`"", $ver, $fmt, '0', '1', $filt)
    $p = Start-Process -FilePath $script:oda -ArgumentList $argList -Wait -PassThru -WindowStyle Hidden
    $rp = Join-Path $out $res
    if (Test-Path $rp) { return ,([System.IO.File]::ReadAllBytes($rp)) }
    $err = Get-ChildItem -Path $out -Filter '*.err' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($err) { throw ('ODA hata: ' + (Get-Content $err.FullName -Raw)) }
    throw 'ODA File Converter cikti uretmedi.'
  } finally {
    Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Handle-Client($client) {
  $stream = $client.GetStream()
  $stream.ReadTimeout = 60000
  $hdr = New-Object System.Collections.Generic.List[byte]
  while ($true) {
    $b = $stream.ReadByte()
    if ($b -lt 0) { return }
    $hdr.Add([byte]$b)
    $n = $hdr.Count
    if ($n -ge 4 -and $hdr[$n - 4] -eq 13 -and $hdr[$n - 3] -eq 10 -and $hdr[$n - 2] -eq 13 -and $hdr[$n - 1] -eq 10) { break }
    if ($n -gt 65536) { return }
  }
  $head = [System.Text.Encoding]::ASCII.GetString($hdr.ToArray())
  $lines = $head -split "`r`n"
  $first = $lines[0] -split ' '
  $method = $first[0]; $path = $first[1]
  $len = 0
  foreach ($l in $lines) { if ($l -match '^(?i)Content-Length:\s*(\d+)') { $len = [int]$Matches[1] } }
  $body = New-Object byte[] $len
  $read = 0
  while ($read -lt $len) { $r = $stream.Read($body, $read, $len - $read); if ($r -le 0) { break }; $read += $r }

  if ($method -eq 'OPTIONS') { Send-Resp $stream 204 'text/plain' $null; return }
  if ($path -like '/ping*') {
    if (-not $script:oda) { $script:oda = Find-Oda }
    $j = '{"ok":true,"oda":' + $(if ($script:oda) { 'true' } else { 'false' }) + '}'
    Send-Resp $stream 200 'application/json' ([System.Text.Encoding]::ASCII.GetBytes($j)); return
  }
  if ($method -eq 'POST' -and ($path -like '/dwg2dxf*' -or $path -like '/dxf2dwg*')) {
    if (-not $script:oda) { $script:oda = Find-Oda }
    if (-not $script:oda) { Send-Text $stream 500 'ODA File Converter bulunamadi'; return }
    $ver = 'ACAD2018'
    if ($path -match 'ver=(ACAD\d+)') { $ver = $Matches[1] }
    $mode = if ($path -like '/dwg2dxf*') { 'dwg2dxf' } else { 'dxf2dwg' }
    try { $data = Convert-File $body $mode $ver; Send-Resp $stream 200 'application/octet-stream' $data }
    catch { Send-Text $stream 500 ([string]$_.Exception.Message) }
    return
  }
  Send-Text $stream 404 'bulunamadi'
}

$script:oda = Find-Oda
try {
  $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
  $listener.Start()
} catch { exit 0 }   # zaten calisiyor

while ($true) {
  $client = $listener.AcceptTcpClient()
  try { Handle-Client $client } catch { } finally { $client.Close() }
}
