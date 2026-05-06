import re

file_path = "apps/web/app/[locale]/fixers/register/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix 2: Populate address and price list properly
old_str = """    setForm((prev) => ({
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
        ? fixer.skills.map((skill: any) => skill.name)
        : [],
      province: fixer?.serviceProvince || "",
      district: fixer?.serviceDistrict || "",
      postalCode: fixer?.servicePostalCode || "",
      description: fixer?.description || "",
      pastExperience: fixer?.pastExperience || "",
      pastProjectType: fixer?.pastProjectType || "none",
      consent: true,
    }));"""

new_str = """    setForm((prev) => ({
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
        ? fixer.skills.map((skill: any) => skill.name)
        : [],
      province: fixer?.serviceProvince || "",
      district: fixer?.serviceDistrict || "",
      postalCode: fixer?.servicePostalCode || "",
      description: fixer?.description || "",
      pastExperience: fixer?.pastExperience || "",
      pastProjectType: fixer?.pastProjectType || "none",
      companyHouseNumber: fixer?.address?.houseNumber || user?.address?.houseNumber || "",
      companyBuilding: fixer?.address?.building || user?.address?.building || "",
      companyFloor: fixer?.address?.floor || user?.address?.floor || "",
      companyRoad: fixer?.address?.road || user?.address?.road || "",
      companySoi: fixer?.address?.soi || user?.address?.soi || "",
      companyProvince: fixer?.address?.province || user?.address?.province || "",
      companyDistrict: fixer?.address?.district || user?.address?.district || "",
      companySubdistrict: fixer?.address?.subdistrict || user?.address?.subdistrict || "",
      companyPostalCode: fixer?.address?.postalCode || user?.address?.postalCode || "",
      consent: true,
    }));"""

if old_str in content:
    content = content.replace(old_str, new_str)
    print("Patched populate form successfully!")
else:
    print("Failed to patch populate form")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
