sed -i '34i \
  // ── AI Digest (no auth — called during registration before user has token) ──\n\
\n\
  @Post('\''kyc-digest'\'')\n\
  @Throttle({ default: { ttl: 30000, limit: 10 } })\n\
  @UseInterceptors(FileInterceptor('\''file'\''))\n\
  async kycDigest(@UploadedFile() file: Express.Multer.File) {\n\
    return this.fixerService.kycDigest(file);\n\
  }\n\
\n\
  @Post('\''portfolio-digest'\'')\n\
  @Throttle({ default: { ttl: 60000, limit: 5 } })\n\
  @UseInterceptors(FilesInterceptor('\''files'\'', 10))\n\
  async digestPortfolio(@UploadedFiles() files: Express.Multer.File[]) {\n\
    const ALLOWED_MIMES = [\n\
      '\''image/jpeg'\'',\n\
      '\''image/png'\'',\n\
      '\''image/webp'\'',\n\
      '\''application/pdf'\'',\n\
      '\''application/msword'\'',\n\
      '\''application/vnd.openxmlformats-officedocument.wordprocessingml.document'\'',\n\
      '\''application/vnd.ms-excel'\'',\n\
      '\''application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'\'',\n\
    ];\n\
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB\n\
    for (const file of files) {\n\
      if (!ALLOWED_MIMES.includes(file.mimetype)) {\n\
        throw new BadRequestException(\n\
          `Unsupported file type: ${file.originalname}`,\n\
        );\n\
      }\n\
      if (file.size > MAX_FILE_SIZE) {\n\
        throw new BadRequestException(\n\
          `File too large: ${file.originalname} (max 50MB)`,\n\
        );\n\
      }\n\
    }\n\
    return this.fixerService.digestPortfolio(files);\n\
  }\n' backend/src/modules/fixer/fixer.controller.ts
