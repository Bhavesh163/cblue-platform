sed -i 's/<th className="text-center py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ระดับดาว" : locale === "zh" ? "星级" : "Stars"}<\/th>//' apps/web/app/[locale]/fixers/page.tsx
sed -i 's/<td className="py-3 px-4 text-center">{r.stars}<\/td>//' apps/web/app/[locale]/fixers/page.tsx
