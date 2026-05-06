param([string]$OutDir = '')
if (-not $OutDir) { $OutDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\images' }

Add-Type -AssemblyName System.Drawing

$gold = [System.Drawing.Color]::FromArgb(201,185,138)
$bg   = [System.Drawing.Color]::FromArgb(15,14,12)
$brushGold = New-Object System.Drawing.SolidBrush($gold)

$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

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

# ---------- 1. App icon: 1024x1024, INSUITE wordmark, solid bg ----------
$iconSize = 1024
$iconBmp = New-Object System.Drawing.Bitmap($iconSize, $iconSize)
$ig = [System.Drawing.Graphics]::FromImage($iconBmp)
$ig.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$ig.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$ig.Clear($bg)
$ifont = Fit-FontSize $ig 'INSUITE' 'Georgia' ([System.Drawing.FontStyle]::Bold) 880 360
$ig.DrawString('INSUITE', $ifont, $brushGold, [System.Drawing.RectangleF]::new(0, 0, $iconSize, $iconSize), $fmt)
$iconPath = Join-Path $OutDir 'icon.png'
$iconBmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$ig.Dispose(); $iconBmp.Dispose()
Write-Output "Saved: $iconPath ($iconSize x $iconSize)"

# ---------- 2. Splash icon: 1200x300, transparent bg, just wordmark ----------
$sw = 1200; $sh = 300
$splashBmp = New-Object System.Drawing.Bitmap($sw, $sh)
$sg = [System.Drawing.Graphics]::FromImage($splashBmp)
$sg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$sg.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$sg.Clear([System.Drawing.Color]::Transparent)
$sfont = Fit-FontSize $sg 'INSUITE' 'Georgia' ([System.Drawing.FontStyle]::Bold) 1100 240
$sg.DrawString('INSUITE', $sfont, $brushGold, [System.Drawing.RectangleF]::new(0, 0, $sw, $sh), $fmt)
$splashPath = Join-Path $OutDir 'splash-icon.png'
$splashBmp.Save($splashPath, [System.Drawing.Imaging.ImageFormat]::Png)
$sg.Dispose(); $splashBmp.Dispose()
Write-Output "Saved: $splashPath ($sw x $sh)"

# ---------- 3. Favicon: 96x96, transparent bg, condensed ----------
$fw = 96
$favBmp = New-Object System.Drawing.Bitmap($fw, $fw)
$fg = [System.Drawing.Graphics]::FromImage($favBmp)
$fg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$fg.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$fg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
# scale icon down for favicon
$src = [System.Drawing.Image]::FromFile($iconPath)
$fg.DrawImage($src, 0, 0, $fw, $fw)
$src.Dispose()
$favPath = Join-Path $OutDir 'favicon.png'
$favBmp.Save($favPath, [System.Drawing.Imaging.ImageFormat]::Png)
$fg.Dispose(); $favBmp.Dispose()
Write-Output "Saved: $favPath ($fw x $fw)"
