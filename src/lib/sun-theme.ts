/**
 * 按当前位置的天亮/天黑时间自动切换深浅色。
 *
 * 用的是民用暮光（太阳中心位于地平线下 6°），比日出/日落晚约 25 分钟变深、
 * 早约 25 分钟变浅，更贴近肉眼感受到的“天亮/天黑”。
 *
 * 位置默认取上海，可在根目录 .env 里用
 * NEXT_PUBLIC_SITE_LATITUDE / NEXT_PUBLIC_SITE_LONGITUDE 覆盖。
 *
 * 脚本必须内联在 <body> 最前面执行，才能在首屏绘制前定好主题，避免闪白/闪黑。
 */

function envNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const SITE_LOCATION = {
  latitude: Math.max(-90, Math.min(90, envNumber(process.env.NEXT_PUBLIC_SITE_LATITUDE, 31.2304))),
  longitude: Math.max(
    -180,
    Math.min(180, envNumber(process.env.NEXT_PUBLIC_SITE_LONGITUDE, 121.4737)),
  ),
};

export function buildSunThemeScript(): string {
  return `(function () {
  "use strict";
  var LAT = ${SITE_LOCATION.latitude};
  var LON = ${SITE_LOCATION.longitude};
  var RAD = Math.PI / 180;
  // 民用暮光：太阳中心在地平线下 6°
  var ZENITH = 96;
  var timer = 0;
  var transitionTimer = 0;
  var lastDark = null;
  var root = document.documentElement;

  // NOAA 太阳位置近似算法：返回当天该经纬度的天亮、天黑时刻（民用暮光）
  function sunTimes(date) {
    // 用经度换算出所在地的“太阳日期”，这样设备在别的时区也不会算错一天
    var solar = new Date(date.getTime() + LON * 4 * 60000);
    var year = solar.getUTCFullYear();
    var month = solar.getUTCMonth();
    var day = solar.getUTCDate();
    var dayOfYear = Math.floor((Date.UTC(year, month, day) - Date.UTC(year, 0, 0)) / 86400000);
    var gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + 0.5);
    var cosG = Math.cos(gamma);
    var sinG = Math.sin(gamma);
    var cos2G = Math.cos(2 * gamma);
    var sin2G = Math.sin(2 * gamma);
    var cos3G = Math.cos(3 * gamma);
    var eqtime = 229.18 * (0.000075 + 0.001868 * cosG - 0.032077 * sinG - 0.014615 * cos2G - 0.040849 * sin2G);
    var decl = 0.006918 - 0.399912 * cosG + 0.070257 * sinG - 0.006758 * cos2G + 0.000907 * sin2G - 0.002697 * cos3G + 0.00148 * Math.sin(3 * gamma);
    var latRad = LAT * RAD;
    var cosHa = Math.cos(ZENITH * RAD) / (Math.cos(latRad) * Math.cos(decl)) - Math.tan(latRad) * Math.tan(decl);

    if (cosHa > 1) return { polar: "night" };
    if (cosHa < -1) return { polar: "day" };

    var hourAngle = Math.acos(cosHa) / RAD;
    var dayStart = Date.UTC(year, month, day);
    return {
      sunrise: new Date(dayStart + (720 - 4 * (LON + hourAngle) - eqtime) * 60000),
      sunset: new Date(dayStart + (720 - 4 * (LON - hourAngle) - eqtime) * 60000)
    };
  }

  function schedule(now, times) {
    var next;
    if (times.polar) {
      next = now.getTime() + 3600000;
    } else if (now < times.sunrise) {
      next = times.sunrise.getTime();
    } else if (now < times.sunset) {
      next = times.sunset.getTime();
    } else {
      var nextTimes = sunTimes(new Date(now.getTime() + 86400000));
      next = nextTimes.polar ? now.getTime() + 3600000 : nextTimes.sunrise.getTime();
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, Math.max(1000, next - now.getTime() + 500));
  }

  function apply() {
    var now = new Date();
    var times = sunTimes(now);
    var dark = times.polar ? times.polar === "night" : now < times.sunrise || now >= times.sunset;

    if (lastDark !== null && lastDark !== dark) {
      root.classList.add("theme-changing");
      window.clearTimeout(transitionTimer);
      transitionTimer = window.setTimeout(function () {
        root.classList.remove("theme-changing");
      }, 500);
    }
    lastDark = dark;

    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    schedule(now, times);
  }

  apply();

  // 休眠唤醒 / 切换标签页回来时重新校准
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) apply();
  });
  window.addEventListener("focus", apply);

  window.__naviSunTheme = { apply: apply, sunTimes: sunTimes };
})();`;
}
