param([string]$OutDir = '')
if (-not $OutDir) { $OutDir = [Environment]::GetFolderPath('Desktop') }

Add-Type -AssemblyName System.Drawing

$size = 1024
$bg   = [System.Drawing.Color]::FromArgb(15,14,12)
$gold = [System.Drawing.Color]::FromArgb(201,185,138)
$goldDim = [System.Drawing.Color]::FromArgb(160,143,103)

function New-Bmp() {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear($bg)
  return @{ Bmp = $bmp; G = $g }
}

function Save-Bmp($obj, $name) {
  $path = Join-Path $OutDir $name
  $obj.Bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $obj.G.Dispose()
  $obj.Bmp.Dispose()
  Write-Output "Saved: $path"
}

# --- Candidate A: monogram "iS" serif ---
$a = New-Bmp
$brushGold = New-Object System.Drawing.SolidBrush($gold)
$fontA = New-Object System.Drawing.Font('Georgia', 540, [System.Drawing.FontStyle]::Regular)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
$a.G.DrawString('iS', $fontA, $brushGold, [System.Drawing.RectangleF]::new(0, -30, $size, $size), $fmt)
Save-Bmp $a 'insuite-icon-A.png'

# --- Candidate B: wordmark "INSUITE" letter-spaced ---
$b = New-Bmp
$fontB = New-Object System.Drawing.Font('Georgia', 110, [System.Drawing.FontStyle]::Regular)
$letters = 'I N S U I T E'
$b.G.DrawString($letters, $fontB, $brushGold, [System.Drawing.RectangleF]::new(0, 0, $size, $size), $fmt)
# subtle gold underline
$pen = New-Object System.Drawing.Pen($goldDim, 3)
$b.G.DrawLine($pen, 320, 600, 704, 600)
Save-Bmp $b 'insuite-icon-B.png'

# --- Candidate C: single "i" with gold underline ---
$c = New-Bmp
$fontC = New-Object System.Drawing.Font('Georgia', 720, [System.Drawing.FontStyle]::Italic)
$c.G.DrawString('i', $fontC, $brushGold, [System.Drawing.RectangleF]::new(0, -50, $size, $size), $fmt)
$penC = New-Object System.Drawing.Pen($gold, 6)
$c.G.DrawLine($penC, 360, 820, 664, 820)
Save-Bmp $c 'insuite-icon-C.png'
