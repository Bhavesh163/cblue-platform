cat << 'INNER_EOF' > /tmp/repl_kyc.txt
          // Backend AI Validation
          try {
            const fd = new globalThis.FormData();
            fd.append("file", file);
            const res = await fetch("/api/v1/fixers/kyc-digest", {
              method: "POST",
              body: fd,
            });
            if (res.ok) {
              const aiData = await res.json();
              // If it's ID Front (slot 0) or ID Back (slot 1), verify text was found
              if (
                slotIdx < 2 &&
                (!aiData.has_content || aiData.text_length < 20) &&
                !aiData.fallback // Skip validation if Python AI is down
              ) {
                newStatuses[slotIdx] = "rejected";
                setError(
                  locale === "th"
                    ? "AI ไม่พบข้อความในเอกสาร — กรุณาถ่ายให้ชัดเจน"
                    : locale === "zh"
                      ? "AI未检测到文件上的文字 — 请拍摄清晰照片"
                      : "AI did not detect text — please take a clearer photo",
                );
                setKycValidating(false);
                return;
              }
            } else {
              // Graceful degradation when the endpoint throws a 502/400
              console.warn("KYC digest failed, bypassing strict OCR check");
            }
          } catch (e) {
            // Service fully offline
            console.warn("KYC digest unreachable, bypassing strict OCR check", e);
          }
INNER_EOF

# Replace the block manually
sed -i -e '/\/\/ Backend AI Validation/,/return;/!b' -e '/return;/!d' -e '/return;/c\'"$(cat /tmp/repl_kyc.txt | sed 's/$/\\/')" apps/web/app/[locale]/fixers/register/page.tsx
# fix the extra backslash
sed -i 's/\\$//' apps/web/app/[locale]/fixers/register/page.tsx
sed -i '/                setKycValidating(false);/d' apps/web/app/[locale]/fixers/register/page.tsx

