cat << 'INNER_EOF' > /tmp/header.txt
    { href: `${prefix}/properties`, label: t("realEstate") },
    { href: `${prefix}/dashboard`, label: t("dashboard") },
    { href: `${prefix}/fixers`, label: t("forFixers") },
  ];
INNER_EOF

sed -i -e '/{ href: `${prefix}\/properties`, label: t("realEstate") },/,/  ];/c\'"$(cat /tmp/header.txt | sed 's/$/\\/')" apps/web/app/[locale]/components/Header.tsx
sed -i 's/\\$//' apps/web/app/[locale]/components/Header.tsx
