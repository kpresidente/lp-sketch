[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$CertificatePath
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$signingDirectory = Join-Path $repositoryRoot '.local-signing'
$privateKeyPath = Join-Path $signingDirectory 'distribution-private-key.pem'
$certificatePemPath = Join-Path $signingDirectory 'distribution-certificate.pem'
$p12Path = Join-Path $signingDirectory 'distribution.p12'
$certificateFile = (Resolve-Path -LiteralPath $CertificatePath).Path
$opensslCommand = Get-Command openssl -ErrorAction SilentlyContinue
$opensslPath = if ($opensslCommand) { $opensslCommand.Source } else { Join-Path $env:ProgramFiles 'Git/usr/bin/openssl.exe' }
if (-not (Test-Path -LiteralPath $privateKeyPath)) { throw 'Create the signing request first; its private key is required.' }
if (-not (Test-Path -LiteralPath $opensslPath)) { throw 'OpenSSL was not found. Install Git for Windows.' }
if (Test-Path -LiteralPath $p12Path) { throw "A P12 already exists at $p12Path. Preserve it before creating a replacement." }

& $opensslPath x509 -inform DER -in $certificateFile -out $certificatePemPath
if ($LASTEXITCODE -ne 0) { throw 'Apple certificate could not be read as a DER-encoded .cer file.' }

Write-Host 'Choose a strong export password and save it in your password manager. GitHub will need the same password.'
# Apple's Security importer requires the traditional PKCS12 encoding. The
# private key is still password-encrypted; these options ensure interoperability.
$passwordArguments = @()
if ($env:LP_SKETCH_P12_PASSWORD) { $passwordArguments = @('-passout', 'env:LP_SKETCH_P12_PASSWORD') }
& $opensslPath pkcs12 -export -inkey $privateKeyPath -in $certificatePemPath -out $p12Path -name 'LP Sketch Distribution' -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES -macalg sha1 @passwordArguments
if ($LASTEXITCODE -ne 0) { throw 'P12 export failed. Verify that the certificate was issued from this signing request.' }
Write-Host "Created $p12Path. Upload its base64 representation to the GitHub environment secret described in docs/TESTFLIGHT.md."
