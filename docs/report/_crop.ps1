Add-Type -AssemblyName System.Drawing

$srcDir = "D:\PROJECTS\BrewLite\docs\figures\as2"
$outDir = Join-Path $srcDir "view"
New-Item -ItemType Directory -Force $outDir | Out-Null

# name, vertical anchor: top|bottom, target height
$jobs = @(
  @{ f = "01-menu-mobile.png";                  a = "top";    h = 844 },
  @{ f = "03-gio-hang-mobile.png";              a = "bottom"; h = 844 },
  @{ f = "04-dang-nhap-mobile.png";             a = "bottom"; h = 844 },
  @{ f = "05-checkout-mobile.png";              a = "bottom"; h = 844 },
  @{ f = "06-thanh-toan-zalopay-mobile.png";    a = "bottom"; h = 844 },
  @{ f = "07-tao-giao-dich-zalopay.png";        a = "bottom"; h = 844 },
  @{ f = "08-lich-su-don-mobile.png";           a = "top";    h = 844 },
  @{ f = "09-xac-nhan-don-mobile.png";          a = "bottom"; h = 844 },
  @{ f = "02-chi-tiet-size-topping.png";        a = "top";    h = 844 },
  @{ f = "10-admin-dashboard-mobile.png";       a = "top";    h = 844 },
  @{ f = "11-admin-don-hang-mobile.png";        a = "top";    h = 844 },
  @{ f = "12-admin-kho-nguyen-lieu-mobile.png"; a = "top";    h = 844 },
  @{ f = "13-admin-cong-thuc-mobile.png";       a = "top";    h = 844 }
)

foreach ($j in $jobs) {
  $in = Join-Path $srcDir $j.f
  $img = [System.Drawing.Image]::FromFile($in)
  $w = $img.Width
  $h = [Math]::Min($j.h, $img.Height)
  $y = 0
  if ($j.a -eq "bottom") { $y = $img.Height - $h }

  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $dst = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $src = New-Object System.Drawing.Rectangle 0, $y, $w, $h
  $g.DrawImage($img, $dst, $src, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $out = Join-Path $outDir $j.f
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $img.Dispose()
  "{0,-40} {1}x{2} from y={3}" -f $j.f, $w, $h, $y
}
