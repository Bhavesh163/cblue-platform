import re

file_path = "apps/web/app/[locale]/fixers/register/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix: correct company hydration, date format hydration, and selectedSkills.
old_str = """    const normalizedDate = normalizeDateToIso(fixer?.availableStartDate || fixer?.scheduledDate || "") || "";

    setForm((prev) => ({
      ...prev,
      name: user?.name || prev.name,
      email: user?.email || prev.email,
      phone: user?.phone || prev.phone,
      company: user?.company || prev.company,
      bio: fixer?.bio || "",
      yearsExperience:
        fixer?.yearsExperience !== null && fixer?.yearsExperience !== undefined
          ? String(fixer.yearsExperience)
          : "",
      travelRadius:
        fixer?.travelRadius !== null && fixer?.travelRadius !== undefined
          ? String(fixer.travelRadius)
          : prev.travelRadius,
      selectedSkills: Array.isArray(fixer?.skills)
        ? fixer.skills.map((skill: any) =>
            typeof skill === "string" ? skill : (skill?.name ?? ""),
          )
            .filter(Boolean)
        : [],
      province: fixer?.serviceProvince || "",
      district: fixer?.serviceDistrict || "",
      postalCode: fixer?.servicePostalCode || "",
      scheduledDate: normalizedDate,"""

new_str = """    const normalizedDate = normalizeDateToIso(fixer?.availableStartDate || fixer?.scheduledDate || "") || "";
    const displayDate = normalizedDate ? f"{normalizedDate[8:10]}/{normalizedDate[5:7]}/{normalizedDate[0:4]}" : "";

    setForm((prev) => ({
      ...prev,
      name: user?.name || prev.name,
      email: user?.email || prev.email,
      phone: user?.phone || prev.phone,
      company: fixer?.companyAddress?.name || fixer?.user?.company || user?.company || prev.company,
      bio: fixer?.bio || "",
      yearsExperience:
        fixer?.yearsExperience !== null && fixer?.yearsExperience !== undefined
          ? String(fixer.yearsExperience)
          : "",
      travelRadius:
        fixer?.travelRadius !== null && fixer?.travelRadius !== undefined
          ? String(fixer.travelRadius)
          : prev.travelRadius,
      selectedSkills: Array.isArray(fixer?.skills)
        ? fixer.skills.map((skill: any) =>
            typeof skill === "string" ? skill : (skill?.name ?? skill?.category ?? ""),
          )
            .filter(Boolean)
        : [],
      province: fixer?.serviceProvince || "",
      district: fixer?.serviceDistrict || "",
      postalCode: fixer?.servicePostalCode || "",
      scheduledDate: displayDate,"""

# The JS string formatting f"{}" is invalid syntax for JS, I need to use `${}` in the patch script!
