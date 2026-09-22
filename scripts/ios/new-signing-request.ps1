[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$signingDirectory = Join-Path $repositoryRoot '.local-signing'
$opensslCommand = Get-Command openssl -ErrorAction SilentlyContinue
$opensslPath = if ($opensslCommand) { $opensslCommand.Source } else { Join-Path $env:ProgramFiles 'Git/usr/bin/openssl.exe' }
if (-not (Test-Path -LiteralPath $opensslPath)) { throw 'Install Git for Windows (including OpenSSL), then run this script again.' }

$privateKeyPath = Join-Path $signingDirectory 'distribution-private-key.pem'
$requestPath = Join-Path $signingDirectory 'LP-Sketch-Distribution.certSigningRequest'
if ((Test-Path -LiteralPath $privateKeyPath) -or (Test-Path -LiteralPath $requestPath)) {
    throw "Signing material already exists in $signingDirectory. Reuse the existing request; this script will not replace its private key."
}

New-Item -ItemType Directory -Path $signingDirectory -Force | Out-Null
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$acl = Get-Acl -LiteralPath $signingDirectory
$acl.SetAccessRuleProtection($true, $false)
$rule = [Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$acl.SetAccessRule($rule)
Set-Acl -LiteralPath $signingDirectory -AclObject $acl

& $opensslPath genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out $privateKeyPath 2>$null
if ($LASTEXITCODE -ne 0) { throw 'OpenSSL could not create the private key.' }
& $opensslPath req -new -key $privateKeyPath -out $requestPath -subj '/CN=LP Sketch Distribution'
if ($LASTEXITCODE -ne 0) { throw 'OpenSSL could not create the certificate signing request.' }

Write-Host "Upload this request to Apple: $requestPath"
Write-Host 'The matching private key stays in .local-signing. Keep it private and retain it for the certificate export step.'
