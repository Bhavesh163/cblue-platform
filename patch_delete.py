import re

service_path = "backend/src/modules/user/user.service.ts"
controller_path = "backend/src/modules/user/user.controller.ts"

with open(service_path, "r", encoding="utf-8") as f:
    s_content = f.read()

s_new = """
  async deleteAccount(userId: string) {
    const ts = Date.now();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Deleted User',
        email: `deleted_${userId}_${ts}@cblue.co.th`,
        phone: null,
        company: null,
        isActive: false,
      },
    });
    // optionally deactivate fixer if exists
    const fixer = await this.prisma.fixer.findUnique({ where: { userId } });
    if (fixer) {
      await this.prisma.fixer.update({
        where: { userId },
        data: {
          bio: null,
          description: null,
          status: 'REJECTED'
        }
      });
    }
    return { success: true, message: 'Account deleted via PDPA' };
  }
}"""
s_content = re.sub(r'}\s*$', s_new, s_content)
with open(service_path, "w", encoding="utf-8") as f:
    f.write(s_content)


with open(controller_path, "r", encoding="utf-8") as f:
    c_content = f.read()

c_new = """
  @Delete('me')
  deleteAccount(@CurrentUser('id') userId: string) {
    return this.userService.deleteAccount(userId);
  }
}"""
c_content = re.sub(r'}\s*$', c_new, c_content)
with open(controller_path, "w", encoding="utf-8") as f:
    f.write(c_content)

print("Backend patched for PDPA deletion.")
