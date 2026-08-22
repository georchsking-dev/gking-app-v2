$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http -ErrorAction Stop

$runtimeRoot = Join-Path $env:LOCALAPPDATA 'SuperGK'
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$launcherLog = Join-Path $runtimeRoot 'launcher.log'

function Write-LaunchLog {
  param([Parameter(Mandatory = $true)][string]$Message)
  Add-Content -LiteralPath $launcherLog -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff') | $Message"
}

function Test-LocalTcpPort {
  param(
    [Parameter(Mandatory = $true)][int]$Port,
    [int]$TimeoutMilliseconds = 1000
  )

  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $connection = $client.ConnectAsync('127.0.0.1', $Port)
    if (-not $connection.Wait($TimeoutMilliseconds)) { return $false }
    return $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Test-HttpReady {
  param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [int]$TimeoutMilliseconds = 2000
  )

  $handler = [System.Net.Http.HttpClientHandler]::new()
  $handler.UseProxy = $false
  $client = [System.Net.Http.HttpClient]::new($handler)
  $response = $null
  try {
    $client.Timeout = [TimeSpan]::FromMilliseconds($TimeoutMilliseconds)
    $response = $client.GetAsync($Uri).GetAwaiter().GetResult()
    return $response.IsSuccessStatusCode
  } catch {
    return $false
  } finally {
    if ($null -ne $response) { $response.Dispose() }
    $client.Dispose()
    $handler.Dispose()
  }
}

function Wait-HttpReady {
  param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [Parameter(Mandatory = $true)][int]$TimeoutSeconds
  )

  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  do {
    if (Test-HttpReady -Uri $Uri) { return $true }
    Start-Sleep -Milliseconds 500
  } while ([DateTime]::UtcNow -lt $deadline)
  return $false
}

Write-LaunchLog 'Inicio solicitado.'
$superGkRoot = Split-Path -Parent $PSScriptRoot
$georgieRoot = 'C:\Users\pcking\Documents\jarvis asistente\mi_asistente'
$python = Join-Path $georgieRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) { throw 'Georgie no está configurado. Ejecuta CONFIGURAR_GEORGIE.bat una vez.' }
if (-not (Test-Path -LiteralPath (Join-Path $superGkRoot 'node_modules'))) {
  Push-Location $superGkRoot
  try { npm install } finally { Pop-Location }
}
$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if ($ollama) {
  $env:OLLAMA_HOST = '127.0.0.1:11435'
  $env:OLLAMA_LLM_LIBRARY = 'cpu'; $env:OLLAMA_VULKAN = '0'
  $env:GGML_VK_VISIBLE_DEVICES = '-1'; $env:OLLAMA_NO_CLOUD = '1'
  if (-not (Test-LocalTcpPort -Port 11435)) {
    Write-LaunchLog 'Iniciando Ollama en el puerto 11435.'
    Start-Process -FilePath $ollama.Source -ArgumentList 'serve' -WindowStyle Hidden
  }
  if (-not (Wait-HttpReady -Uri 'http://127.0.0.1:11435/api/tags' -TimeoutSeconds 60)) {
    throw 'Ollama no respondió en el puerto 11435 después de 60 segundos.'
  }
  Write-LaunchLog 'Ollama listo.'
} else {
  throw 'No se encontró Ollama instalado en el equipo.'
}
$env:GEORGIE_OLLAMA_HOST = 'http://127.0.0.1:11435'
$georgieReady = Test-HttpReady -Uri 'http://127.0.0.1:8000/api/health'
if (-not $georgieReady) {
  if (Test-LocalTcpPort -Port 8000) {
    Write-LaunchLog 'El puerto 8000 ya escucha; esperando una instancia de Georgie que aún inicia.'
  } else {
    Write-LaunchLog 'Iniciando Georgie en el puerto 8000.'
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    Start-Process -FilePath $python -ArgumentList 'jarvis.py','--mode','hud' -WorkingDirectory $georgieRoot -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $runtimeRoot "georgie-$stamp.out.log") `
      -RedirectStandardError (Join-Path $runtimeRoot "georgie-$stamp.err.log")
  }
}
if (-not (Wait-HttpReady -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSeconds 120)) {
  throw 'Georgie no respondió en el puerto 8000 después de 2 minutos.'
}
Write-LaunchLog 'Georgie listo.'

$webReady = Test-HttpReady -Uri 'http://127.0.0.1:3000/api/georgie/health'
if (-not $webReady) {
  # A running Next.js server may briefly stop answering while it recompiles.
  # If the port is already listening, let the readiness loop below wait for it
  # instead of incorrectly reporting that another program owns the port.
  if (-not (Test-LocalTcpPort -Port 3000)) {
    $buildId = Join-Path $superGkRoot '.next\BUILD_ID'
    if (-not (Test-Path -LiteralPath $buildId)) {
      throw 'Falta la compilación de producción de Super GK. Ejecuta npm run build en el proyecto.'
    }
    Write-LaunchLog 'Iniciando Next.js de producción en el puerto 3000.'
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','start','--','-H','127.0.0.1','-p','3000' -WorkingDirectory $superGkRoot -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $runtimeRoot "next-$stamp.out.log") `
      -RedirectStandardError (Join-Path $runtimeRoot "next-$stamp.err.log")
  } else {
    Write-LaunchLog 'El puerto 3000 ya escucha; esperando una instancia de Next.js que está compilando.'
  }
}
if (-not (Wait-HttpReady -Uri 'http://127.0.0.1:3000/api/georgie/health' -TimeoutSeconds 180)) {
  throw 'Super GK no respondió después de 3 minutos. El servicio web del puerto 3000 no está listo.'
}
Write-LaunchLog 'Next.js y la API de Super GK están listos.'

$superGkUrl = 'http://127.0.0.1:3000/georgie'
$chromePaths = @(
  (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
  (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
)
$chrome = $chromePaths | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if ($chrome) {
  # Use a dedicated Chrome profile so translation tools and browser extensions
  # cannot rewrite React's DOM and crash the local Super GK interface.
  $chromeProfile = Join-Path $runtimeRoot 'ChromeProfile'
  New-Item -ItemType Directory -Path $chromeProfile -Force | Out-Null
  $chromeArguments = @(
    "--user-data-dir=$chromeProfile"
    '--no-first-run'
    '--no-default-browser-check'
    '--disable-extensions'
    '--disable-features=Translate,TranslateUI'
    '--lang=es-MX'
    "--app=$superGkUrl"
  )
  $existingSuperGkWindow = Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine -like "*--user-data-dir=$chromeProfile*" -and
      $_.CommandLine -like "*--app=$superGkUrl*"
    } |
    Select-Object -First 1
  if ($existingSuperGkWindow) {
    Write-LaunchLog 'La ventana de Super GK ya estaba abierta; no se creó un duplicado.'
  } else {
    Start-Process -FilePath $chrome -ArgumentList $chromeArguments
    Write-LaunchLog 'Ventana aislada de Chrome iniciada.'
  }
} else {
  Start-Process $superGkUrl
  Write-LaunchLog 'URL iniciada con el navegador predeterminado; Chrome no está instalado.'
}
