cat << 'INNER_EOF' > /tmp/repl.txt
  const digestPortfolioFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setDigesting(true);
    try {
      const fd = new globalThis.FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch("/api/v1/fixers/portfolio-digest", {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setDigestResult(data);
      } else {
        // AI OCR fallback on error from backend
        setDigestResult({
          results: files.map(f => ({
            file_id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            filename: f.name,
            raw_text: "",
            text_length: 0,
            has_content: false,
            verification_hints: ["Vision service unavailable — analysis deferred"],
            extraction_method: "none_vision_service_unavailable"
          })),
          total_files: files.length,
          total_text_length: 0,
          content_score: 0,
          fallback: true
        });
      }
    } catch {
      // Vision service unavailable — non-blocking fallback
      setDigestResult({
        results: files.map(f => ({
          file_id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          filename: f.name,
          raw_text: "",
          text_length: 0,
          has_content: false,
          verification_hints: ["Vision service unavailable — analysis deferred"],
          extraction_method: "none_vision_service_unavailable"
        })),
        total_files: files.length,
        total_text_length: 0,
        content_score: 0,
        fallback: true
      });
    } finally {
      setDigesting(false);
    }
  }, []);
INNER_EOF

# Replace the function block manually
sed -i -e '/const digestPortfolioFiles = useCallback(async (files: File\[\]) => {/,/  }, \[\]);/c\'"$(cat /tmp/repl.txt | sed 's/$/\\/')" apps/web/app/[locale]/fixers/register/page.tsx
# fix the extra backslash
sed -i 's/\\$//' apps/web/app/[locale]/fixers/register/page.tsx

