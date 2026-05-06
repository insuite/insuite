param([string]$OutDir = '')
if (-not $OutDir) { $OutDir = [Environment]::GetFolderPath('Desktop') }

Add-Type -AssemblyName System.Drawing

$size = 1024
$bg   = [System.Drawing.Color]::FromArgb(15,14,12)
$gold = [System.Drawing.Color]::FromArgb(201,185,138)
$brushGold = New-Object System.Drawing.SolidBrush($gold)

function New-Bmp() {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
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

# Auto-fit a string to width
function Fit-FontSize($g, $text, $family, $style, $maxWidth, $startSize) {
  $sz = $startSize
  while ($sz -gt 30) {
    $f = New-Object System.Drawing.Font($family, $sz, $style)
    $w = $g.MeasureString($text, $f).Width
    if ($w -le $maxWidth) { return $f }
    $f.Dispose()
    $sz -= 5
  }
  return New-Object System.Drawing.Font($family, 30, $style)
}

$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

# --- B1: single line bold INSUITE, fills width ---
$b1 = New-Bmp
$f1 = Fit-FontSize $b1.G 'INSUITE' 'Georgia' ([System.Drawing.FontStyle]::Bold) 880 360
$b1.G.DrawString('INSUITE', $f1, $brushGold, [System.Drawing.RectangleF]::new(0, 0, $size, $size), $fmt)
Save-Bmp $b1 'insuite-icon-B1.png'

# --- B2: stacked IN / SUITE ---
$b2 = New-Bmp
$f2top = Fit-FontSize $b2.G 'IN' 'Georgia' ([System.Drawing.FontStyle]::Regular) 700 420
$f2bot = Fit-FontSize $b2.G 'SUITE' 'Georgia' ([System.Drawing.FontStyle]::Regular) 880 420
$b2.G.DrawString('IN', $f2top, $brushGold, [System.Drawing.RectangleF]::new(0, 60, $size, 460), $fmt)
$b2.G.DrawString('SUITE', $f2bot, $brushGold, [System.Drawing.RectangleF]::new(0, 480, $size, 460), $fmt)
# subtle gold separator line between
$pen = New-Object System.Drawing.Pen($gold, 3)
$b2.G.DrawLine($pen, 380, 540, 644, 540)
Save-Bmp $b2 'insuite-icon-B2.png'
