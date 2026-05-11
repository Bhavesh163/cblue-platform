import re

with open("../../backend/src/modules/subscription/subscription.service.ts", "r", encoding="utf-8") as f:
    text = f.read()

replacement = """      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Mailjet error: ${errorText}`);
        this.logger.log(
          `[FALLBACK] Password reset link for ${email}: /en/subscription/reset-password?token=${resetToken}`
        );
      } else {"""

text = text.replace(
"""      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Mailjet error: ${errorText}`);
      } else {""", replacement)

# Add fallback log globally just in case.
replacement2 = """      this.logger.log(`Password reset email sent to ${email}`);
        this.logger.log(`[BACKUP-LINK] /en/subscription/reset-password?token=${resetToken}`);
      }"""

text = text.replace("""      this.logger.log(`Password reset email sent to ${email}`);
      }""", replacement2)

with open("../../backend/src/modules/subscription/subscription.service.ts", "w", encoding="utf-8") as f:
    f.write(text)
