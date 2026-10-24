/**
 * 站点头像：优先用 AVIF，老浏览器回退到 PNG。
 * 图片来自用户提供的 favicon.avif，白底黑线，因此在深浅色下都保留白底。
 */
export function SiteLogo({
  size = "md",
  className = "",
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  const dimension = size === "lg" ? "h-12 w-12 rounded-2xl" : "h-9 w-9 rounded-xl";

  return (
    <picture
      className={`block shrink-0 overflow-hidden bg-white shadow-sm ring-1 ring-black/10 dark:ring-white/15 ${dimension} ${className}`}
    >
      <source srcSet="/avatar.avif" type="image/avif" />
      <img
        src="/avatar.png"
        alt=""
        width={96}
        height={96}
        draggable={false}
        className="h-full w-full object-cover"
      />
    </picture>
  );
}
