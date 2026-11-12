# Face copii mici (max. 260 px lățime, PNG cu transparență) ale pozelor de mașini:
#   File/Cars/car_nobg/*.png|jpg  ->  File/Cars/car_web/<același nume>.png
# Pe card poza are 104x60, în panou 124x72; originalele (~1 MB) se descărcau întregi.
# Rulează după ce pui o poză nouă în car_nobg (până atunci aplicația folosește originalul):
#   powershell -ExecutionPolicy Bypass -File app/scripts/micsoreaza-poze.ps1
Add-Type -AssemblyName System.Drawing
$radacina = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$sursa = Join-Path $radacina 'File/Cars/car_nobg'
$dest = Join-Path $radacina 'File/Cars/car_web'
New-Item -ItemType Directory -Force $dest | Out-Null
$latime = 260
Get-ChildItem $sursa -File | Where-Object { $_.Extension -match '^\.(png|jpe?g)$' } | ForEach-Object {
  $iesire = Join-Path $dest ($_.BaseName + '.png')
  if ((Test-Path $iesire) -and (Get-Item $iesire).LastWriteTime -ge $_.LastWriteTime) { return }
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  try {
    $w = [Math]::Min($latime, $img.Width)
    $h = [int][Math]::Round($img.Height * $w / $img.Width)
    $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()
    $bmp.Save($iesire, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
  } finally { $img.Dispose() }
}
$total = (Get-ChildItem $dest -File | Measure-Object Length -Sum).Sum
"Gata: {0} poze, {1:N0} KB in car_web" -f (Get-ChildItem $dest -File).Count, ($total / 1KB)
