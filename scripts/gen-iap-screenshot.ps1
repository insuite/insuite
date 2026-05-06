param(
  [string]$OutPath = "$env:USERPROFILE\Desktop\insuite-iap-pass7d.png",
  [int]$Days = 7,
  [string]$Price = '$1.99',
  [string]$PerDay = '$0.28'
)

Add-Type -AssemblyName System.Drawing

$w = 1242
$h = 2208
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# ----- palette -----
$bg            = [System.Drawing.Color]::FromArgb(15,14,12)
$cardBg        = [System.Drawing.Color]::FromArgb(20,18,16)
$cardBgFeat    = [System.Drawing.Color]::FromArgb(58,48,32)
$borderSubtle  = [System.Drawing.Color]::FromArgb(42,37,32)
$gold          = [System.Drawing.Color]::FromArgb(201,185,138)
$goldDark      = [System.Drawing.Color]::FromArgb(10,9,8)
$textPrimary   = [System.Drawing.Color]::FromArgb(240,236,228)
$textSecondary = [System.Drawing.Color]::FromArgb(232,216,168)
$textMuted     = [System.Drawing.Color]::FromArgb(122,112,96)
$textFaint     = [System.Drawing.Color]::FromArgb(90,80,64)
$green         = [System.Drawing.Color]::FromArgb(109,184,122)

$brushBg       = New-Object System.Drawing.SolidBrush($bg)
$brushCard     = New-Object System.Drawing.SolidBrush($cardBg)
$brushCardFeat = New-Object System.Drawing.SolidBrush($cardBgFeat)
$brushGold     = New-Object System.Drawing.SolidBrush($gold)
$brushGoldDark = New-Object System.Drawing.SolidBrush($goldDark)
$brushText     = New-Object System.Drawing.SolidBrush($textPrimary)
$brushTextSec  = New-Object System.Drawing.SolidBrush($textSecondary)
$brushMuted    = New-Object System.Drawing.SolidBrush($textMuted)
$brushFaint    = New-Object System.Drawing.SolidBrush($textFaint)
$brushGreen    = New-Object System.Drawing.SolidBrush($green)
$penBorder     = New-Object System.Drawing.Pen($borderSubtle, 2)
$penGold       = New-Object System.Drawing.Pen($gold, 4)

# ----- fonts -----
$fam = 'Segoe UI'
$fontNav    = New-Object System.Drawing.Font($fam, 26, [System.Drawing.FontStyle]::Regular)
$fontLabel  = New-Object System.Drawing.Font($fam, 18, [System.Drawing.FontStyle]::Bold)
$fontH1     = New-Object System.Drawing.Font($fam, 48, [System.Drawing.FontStyle]::Regular)
$fontH2     = New-Object System.Drawing.Font($fam, 38, [System.Drawing.FontStyle]::Regular)
$fontPrice  = New-Object System.Drawing.Font($fam, 38, [System.Drawing.FontStyle]::Regular)
$fontBody   = New-Object System.Drawing.Font($fam, 22, [System.Drawing.FontStyle]::Regular)
$fontPerk   = New-Object System.Drawing.Font($fam, 24, [System.Drawing.FontStyle]::Regular)
$fontBtn    = New-Object System.Drawing.Font($fam, 24, [System.Drawing.FontStyle]::Bold)
$fontBadge  = New-Object System.Drawing.Font($fam, 16, [System.Drawing.FontStyle]::Bold)
$fontDisclaim = New-Object System.Drawing.Font($fam, 18, [System.Drawing.FontStyle]::Regular)

# ----- background -----
$g.Clear($bg)

# helper: rounded rect
function Draw-RoundedRect($graphics, $brush, $pen, $x, $y, $w, $h, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc(($x + $w - $d), $y, $d, $d, 270, 90)
  $path.AddArc(($x + $w - $d), ($y + $h - $d), $d, $d, 0, 90)
  $path.AddArc($x, ($y + $h - $d), $d, $d, 90, 90)
  $path.CloseFigure()
  if ($brush) { $graphics.FillPath($brush, $path) }
  if ($pen)   { $graphics.DrawPath($pen, $path) }
  $path.Dispose()
}

$padX = 60

# ----- nav bar -----
$navFmt = New-Object System.Drawing.StringFormat
$navFmt.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString('Plans & pricing', $fontNav, $brushText, [System.Drawing.RectangleF]::new(0, 80, $w, 60), $navFmt)

# ----- status card -----
$y = 180
$cardH = 260
Draw-RoundedRect $g $brushCard $penBorder $padX $y ($w - 2*$padX) $cardH 24
$g.DrawString('CURRENT', $fontLabel, $brushFaint, ($padX + 40), ($y + 36))
$g.DrawString('Free account', $fontH1, $brushText, ($padX + 40), ($y + 76))
$g.DrawString('Browse, join, and message matched guests.', $fontBody, $brushMuted, ($padX + 40), ($y + 168))
$g.DrawString('First post is on the house.', $fontBody, $brushMuted, ($padX + 40), ($y + 200))

# ----- perks section -----
$y = 480
$g.DrawString('WHAT YOU GET', $fontLabel, $brushFaint, ($padX + 8), $y)
$y += 50
$perksH = 320
Draw-RoundedRect $g $brushCard $penBorder $padX $y ($w - 2*$padX) $perksH 24
$perks = @('Unlimited activity posts','Post before check-in','Priority in Discover','Pause or resume anytime')
$py = $y + 32
foreach ($p in $perks) {
  # checkmark
  $g.DrawString([char]0x2713, $fontPerk, $brushGold, ($padX + 36), $py)
  $g.DrawString($p, $fontPerk, $brushTextSec, ($padX + 88), $py)
  $py += 64
}

# ----- choose pass section -----
$y = 880
$g.DrawString('CHOOSE YOUR PASS', $fontLabel, $brushFaint, ($padX + 8), $y)
$y += 50

# 7-day card (the one being reviewed) — make this featured
$cardX = $padX
$cardW = $w - 2 * $padX
$cardY = $y
$cardH2 = 280
Draw-RoundedRect $g $brushCardFeat $penGold $cardX $cardY $cardW $cardH2 24
# badge
$badgeText = 'CURRENTLY VIEWING'
$badgeW = 320
$badgeH = 44
$badgeX = $cardX + $cardW - $badgeW - 32
$badgeY = $cardY - 22
Draw-RoundedRect $g $brushGold $null $badgeX $badgeY $badgeW $badgeH 22
$badgeFmt = New-Object System.Drawing.StringFormat
$badgeFmt.Alignment = [System.Drawing.StringAlignment]::Center
$badgeFmt.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString($badgeText, $fontBadge, $brushGoldDark, [System.Drawing.RectangleF]::new($badgeX, $badgeY, $badgeW, $badgeH), $badgeFmt)
# duration + per-day
$g.DrawString("$Days days", $fontH2, $brushText, ($cardX + 40), ($cardY + 40))
$g.DrawString("$PerDay per day", $fontBody, $brushMuted, ($cardX + 40), ($cardY + 100))
# price (right side)
$priceFmt = New-Object System.Drawing.StringFormat
$priceFmt.Alignment = [System.Drawing.StringAlignment]::Far
$g.DrawString($Price, $fontPrice, $brushGold, [System.Drawing.RectangleF]::new(($cardX + 40), ($cardY + 50), ($cardW - 80), 60), $priceFmt)
# button
$btnY = $cardY + 180
$btnH = 76
Draw-RoundedRect $g $brushGold $null ($cardX + 40) $btnY ($cardW - 80) $btnH 22
$btnFmt = New-Object System.Drawing.StringFormat
$btnFmt.Alignment = [System.Drawing.StringAlignment]::Center
$btnFmt.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("Get $Days-day pass", $fontBtn, $brushGoldDark, [System.Drawing.RectangleF]::new(($cardX + 40), $btnY, ($cardW - 80), $btnH), $btnFmt)

# ----- ghost cards for 14d / 30d -----
$y = $cardY + $cardH2 + 40
$ghostH = 130
foreach ($g2 in @(@{D=14;P='$2.99'},@{D=30;P='$4.99'})) {
  Draw-RoundedRect $g $brushCard $penBorder $cardX $y $cardW $ghostH 24
  $g.DrawString("$($g2.D) days", $fontH2, $brushText, ($cardX + 40), ($y + 32))
  $g.DrawString($g2.P, $fontPrice, $brushGold, [System.Drawing.RectangleF]::new(($cardX + 40), ($y + 38), ($cardW - 80), 60), $priceFmt)
  $y += $ghostH + 28
}

# ----- disclaimer -----
$y += 24
$discFmt = New-Object System.Drawing.StringFormat
$discFmt.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString('One-time purchase via Apple . Automatically expires . No auto-renewal',
  $fontDisclaim, $brushFaint, [System.Drawing.RectangleF]::new(0, $y, $w, 30), $discFmt)

# ----- save -----
$bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Output "Saved: $OutPath ($w x $h)"
