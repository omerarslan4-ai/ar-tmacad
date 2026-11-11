# ArıtmaCAD DWG yardimcisini yeniden baslatir ve dener
$log = 'C:\AritmaCAD\yedek\dxf_test\yardimci_log.txt'
"basla $(Get-Date)" | Out-File $log -Encoding utf8
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*dwg-yardimci.ps1*' } | ForEach-Object { "durduruldu $($_.ProcessId)" | Out-File $log -Append; Stop-Process -Id $_.ProcessId -Force }
Start-Sleep -Milliseconds 800
Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File','C:\AritmaCAD\app\dwg-yardimci.ps1'
Start-Sleep -Seconds 3
try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:47321/ping' -TimeoutSec 20; "ping: $($r.Content)" | Out-File $log -Append } catch { "ping hata: $($_.Exception.Message)" | Out-File $log -Append }
try { $b = [System.IO.File]::ReadAllBytes('C:\AritmaCAD\yedek\dxf_test\disiplin\Test_Statik.dxf'); $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:47321/dxf2dwg?ver=ACAD2018' -Method Post -Body $b -ContentType 'application/octet-stream' -TimeoutSec 60; [System.IO.File]::WriteAllBytes('C:\AritmaCAD\yedek\dxf_test\oda\yardimci_test.dwg', $r.Content); "donusum: $($r.Content.Length) bayt" | Out-File $log -Append } catch { "donusum hata: $($_.Exception.Message)" | Out-File $log -Append }
"bitti $(Get-Date)" | Out-File $log -Append
