sed -i 's/if (!ALLOWED_MIMES.includes(file.mimetype))/if (file.mimetype \&\& !ALLOWED_MIMES.includes(file.mimetype))/' backend/src/modules/fixer/fixer.controller.ts
